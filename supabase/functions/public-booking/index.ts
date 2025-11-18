import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      barbeariaId,
      barbeiroId,
      servicoId,
      date, // yyyy-mm-dd
      time, // HH:mm
      nome,
      email,
      telefone,
      observacoes,
    } = body || {};

    if (!barbeariaId || !barbeiroId || !servicoId || !date || !time || !nome || !email) {
      return new Response(JSON.stringify({ error: "Parâmetros obrigatórios ausentes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // 1) Validar relacionamento barbeiro/serviço/barbearia
    const { data: barbeiro, error: barbeiroErr } = await supabaseAdmin
      .from("barbeiros")
      .select("id, barbearia_id, ativo")
      .eq("id", barbeiroId)
      .eq("barbearia_id", barbeariaId)
      .maybeSingle();

    if (barbeiroErr || !barbeiro || barbeiro.ativo === false) {
      return new Response(JSON.stringify({ error: "Barbeiro inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: servico, error: servicoErr } = await supabaseAdmin
      .from("servicos")
      .select("id, barbearia_id, duracao")
      .eq("id", servicoId)
      .eq("barbearia_id", barbeariaId)
      .maybeSingle();

    if (servicoErr || !servico) {
      return new Response(JSON.stringify({ error: "Serviço inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Encontrar ou criar cliente por telefone ou email
    let userId: string | null = null;

    // Buscar por telefone primeiro (mais específico para clientes)
    let existingProfile = null;
    if (telefone) {
      const { data: profileByPhone } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("telefone", telefone)
        .eq("tipo", "cliente")
        .maybeSingle();
      
      if (profileByPhone) {
        existingProfile = profileByPhone;
      }
    }

    // Se não encontrou por telefone, buscar por email
    if (!existingProfile) {
      const { data: profileByEmail, error: findProfileErr } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .eq("tipo", "cliente")
        .maybeSingle();

      if (findProfileErr) {
        return new Response(JSON.stringify({ error: "Falha ao buscar perfil" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      existingProfile = profileByEmail;
    }

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const tempPassword = crypto.randomUUID();
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { nome, tipo: "cliente", telefone },
      });
      if (created.error || !created.data?.user) {
        return new Response(JSON.stringify({ error: created.error?.message || "Falha ao criar usuário" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = created.data.user.id;
    }

    // 3) Upsert no perfil (garantir dados básicos)
    const { error: upsertErr } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, nome, email, telefone, tipo: "cliente" }, { onConflict: "id" });

    if (upsertErr) {
      return new Response(JSON.stringify({ error: "Falha ao salvar perfil" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Verificar conflito simples (mesmo barbeiro, mesma data/hora)
    const { data: conflito } = await supabaseAdmin
      .from("agendamentos")
      .select("id")
      .eq("barbeiro_id", barbeiroId)
      .eq("data", date)
      .eq("hora", time)
      .in("status", ["pendente", "confirmado"])
      .maybeSingle();

    if (conflito) {
      return new Response(JSON.stringify({ error: "Horário já ocupado" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Criar agendamento
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from("agendamentos")
      .insert({
        barbearia_id: barbeariaId,
        barbeiro_id: barbeiroId,
        servico_id: servicoId,
        cliente_id: userId,
        data: date,
        hora: time,
        observacoes: observacoes || null,
        status: "pendente",
      })
      .select("id")
      .maybeSingle();

    if (insertErr || !inserted) {
      return new Response(JSON.stringify({ error: "Falha ao criar agendamento" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, agendamentoId: inserted.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("public-booking error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

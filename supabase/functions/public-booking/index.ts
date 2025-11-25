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
    console.log("📥 Request body:", JSON.stringify(body, null, 2));
    const { action } = body || {};

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Cadastro público de cliente
    if (action === "register-client") {
      const { nome, telefone, email } = body || {};
      if (!nome || !telefone || !email) {
        return new Response(JSON.stringify({ error: "Nome, telefone e email são obrigatórios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Buscar cliente existente por telefone
      let existingProfile = null;
      if (telefone) {
        const { data: profileByPhone } = await supabaseAdmin
          .from("profiles")
          .select("id, nome, telefone, email, tipo")
          .eq("telefone", telefone)
          .eq("tipo", "cliente")
          .maybeSingle();
        if (profileByPhone) existingProfile = profileByPhone;
      }
      // Buscar por email se não achou por telefone
      if (!existingProfile) {
        const { data: profileByEmail } = await supabaseAdmin
          .from("profiles")
          .select("id, nome, telefone, email, tipo")
          .eq("email", email)
          .eq("tipo", "cliente")
          .maybeSingle();
        if (profileByEmail) existingProfile = profileByEmail;
      }
      if (existingProfile) {
        return new Response(JSON.stringify({ data: existingProfile }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Cria usuário auth e perfil
      const tempPassword = crypto.randomUUID();
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { nome, tipo: "cliente", telefone },
      });
      if (created.error) {
        if (created.error.message?.includes("email address has already been registered")) {
          // Buscar usuário existente
          const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
          if (getUserError) {
            return new Response(JSON.stringify({ error: "Falha ao buscar usuário" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          const foundUser = existingUser.users.find(u => u.email === email);
          if (foundUser) {
            // Buscar perfil
            const { data: profile } = await supabaseAdmin
              .from("profiles")
              .select("id, nome, telefone, email, tipo")
              .eq("id", foundUser.id)
              .maybeSingle();
            if (profile) {
              return new Response(JSON.stringify({ data: profile }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }
          }
          return new Response(JSON.stringify({ error: "Usuário já existe, mas perfil não encontrado" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          return new Response(JSON.stringify({ error: created.error.message || "Falha ao criar usuário" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (created.data?.user) {
        // Buscar perfil criado
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, nome, telefone, email, tipo")
          .eq("id", created.data.user.id)
          .maybeSingle();
        if (profile) {
          return new Response(JSON.stringify({ data: profile }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          return new Response(JSON.stringify({ error: "Perfil criado, mas não encontrado" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        return new Response(JSON.stringify({ error: "Falha ao criar usuário" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Extract parameters from body for booking flow
    const { barbeariaId, barbeiroId, servicoId, date, time, nome, email, telefone, observacoes } = body;

    // 1) Validar relacionamento barbeiro/serviço/barbearia
    console.log("🔍 Fetching barbeiro...", { barbeiroId, barbeariaId });
    const { data: barbeiro, error: barbeiroErr } = await supabaseAdmin
      .from("barbeiros")
      .select("id, barbearia_id, ativo")
      .eq("id", barbeiroId)
      .eq("barbearia_id", barbeariaId)
      .maybeSingle();

    console.log("👤 Barbeiro result:", { barbeiro, error: barbeiroErr });
    // Fetch business type to adapt terminology for messages
    const { data: barbeariaRec } = await supabaseAdmin
      .from('barbearias')
      .select('tipo_comercio')
      .eq('id', barbeariaId)
      .maybeSingle();

    const businessType = barbeariaRec?.tipo_comercio || 'barbearia';
    const terminologyMap: Record<string, { professional: string; professionals: string; service: string; services: string; appointment: string; appointments: string }> = {
      barbearia: { professional: 'Barbeiro', professionals: 'Barbeiros', service: 'Serviço', services: 'Serviços', appointment: 'Agendamento', appointments: 'Agendamentos' },
      salao: { professional: 'Profissional', professionals: 'Profissionais', service: 'Serviço', services: 'Serviços', appointment: 'Agendamento', appointments: 'Agendamentos' },
      tatuagem: { professional: 'Tatuador', professionals: 'Tatuadores', service: 'Serviço', services: 'Serviços', appointment: 'Sessão', appointments: 'Sessões' },
      spa: { professional: 'Terapeuta', professionals: 'Terapeutas', service: 'Tratamento', services: 'Tratamentos', appointment: 'Sessão', appointments: 'Sessões' },
      estetica: { professional: 'Esteticista', professionals: 'Esteticistas', service: 'Procedimento', services: 'Procedimentos', appointment: 'Consulta', appointments: 'Consultas' },
      consultorio: { professional: 'Profissional', professionals: 'Profissionais', service: 'Consulta', services: 'Consultas', appointment: 'Atendimento', appointments: 'Atendimentos' },
      personal: { professional: 'Personal', professionals: 'Personals', service: 'Treino', services: 'Treinos', appointment: 'Sessão', appointments: 'Sessões' },
      oficina: { professional: 'Especialista', professionals: 'Especialistas', service: 'Serviço', services: 'Serviços', appointment: 'Atendimento', appointments: 'Atendimentos' },
      outro: { professional: 'Profissional', professionals: 'Profissionais', service: 'Serviço', services: 'Serviços', appointment: 'Agendamento', appointments: 'Agendamentos' }
    };

    const terms = terminologyMap[businessType] || terminologyMap.barbearia;

    if (barbeiroErr || !barbeiro || barbeiro.ativo === false) {
      console.error("❌ Invalid professional");
      return new Response(JSON.stringify({ error: `${terms.professional} inválido` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("🔍 Fetching servico...", { servicoId, barbeariaId });
    const { data: servico, error: servicoErr } = await supabaseAdmin
      .from("servicos")
      .select("id, barbearia_id, duracao")
      .eq("id", servicoId)
      .eq("barbearia_id", barbeariaId)
      .maybeSingle();

    console.log("💈 Servico result:", { servico, error: servicoErr });

    if (servicoErr || !servico) {
      console.error("❌ Invalid servico");
      return new Response(JSON.stringify({ error: `${terms.service} inválido` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Encontrar ou criar cliente por telefone ou email
    console.log("🔍 Looking for existing client...", { email, telefone });
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
      
      console.log("📞 Profile by phone:", profileByPhone);
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
      console.log("✅ Found existing profile:", existingProfile.id);
      userId = existingProfile.id;
    } else {
      console.log("➕ Creating new user...");
      const tempPassword = crypto.randomUUID();
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { nome, tipo: "cliente", telefone },
      });
      console.log("👤 User creation result:", { 
        success: !!created.data?.user, 
        error: created.error 
      });
      
      if (created.error) {
        // Se o erro for email_exists, buscar o usuário existente
        if (created.error.message?.includes("email address has already been registered")) {
          console.log("📧 Email já existe, buscando usuário existente...");
          const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
          
          if (getUserError) {
            console.error("❌ Failed to list users:", getUserError);
            return new Response(JSON.stringify({ error: "Falha ao buscar usuário" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          const foundUser = existingUser.users.find(u => u.email === email);
          if (foundUser) {
            console.log("✅ Found existing user:", foundUser.id);
            userId = foundUser.id;
          } else {
            console.error("❌ User not found after email_exists error");
            return new Response(JSON.stringify({ error: "Falha ao localizar usuário" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          console.error("❌ Failed to create user:", created.error);
          return new Response(JSON.stringify({ error: created.error.message || "Falha ao criar usuário" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (created.data?.user) {
        userId = created.data.user.id;
        console.log("✅ User created:", userId);
      } else {
        console.error("❌ No user data returned");
        return new Response(JSON.stringify({ error: "Falha ao criar usuário" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
      return new Response(JSON.stringify({ error: `${terms.appointment} já ocupado` }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5) Criar agendamento
    console.log("📝 Creating agendamento...", {
      barbearia_id: barbeariaId,
      barbeiro_id: barbeiroId,
      servico_id: servicoId,
      cliente_id: userId,
      data: date,
      hora: time
    });

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

    console.log("📅 Agendamento result:", { inserted, error: insertErr });

    if (insertErr || !inserted) {
      console.error("❌ Failed to create appointment:", insertErr);
      return new Response(JSON.stringify({ 
        error: `Falha ao criar ${terms.appointment.toLowerCase()}`,
        details: insertErr?.message 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Agendamento created successfully:", inserted.id);
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

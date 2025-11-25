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
    const { clienteIds } = await req.json();
    
    if (!clienteIds || !Array.isArray(clienteIds)) {
      return new Response(
        JSON.stringify({ error: "clienteIds é obrigatório e deve ser um array" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log(`📊 Sincronizando ${clienteIds.length} profiles...`);

    // Buscar dados dos usuários do auth
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Erro ao buscar usuários:", usersError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar usuários do auth" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar profiles
    const profilesToCreate = clienteIds.map((id, index) => {
      const user = users?.find(u => u.id === id);
      return {
        id,
        nome: user?.user_metadata?.nome || user?.email?.split('@')[0] || `Cliente ${index + 1}`,
        email: user?.email || `cliente-${id.slice(0, 8)}@temporario.com`,
        telefone: user?.user_metadata?.telefone || user?.phone || "",
        tipo: "cliente" as const,
      };
    });

    const { data, error: insertError } = await supabaseAdmin
      .from("profiles")
      .insert(profilesToCreate)
      .select();

    if (insertError) {
      console.error("Erro ao criar profiles:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ ${data?.length || 0} profiles criados`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        created: data?.length || 0,
        profiles: data 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro geral:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

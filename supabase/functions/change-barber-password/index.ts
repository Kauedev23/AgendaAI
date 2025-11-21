import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { barbeiro_user_id, new_password } = await req.json();

    console.log('Recebendo solicitação para alterar senha do barbeiro:', barbeiro_user_id);

    if (!barbeiro_user_id || !new_password) {
      return new Response(
        JSON.stringify({ error: 'ID do barbeiro e nova senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new_password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário atual está autenticado
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuário autenticado:', user.id);

    // Buscar o barbeiro e verificar se o usuário atual é admin da mesma barbearia
    const { data: barbeiro, error: barbeiroError } = await supabaseClient
      .from('barbeiros')
      .select('barbearia_id')
      .eq('user_id', barbeiro_user_id)
      .single();

    if (barbeiroError || !barbeiro) {
      console.error('Erro ao buscar barbeiro:', barbeiroError);
      return new Response(
        JSON.stringify({ error: `${terms.professional} não encontrado` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário atual é admin da barbearia do barbeiro
    const { data: barbearia, error: barbeariaError } = await supabaseClient
      .from('barbearias')
        .select('admin_id, tipo_comercio')
      .eq('id', barbeiro.barbearia_id)
      .single();

    if (barbeariaError || !barbearia) {
      console.error('Erro ao buscar barbearia:', barbeariaError);
      return new Response(
        JSON.stringify({ error: `${terms.business} não encontrada` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

      const termsMap: Record<string, { business: string; professional: string; professionals: string }> = {
        barbearia: { business: 'Barbearia', professional: 'Barbeiro', professionals: 'Barbeiros' },
        salao: { business: 'Salão', professional: 'Profissional', professionals: 'Profissionais' },
        tatuagem: { business: 'Estúdio', professional: 'Tatuador', professionals: 'Tatuadores' },
        spa: { business: 'Spa', professional: 'Terapeuta', professionals: 'Terapeutas' },
        estetica: { business: 'Clínica', professional: 'Esteticista', professionals: 'Esteticistas' },
        consultorio: { business: 'Consultório', professional: 'Profissional', professionals: 'Profissionais' },
        personal: { business: 'Academia', professional: 'Personal', professionals: 'Personals' },
        oficina: { business: 'Oficina', professional: 'Especialista', professionals: 'Especialistas' },
        outro: { business: 'Negócio', professional: 'Profissional', professionals: 'Profissionais' }
      };

      const businessType = barbearia?.tipo_comercio || 'barbearia';
      const terms = termsMap[businessType] || termsMap.barbearia;
    if (barbearia.admin_id !== user.id) {
      console.error('Usuário não é admin da barbearia');
      return new Response(
        JSON.stringify({ error: `Apenas o administrador da ${terms.business.toLowerCase()} pode alterar senhas do ${terms.professional.toLowerCase()}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuário é admin, alterando senha...');

    // Alterar senha usando o cliente admin
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      barbeiro_user_id,
      { password: new_password }
    );

    if (updateError) {
      console.error('Erro ao alterar senha:', updateError);
      return new Response(
        JSON.stringify({ error: `Erro ao alterar senha: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Senha alterada com sucesso');

    return new Response(
      JSON.stringify({ 
        message: 'Senha alterada com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

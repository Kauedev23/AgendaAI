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
    
    // Cliente admin para criar usuários
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Cliente normal para verificar permissões
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { email, nome, telefone, barbearia_id, bio, especialidades } = await req.json();

    console.log('Recebendo solicitação para criar barbeiro:', { email, nome, barbearia_id });

    // Validações básicas
    if (!email || !nome || !barbearia_id) {
      console.error('Campos obrigatórios faltando');
      return new Response(
        JSON.stringify({ error: 'Email, nome e barbearia_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário atual é admin da barbearia
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      console.error('Usuário não autenticado');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuário autenticado:', user.id);

    // Verificar se é admin da barbearia
    const { data: barbearia, error: barbeariaError } = await supabaseClient
      .from('barbearias')
      .select('admin_id')
      .eq('id', barbearia_id)
      .single();

    if (barbeariaError || !barbearia) {
      console.error('Erro ao buscar barbearia:', barbeariaError);
      return new Response(
        JSON.stringify({ error: 'Barbearia não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (barbearia.admin_id !== user.id) {
      console.error('Usuário não é admin da barbearia');
      return new Response(
        JSON.stringify({ error: 'Apenas o administrador da barbearia pode adicionar barbeiros' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuário é admin da barbearia, criando usuário...');

    // Criar usuário no Supabase Auth com senha temporária
    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!`;
    
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        nome,
        tipo: 'barbeiro'
      }
    });

    if (createUserError) {
      console.error('Erro ao criar usuário:', createUserError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${createUserError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuário criado no Auth:', newUser.user.id);

    // Criar perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        nome,
        email,
        telefone,
        tipo: 'barbeiro',
        barbearia_id
      });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      // Tentar remover o usuário se falhar ao criar perfil
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Erro ao criar perfil: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Perfil criado');

    // Criar role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'barbeiro'
      });

    if (roleError) {
      console.error('Erro ao criar role:', roleError);
      // Continuar mesmo se falhar ao criar role, pois já temos o tipo no perfil
    }

    console.log('Role criado');

    // Criar registro de barbeiro
    const { error: barbeiroError } = await supabaseAdmin
      .from('barbeiros')
      .insert({
        user_id: newUser.user.id,
        barbearia_id,
        bio,
        especialidades
      });

    if (barbeiroError) {
      console.error('Erro ao criar barbeiro:', barbeiroError);
      // Tentar remover o usuário se falhar
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ error: `Erro ao criar barbeiro: ${barbeiroError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Barbeiro criado com sucesso');

    return new Response(
      JSON.stringify({ 
        user_id: newUser.user.id,
        email,
        temp_password: tempPassword,
        message: 'Barbeiro criado com sucesso'
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

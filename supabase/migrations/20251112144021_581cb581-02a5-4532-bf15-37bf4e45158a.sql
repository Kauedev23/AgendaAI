-- Criar enum para roles separado (segurança)
CREATE TYPE public.app_role AS ENUM ('admin', 'barbeiro', 'cliente');

-- Criar tabela de roles (CRÍTICO para segurança - evita privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para checar roles com SECURITY DEFINER (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policies para user_roles
CREATE POLICY "Usuários podem ver suas próprias roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Adicionar campos faltantes em barbearias
ALTER TABLE public.barbearias ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE public.barbearias ADD COLUMN IF NOT EXISTS instagram VARCHAR;
ALTER TABLE public.barbearias ADD COLUMN IF NOT EXISTS facebook VARCHAR;

-- Criar tabela de transações financeiras
CREATE TABLE public.transacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbearia_id UUID REFERENCES public.barbearias(id) ON DELETE CASCADE NOT NULL,
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  valor NUMERIC NOT NULL,
  tipo VARCHAR NOT NULL CHECK (tipo IN ('receita', 'despesa')),
  descricao TEXT,
  data TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

-- Policy para transações
CREATE POLICY "Admin vê transações da sua barbearia"
ON public.transacoes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM barbearias
    WHERE barbearias.id = transacoes.barbearia_id
    AND barbearias.admin_id = auth.uid()
  )
);

CREATE POLICY "Admin pode criar transações"
ON public.transacoes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM barbearias
    WHERE barbearias.id = transacoes.barbearia_id
    AND barbearias.admin_id = auth.uid()
  )
);

-- Trigger para criar transação automaticamente quando agendamento for concluído
CREATE OR REPLACE FUNCTION public.criar_transacao_agendamento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'concluido' AND OLD.status != 'concluido' THEN
    INSERT INTO public.transacoes (barbearia_id, agendamento_id, valor, tipo, descricao)
    SELECT 
      NEW.barbearia_id,
      NEW.id,
      s.preco,
      'receita',
      'Agendamento concluído - ' || s.nome
    FROM servicos s
    WHERE s.id = NEW.servico_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_criar_transacao_agendamento
AFTER UPDATE ON public.agendamentos
FOR EACH ROW
EXECUTE FUNCTION public.criar_transacao_agendamento();

-- Atualizar trigger handle_new_user para criar role automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_tipo app_role;
BEGIN
  -- Determinar tipo de usuário
  user_tipo := COALESCE((NEW.raw_user_meta_data->>'tipo')::app_role, 'cliente');
  
  -- Inserir perfil
  INSERT INTO public.profiles (id, nome, email, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'tipo')::user_type, 'cliente')
  );
  
  -- Inserir role na tabela separada
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_tipo);
  
  RETURN NEW;
END;
$$;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON public.agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_barbeiro ON public.agendamentos(barbeiro_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_barbearia ON public.agendamentos(barbearia_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_barbearia ON public.transacoes(barbearia_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON public.transacoes(data);
-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum para tipos de usuário
CREATE TYPE user_type AS ENUM ('admin', 'barbeiro', 'cliente');

-- Enum para status de agendamento
CREATE TYPE appointment_status AS ENUM ('pendente', 'confirmado', 'cancelado', 'concluido');

-- Tabela de barbearias (multi-tenant)
CREATE TABLE barbearias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  logo_url TEXT,
  telefone VARCHAR(20),
  endereco TEXT,
  cor_primaria VARCHAR(7) DEFAULT '#1a1f3a',
  cor_secundaria VARCHAR(7) DEFAULT '#dc2626',
  horario_abertura TIME DEFAULT '09:00',
  horario_fechamento TIME DEFAULT '19:00',
  dias_funcionamento TEXT[] DEFAULT ARRAY['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de perfis de usuários
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  tipo user_type NOT NULL DEFAULT 'cliente',
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de serviços
CREATE TABLE servicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  preco DECIMAL(10, 2) NOT NULL,
  duracao INTEGER NOT NULL, -- em minutos
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de barbeiros
CREATE TABLE barbeiros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE NOT NULL,
  especialidades TEXT[],
  bio TEXT,
  foto_url TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, barbearia_id)
);

-- Tabela de agendamentos
CREATE TABLE agendamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  barbeiro_id UUID REFERENCES barbeiros(id) ON DELETE CASCADE NOT NULL,
  servico_id UUID REFERENCES servicos(id) ON DELETE CASCADE NOT NULL,
  barbearia_id UUID REFERENCES barbearias(id) ON DELETE CASCADE NOT NULL,
  data DATE NOT NULL,
  hora TIME NOT NULL,
  status appointment_status DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE barbearias ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para barbearias
CREATE POLICY "Barbearias são visíveis publicamente" ON barbearias
  FOR SELECT USING (true);

CREATE POLICY "Admin pode inserir sua própria barbearia" ON barbearias
  FOR INSERT WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admin pode atualizar sua barbearia" ON barbearias
  FOR UPDATE USING (auth.uid() = admin_id);

-- Políticas RLS para profiles
CREATE POLICY "Perfis são visíveis para usuários autenticados" ON profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem inserir seu próprio perfil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Políticas RLS para serviços
CREATE POLICY "Serviços são visíveis publicamente" ON servicos
  FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar serviços da sua barbearia" ON servicos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM barbearias 
      WHERE barbearias.id = servicos.barbearia_id 
      AND barbearias.admin_id = auth.uid()
    )
  );

-- Políticas RLS para barbeiros
CREATE POLICY "Barbeiros são visíveis publicamente" ON barbeiros
  FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar barbeiros da sua barbearia" ON barbeiros
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM barbearias 
      WHERE barbearias.id = barbeiros.barbearia_id 
      AND barbearias.admin_id = auth.uid()
    )
  );

-- Políticas RLS para agendamentos
CREATE POLICY "Clientes veem seus próprios agendamentos" ON agendamentos
  FOR SELECT USING (auth.uid() = cliente_id);

CREATE POLICY "Barbeiros veem agendamentos onde são o barbeiro" ON agendamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbeiros 
      WHERE barbeiros.id = agendamentos.barbeiro_id 
      AND barbeiros.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin vê todos agendamentos da sua barbearia" ON agendamentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM barbearias 
      WHERE barbearias.id = agendamentos.barbearia_id 
      AND barbearias.admin_id = auth.uid()
    )
  );

CREATE POLICY "Clientes podem criar agendamentos" ON agendamentos
  FOR INSERT WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "Admin pode atualizar agendamentos da sua barbearia" ON agendamentos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM barbearias 
      WHERE barbearias.id = agendamentos.barbearia_id 
      AND barbearias.admin_id = auth.uid()
    )
  );

-- Função para criar perfil automaticamente após signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'tipo')::user_type, 'cliente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar perfil automaticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_barbearias_updated_at BEFORE UPDATE ON barbearias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agendamentos_updated_at BEFORE UPDATE ON agendamentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
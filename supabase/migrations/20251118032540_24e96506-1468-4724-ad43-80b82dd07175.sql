-- Criar tabela de avaliações
CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbeiro_id UUID NOT NULL REFERENCES public.barbeiros(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agendamento_id UUID NOT NULL REFERENCES public.agendamentos(id) ON DELETE CASCADE,
  nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agendamento_id)
);

-- Habilitar RLS
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Clientes podem criar avaliações"
  ON public.avaliacoes FOR INSERT
  WITH CHECK (auth.uid() = cliente_id);

CREATE POLICY "Avaliações são públicas"
  ON public.avaliacoes FOR SELECT
  USING (true);

-- Index para performance
CREATE INDEX idx_avaliacoes_barbeiro ON public.avaliacoes(barbeiro_id);

-- Adicionar campos de horário na tabela barbeiros
ALTER TABLE public.barbeiros 
  ADD COLUMN dias_funcionamento TEXT[] DEFAULT ARRAY['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
  ADD COLUMN horario_inicio TIME DEFAULT '08:00:00',
  ADD COLUMN horario_fim TIME DEFAULT '19:00:00';
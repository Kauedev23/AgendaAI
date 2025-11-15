-- Adicionar campos de trial e assinatura à tabela barbearias
ALTER TABLE public.barbearias
ADD COLUMN trial_inicio timestamp with time zone DEFAULT now(),
ADD COLUMN trial_expira_em timestamp with time zone DEFAULT (now() + interval '15 days'),
ADD COLUMN plano_ativo boolean DEFAULT false,
ADD COLUMN tipo_plano varchar DEFAULT 'trial',
ADD COLUMN status_assinatura varchar DEFAULT 'trial';

-- Atualizar barbearias existentes para ter o trial ativo
UPDATE public.barbearias
SET 
  trial_inicio = created_at,
  trial_expira_em = created_at + interval '15 days',
  plano_ativo = false,
  tipo_plano = 'trial',
  status_assinatura = CASE 
    WHEN created_at + interval '15 days' > now() THEN 'trial'
    ELSE 'expirado'
  END;
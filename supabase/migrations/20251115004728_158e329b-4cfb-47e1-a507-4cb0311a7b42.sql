-- Adicionar coluna tipo_comercio na tabela barbearias
ALTER TABLE public.barbearias 
ADD COLUMN tipo_comercio VARCHAR(100) DEFAULT 'barbearia';

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.barbearias.tipo_comercio IS 'Tipo de comércio: barbearia, salao, tatuagem, spa, estetica, consultorio, personal, oficina, outro';
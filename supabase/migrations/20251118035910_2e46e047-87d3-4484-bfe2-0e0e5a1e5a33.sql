-- Adicionar campo telefone e whatsapp aos barbeiros
ALTER TABLE public.barbeiros 
ADD COLUMN IF NOT EXISTS telefone VARCHAR,
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR;

-- Adicionar campo foto aos profiles para upload
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS foto_upload_url TEXT;

COMMENT ON COLUMN barbeiros.telefone IS 'Telefone de contato do profissional';
COMMENT ON COLUMN barbeiros.whatsapp IS 'WhatsApp do profissional (com código do país)';
COMMENT ON COLUMN profiles.foto_upload_url IS 'URL da foto de perfil enviada pelo usuário';
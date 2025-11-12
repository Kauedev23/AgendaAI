-- Create a secure function to expose only public barber data (names) for a barbearia
-- This avoids exposing profiles table broadly while enabling the public booking page
CREATE OR REPLACE FUNCTION public.get_public_barbers(_slug text)
RETURNS TABLE (
  id uuid,
  nome text,
  bio text,
  especialidades text[],
  foto_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id,
    p.nome,
    b.bio,
    b.especialidades,
    b.foto_url
  FROM public.barbearias bb
  JOIN public.barbeiros b ON b.barbearia_id = bb.id
  JOIN public.profiles p ON p.id = b.user_id
  WHERE bb.slug = _slug
    AND b.ativo = true;
$$;

-- Allow anonymous/public access for read-only usage from the public booking page
GRANT EXECUTE ON FUNCTION public.get_public_barbers(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_barbers(text) TO authenticated;
-- Fix 1: Restrict profiles table access to prevent customer database harvesting
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Perfis são visíveis para usuários autenticados" ON public.profiles;

-- Create restricted policies
CREATE POLICY "Users see own profile only"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admins see their barbers' profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.barbearias b
    JOIN public.barbeiros bar ON bar.barbearia_id = b.id
    WHERE b.admin_id = auth.uid()
    AND bar.user_id = profiles.id
  )
);

-- Fix 2: Prevent privilege escalation via signup form
-- Update trigger to force all new signups to 'cliente' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Force cliente type for all new public signups
  -- Admins/barbers must be created via edge functions with proper authorization
  INSERT INTO public.profiles (id, nome, email, tipo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Usuário'),
    NEW.email,
    'cliente'  -- Always cliente for public signup, ignore client-supplied tipo
  );
  
  -- Always assign cliente role for new signups
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente');
  
  RETURN NEW;
END;
$function$;
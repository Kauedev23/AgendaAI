-- Permitir que barbeiros atualizem o status dos seus próprios agendamentos
CREATE POLICY "Barbeiros podem atualizar status dos seus agendamentos"
ON public.agendamentos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.barbeiros
    WHERE barbeiros.id = agendamentos.barbeiro_id
      AND barbeiros.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.barbeiros
    WHERE barbeiros.id = agendamentos.barbeiro_id
      AND barbeiros.user_id = auth.uid()
  )
);
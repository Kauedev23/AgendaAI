import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const useSubscriptionStatus = () => {
  const [isChecking, setIsChecking] = useState(true);
  const [subscriptionData, setSubscriptionData] = useState<{
    planoAtivo: boolean;
    statusAssinatura: string;
    trialExpiraEm: string | null;
    diasRestantes: number;
    isExpired: boolean;
  } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }

      const user = session.user;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tipo")
        .eq("id", user.id)
        .single();

      // Apenas checar assinatura para admins
      if (profile?.tipo !== "admin") {
        setIsChecking(false);
        return;
      }

      // Check subscription with Stripe
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (stripeError) {
        console.error("Erro ao verificar assinatura no Stripe:", stripeError);
      }

      // Get updated data from database
      const { data: barbearia } = await supabase
        .from("barbearias")
        .select("plano_ativo, status_assinatura, trial_expira_em")
        .eq("admin_id", user.id)
        .single();

      if (!barbearia) {
        setIsChecking(false);
        return;
      }

      const trialExpiraEm = barbearia.trial_expira_em;
      const diasRestantes = trialExpiraEm
        ? Math.ceil((new Date(trialExpiraEm).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      const isExpired = diasRestantes <= 0 && !barbearia.plano_ativo;

      setSubscriptionData({
        planoAtivo: barbearia.plano_ativo,
        statusAssinatura: barbearia.status_assinatura,
        trialExpiraEm,
        diasRestantes,
        isExpired,
      });

      // Se expirou e não tem plano ativo, redirecionar
      if (isExpired) {
        navigate("/subscription");
        return;
      }

      // Alerta quando faltam 3 dias ou menos
      if (diasRestantes <= 3 && diasRestantes > 0 && !barbearia.plano_ativo) {
        toast({
          title: "Período gratuito terminando",
          description: `Seu período gratuito termina em ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}. Clique aqui para assinar.`,
          duration: 10000,
          action: (
            <button
              onClick={() => navigate("/subscription")}
              className="text-secondary hover:underline font-medium"
            >
              Assinar agora
            </button>
          ),
        });
      }
    } catch (error) {
      console.error("Erro ao verificar assinatura:", error);
    } finally {
      setIsChecking(false);
    }
  };

  return { isChecking, subscriptionData, checkSubscription };
};

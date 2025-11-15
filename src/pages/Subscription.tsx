import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const Subscription = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [businessData, setBusinessData] = useState<any>(null);

  useEffect(() => {
    loadBusinessData();
  }, []);

  const loadBusinessData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: barbearia } = await supabase
        .from("barbearias")
        .select("*")
        .eq("admin_id", user.id)
        .single();

      setBusinessData(barbearia);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const handleActivateSubscription = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }

      // Aqui futuramente integrar com gateway de pagamento
      // Por enquanto, apenas ativar o plano para demonstração
      const { error } = await supabase
        .from("barbearias")
        .update({
          plano_ativo: true,
          tipo_plano: "profissional",
          status_assinatura: "ativo",
        })
        .eq("admin_id", user.id);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Assinatura ativada com sucesso!",
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Erro ao ativar assinatura:", error);
      toast({
        title: "Erro",
        description: "Não foi possível ativar a assinatura",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const daysRemaining = businessData?.trial_expira_em
    ? Math.ceil((new Date(businessData.trial_expira_em).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const isExpired = daysRemaining <= 0;

  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-6">
      <Card className="max-w-2xl w-full p-8 bg-white/95 backdrop-blur">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-accent mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-primary mb-2">
            {isExpired ? "Seu período gratuito expirou" : "Assine o Agenda AI"}
          </h1>
          <p className="text-muted-foreground text-lg">
            {isExpired
              ? "Continue gerenciando seu negócio com todas as funcionalidades"
              : `Restam ${daysRemaining} dias do seu período gratuito`}
          </p>
        </div>

        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl p-8 mb-8 border-2 border-primary/20">
          <div className="flex items-baseline justify-center mb-6">
            <span className="text-5xl font-bold text-primary">R$ 49,90</span>
            <span className="text-xl text-muted-foreground ml-2">/mês</span>
          </div>

          <h3 className="text-2xl font-bold text-center mb-6">Plano Profissional</h3>

          <ul className="space-y-4 mb-8">
            {[
              "Acesso ilimitado a todas as funcionalidades",
              "Profissionais ilimitados",
              "Página de agendamento personalizada",
              "Painel financeiro completo",
              "Insights com IA",
              "Relatórios detalhados",
              "Suporte prioritário",
              "Notificações automáticas",
              "Personalização de cores e marca",
            ].map((feature, index) => (
              <li key={index} className="flex items-start">
                <Check className="h-6 w-6 text-secondary mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{feature}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={handleActivateSubscription}
            disabled={loading}
            size="lg"
            className="w-full bg-secondary hover:bg-secondary/90 text-white text-lg py-6"
          >
            {loading ? "Processando..." : "Ativar Assinatura"}
          </Button>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Cancele quando quiser, sem multas ou taxas adicionais
          </p>
        </div>

        {!isExpired && (
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="w-full"
          >
            Voltar ao Dashboard
          </Button>
        )}
      </Card>
    </div>
  );
};

export default Subscription;

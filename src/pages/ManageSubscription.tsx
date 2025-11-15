import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, CheckCircle, XCircle, Clock, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ManageSubscription = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [barbearia, setBarbearia] = useState<any>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tipo")
        .eq("id", user.id)
        .single();

      if (profileData?.tipo !== 'admin') {
        navigate("/");
        return;
      }

      const { data: barbeariaData } = await supabase
        .from("barbearias")
        .select("*")
        .eq("admin_id", user.id)
        .single();

      if (!barbeariaData) {
        navigate("/settings");
        return;
      }

      setBarbearia(barbeariaData);
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar dados da assinatura");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("barbearias")
        .update({
          plano_ativo: false,
          status_assinatura: "cancelado",
        })
        .eq("admin_id", user.id);

      if (error) throw error;

      toast.success("Assinatura cancelada com sucesso");
      loadSubscriptionData();
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao cancelar assinatura");
    } finally {
      setCancelling(false);
    }
  };

  const getDaysRemaining = () => {
    if (!barbearia?.trial_expira_em) return 0;
    const expiration = new Date(barbearia.trial_expira_em);
    const today = new Date();
    const diff = expiration.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = () => {
    if (barbearia?.plano_ativo) {
      return <Badge className="bg-green-500"><CheckCircle className="h-4 w-4 mr-1" />Ativo</Badge>;
    }
    
    const daysRemaining = getDaysRemaining();
    if (daysRemaining > 0) {
      return <Badge variant="secondary"><Clock className="h-4 w-4 mr-1" />Trial ({daysRemaining} dias)</Badge>;
    }
    
    return <Badge variant="destructive"><XCircle className="h-4 w-4 mr-1" />Expirado</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();
  const isExpired = daysRemaining <= 0 && !barbearia?.plano_ativo;
  const isTrial = !barbearia?.plano_ativo && daysRemaining > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Gerenciar Assinatura</h1>
          <p className="text-muted-foreground">Visualize e gerencie seu plano do Agenda AI</p>
        </div>

        {/* Status Atual */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Status da Assinatura</CardTitle>
                <CardDescription>Informações sobre seu plano atual</CardDescription>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Plano Atual</p>
                  <p className="text-lg font-semibold text-primary">
                    {barbearia?.plano_ativo ? "Profissional" : "Trial Gratuito"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <p className="text-lg font-semibold">
                    {barbearia?.status_assinatura === "ativo" && "Ativo"}
                    {barbearia?.status_assinatura === "trial" && "Período de Teste"}
                    {barbearia?.status_assinatura === "expirado" && "Expirado"}
                    {barbearia?.status_assinatura === "cancelado" && "Cancelado"}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {isTrial && (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Dias Restantes</p>
                      <p className="text-lg font-semibold text-secondary">
                        {daysRemaining} {daysRemaining === 1 ? 'dia' : 'dias'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Expira em</p>
                      <p className="text-lg font-semibold">
                        {format(new Date(barbearia.trial_expira_em), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </>
                )}
                
                {barbearia?.plano_ativo && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Valor Mensal</p>
                    <p className="text-lg font-semibold text-secondary">R$ 49,90</p>
                  </div>
                )}
              </div>
            </div>

            {/* Alerta para trial próximo do fim */}
            {isTrial && daysRemaining <= 3 && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Seu período gratuito está terminando!
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Assine agora para continuar usando todas as funcionalidades do Agenda AI.
                  </p>
                </div>
              </div>
            )}

            {isExpired && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    Seu período gratuito expirou
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Assine agora para continuar gerenciando seu negócio.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plano Profissional */}
        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Plano Profissional
            </CardTitle>
            <CardDescription>Acesso completo a todas as funcionalidades</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">R$ 49,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>

              <div className="space-y-2">
                {[
                  "Profissionais ilimitados",
                  "Agendamentos ilimitados",
                  "Página de agendamento personalizada",
                  "Painel financeiro completo",
                  "Insights com IA",
                  "Relatórios detalhados",
                  "Notificações automáticas",
                  "Suporte prioritário",
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                {!barbearia?.plano_ativo ? (
                  <Button
                    onClick={() => navigate("/subscription")}
                    size="lg"
                    className="w-full bg-secondary hover:bg-secondary/90 text-white"
                  >
                    <Calendar className="h-5 w-5 mr-2" />
                    {isExpired ? "Reativar Assinatura" : "Assinar Agora"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">Você já está assinando este plano</span>
                    </div>
                    <Button
                      onClick={handleCancelSubscription}
                      disabled={cancelling}
                      variant="outline"
                      className="w-full"
                    >
                      {cancelling ? "Cancelando..." : "Cancelar Assinatura"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informações Adicionais */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Importantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>• Cancele quando quiser, sem multas ou taxas adicionais</p>
            <p>• Seus dados e configurações são mantidos mesmo após o cancelamento</p>
            <p>• A página pública de agendamentos continua funcionando durante o trial</p>
            <p>• Após o cancelamento, você pode reativar a qualquer momento</p>
            <p>• Todas as funcionalidades ficam disponíveis imediatamente após a assinatura</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageSubscription;

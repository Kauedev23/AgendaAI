import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Scissors, TrendingUp, LogOut, CreditCard, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import logo from "@/assets/logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { terminology } = useBusinessTerminology();
  const { isChecking, subscriptionData } = useSubscriptionStatus();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [barbearia, setBarbearia] = useState<any>(null);
  const [stats, setStats] = useState({
    agendamentos: 0,
    clientes: 0,
    barbeiros: 0,
    servicos: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);

      // Buscar perfil do usuário
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Redirecionar barbeiros para seu dashboard específico
      if (profileData?.tipo === 'barbeiro') {
        navigate("/barber-dashboard");
        return;
      }

      // Se não for admin, redirecionar
      if (profileData?.tipo !== 'admin') {
        navigate("/");
        return;
      }

      // Buscar barbearia do admin
      const { data: barbeariaData } = await supabase
        .from("barbearias")
        .select("*")
        .eq("admin_id", user.id)
        .maybeSingle();

      if (!barbeariaData) {
        navigate("/settings");
        return;
      }

      setBarbearia(barbeariaData);

      // Buscar estatísticas
      const [agendamentos, clientes, barbeiros, servicos] = await Promise.all([
        supabase
          .from("agendamentos")
          .select("id", { count: 'exact', head: true })
          .eq("barbearia_id", barbeariaData.id),
        supabase
          .from("agendamentos")
          .select("cliente_id", { count: 'exact', head: true })
          .eq("barbearia_id", barbeariaData.id),
        supabase
          .from("barbeiros")
          .select("id", { count: 'exact', head: true })
          .eq("barbearia_id", barbeariaData.id)
          .eq("ativo", true),
        supabase
          .from("servicos")
          .select("id", { count: 'exact', head: true })
          .eq("barbearia_id", barbeariaData.id)
          .eq("ativo", true)
      ]);

      setStats({
        agendamentos: agendamentos.count || 0,
        clientes: clientes.count || 0,
        barbeiros: barbeiros.count || 0,
        servicos: servicos.count || 0
      });
    } catch (error: any) {
      console.error("Erro ao verificar usuário:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao fazer logout");
    }
  };

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Scissors className="h-8 w-8 text-secondary" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Agenda AI</h1>
                <p className="text-sm text-muted-foreground">Dashboard</p>
              </div>
              {subscriptionData && (
                <div className="ml-4 px-3 py-1 rounded-full text-xs font-medium border">
                  {subscriptionData.planoAtivo ? (
                    <span className="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800">
                      ✓ Plano Ativo
                    </span>
                  ) : subscriptionData.diasRestantes > 0 ? (
                    <span className="text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800">
                      Trial - {subscriptionData.diasRestantes}d
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-800">
                      Expirado
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold">{profile?.nome}</p>
                <p className="text-sm text-muted-foreground capitalize">{profile?.tipo}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-primary mb-2">
            Olá, {profile?.nome?.split(' ')[0]}! 👋
          </h2>
          <p className="text-muted-foreground">
            Bem-vindo ao seu painel de controle
          </p>
        </div>

        {/* PWA Install Banner */}
        <PWAInstallBanner />

        {/* Alerta de Trial */}
        {subscriptionData && !subscriptionData.planoAtivo && subscriptionData.diasRestantes > 0 && subscriptionData.diasRestantes <= 7 && (
          <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Período gratuito terminando em {subscriptionData.diasRestantes} {subscriptionData.diasRestantes === 1 ? 'dia' : 'dias'}
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                    Assine agora para continuar usando todas as funcionalidades do Agenda AI sem interrupções.
                  </p>
                  <Button
                    onClick={() => navigate("/manage-subscription")}
                    size="sm"
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    Ver Planos
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card de Status da Assinatura */}
        {subscriptionData && (
          <Card className="mb-6 border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Status da Assinatura</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/manage-subscription")}
                >
                  Gerenciar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Plano Atual</p>
                  <p className="font-semibold text-primary">
                    {subscriptionData.planoAtivo ? "Profissional - R$ 49,90/mês" : "Trial Gratuito"}
                  </p>
                </div>
                {!subscriptionData.planoAtivo && subscriptionData.diasRestantes > 0 && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Dias Restantes</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-secondary" />
                      <p className="font-semibold text-secondary">
                        {subscriptionData.diasRestantes} {subscriptionData.diasRestantes === 1 ? 'dia' : 'dias'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Agendamentos
              </CardTitle>
              <Calendar className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.agendamentos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.agendamentos === 0 ? 'Nenhum agendamento ainda' : 'agendamentos realizados'}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clientes Únicos
              </CardTitle>
              <Users className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.clientes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.clientes === 0 ? 'Comece a receber agendamentos' : 'clientes cadastrados'}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Barbeiros Ativos
              </CardTitle>
              <Scissors className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.barbeiros}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.barbeiros === 0 ? 'Cadastre sua equipe' : 'profissionais ativos'}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Serviços Oferecidos
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.servicos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.servicos === 0 ? 'Configure seus serviços' : 'serviços disponíveis'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        {profile?.tipo === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Acesso Rápido</CardTitle>
              <CardDescription>
                Gerencie sua barbearia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Button 
                  className="h-auto py-4 flex flex-col items-start bg-secondary hover:bg-secondary/90"
                  onClick={() => navigate("/settings")}
                >
                  <span className="font-semibold mb-1">Configurações</span>
                  <span className="text-xs text-white/80">Nome, logo e informações</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-start" 
                  variant="outline"
                  onClick={() => navigate("/services")}
                >
                  <span className="font-semibold mb-1">Serviços</span>
                  <span className="text-xs text-muted-foreground">Cortes, barba e preços</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-start" 
                  variant="outline"
                  onClick={() => navigate("/barbers")}
                >
                  <span className="font-semibold mb-1">Barbeiros</span>
                  <span className="text-xs text-muted-foreground">Sua equipe de profissionais</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-start" 
                  variant="outline"
                  onClick={() => navigate("/appointments")}
                >
                  <span className="font-semibold mb-1">Agendamentos</span>
                  <span className="text-xs text-muted-foreground">Gerencie os horários</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-start" 
                  variant="outline"
                  onClick={() => navigate("/reports")}
                >
                  <span className="font-semibold mb-1">Relatórios</span>
                  <span className="text-xs text-muted-foreground">Insights com IA</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-start" 
                  variant="outline"
                  onClick={() => navigate("/manage-subscription")}
                >
                  <span className="font-semibold mb-1">Minha Assinatura</span>
                  <span className="text-xs text-muted-foreground">Gerencie seu plano</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, TrendingUp, LogOut, CreditCard, AlertCircle, Clock, Home, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { useTerminology } from "@/context/BusinessTerminologyProvider";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import logo from "@/assets/logo.png";

type DashboardData = {
  agendamentos: number;
  clientes: number;
  barbeiros: number;
  servicos: number;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { terminology } = useTerminology();
  const { isChecking, subscriptionData } = useSubscriptionStatus();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [barbearia, setBarbearia] = useState<any>(null);
  const [stats, setStats] = useState<DashboardData>({
    agendamentos: 0,
    clientes: 0,
    barbeiros: 0,
    servicos: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData: (id: string) => Promise<DashboardData> = async (id) => {
    // Buscar barbearia do admin
    const { data: barbeariaDataResponse } = await supabase
      .from("barbearias")
      .select("*")
      .eq("admin_id", id)
      .maybeSingle();

    if (!barbeariaDataResponse) {
      navigate("/settings");
      return {
        agendamentos: 0,
        clientes: 0,
        barbeiros: 0,
        servicos: 0
      };
    }

    setBarbearia(barbeariaDataResponse);

    // Buscar agendamentos para contar clientes únicos
    const { data: agendamentosCompletos } = await supabase
      .from("agendamentos")
      .select("id, cliente_id")
      .eq("barbearia_id", barbeariaDataResponse.id);

    // Contar clientes únicos
    const clientesUnicos = new Set(agendamentosCompletos?.map(a => a.cliente_id) || []).size;

    // Buscar outras estatísticas
    const [barbeirosData, servicosData] = await Promise.all([
      supabase
        .from("barbeiros")
        .select("id", { count: 'exact', head: true })
        .eq("barbearia_id", barbeariaDataResponse.id)
        .eq("ativo", true),
      supabase
        .from("servicos")
        .select("id", { count: 'exact', head: true })
        .eq("barbearia_id", barbeariaDataResponse.id)
        .eq("ativo", true)
    ]);

    // Garantir que valores não sejam indefinidos
    if (!barbeirosData || !servicosData) {
      console.error("Dados incompletos carregados");
      return {
        agendamentos: 0,
        clientes: 0,
        barbeiros: 0,
        servicos: 0
      };
    }

    return {
      agendamentos: agendamentosCompletos?.length || 0,
      clientes: clientesUnicos,
      barbeiros: barbeirosData.count || 0,
      servicos: servicosData.count || 0
    };
  };

  const checkUser = useCallback(async () => {
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

      const dashboardData = await fetchDashboardData(user.id);

      setStats(dashboardData);
    } catch (error: any) {
      console.error("Erro ao verificar usuário:", error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logout realizado com sucesso!");
      navigate("/");
    } catch (error: any) {
      toast.error("Erro ao fazer logout");
    }
  };

  useEffect(() => {
    checkUser();
  }, [checkUser]);

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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-cyan-500" />
                <div>
                <h1 className="text-2xl font-bold">{terminology.dashboardTitle}</h1>
                <p className="text-sm text-muted-foreground">Dashboard</p>
              </div>
              {subscriptionData && (
                <div className="ml-4 px-3 py-1 rounded-full text-xs font-medium border">
                  {subscriptionData.planoAtivo ? (
                    <span className="text-green-600">✓ Plano Ativo</span>
                  ) : subscriptionData.diasRestantes > 0 ? (
                    <span className="text-yellow-600">Trial - {subscriptionData.diasRestantes}d</span>
                  ) : (
                    <span className="text-red-600">Expirado</span>
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
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
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
          <Card className="card-hover transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {`Total de ${terminology.appointments}`}
              </CardTitle>
              <Calendar className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.agendamentos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.agendamentos === 0 ? `Nenhum ${terminology.appointments.toLowerCase()} ainda` : `${terminology.appointments.toLowerCase()} realizados`}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {`${terminology.clients} Únicos`}
              </CardTitle>
              <Users className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.clientes}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.clientes === 0 ? `Comece a receber ${terminology.appointments.toLowerCase()}` : `${terminology.clients.toLowerCase()} cadastrados`}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover transition-all duration-300 hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {`${terminology.professionals} Ativos`}
              </CardTitle>
              <Users className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.barbeiros}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.barbeiros === 0 ? `Adicione ${terminology.professionals.toLowerCase()}` : 'na equipe'}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {`${terminology.services} Oferecidos`}
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.servicos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.servicos === 0 ? `Configure seus ${terminology.services.toLowerCase()}` : `${terminology.services.toLowerCase()} disponíveis`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Painel de Métricas em Tempo Real */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Métricas em Tempo Real
            </CardTitle>
            <CardDescription>Acompanhe o desempenho do seu negócio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Taxa de Ocupação */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Taxa de Ocupação Hoje</span>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold text-primary">
                  {stats.barbeiros > 0 && stats.agendamentos > 0 
                    ? Math.round((stats.agendamentos / (stats.barbeiros * 8)) * 100) 
                    : 0}%
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${stats.barbeiros > 0 && stats.agendamentos > 0 
                        ? Math.min(Math.round((stats.agendamentos / (stats.barbeiros * 8)) * 100), 100) 
                        : 0}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.agendamentos} agendamentos / {stats.barbeiros > 0 ? stats.barbeiros * 8 : 0} slots disponíveis
                </p>
              </div>

              {/* Receita Estimada */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Receita do Mês</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">
                  R$ {(stats.agendamentos * 45).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Baseado em {stats.agendamentos} {terminology.appointments.toLowerCase()} realizados
                </p>
                <p className="text-xs font-medium text-green-600">
                  ↑ Média de R$ 45,00 por serviço
                </p>
              </div>

              {/* Clientes Ativos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Clientes Únicos</span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-2xl font-bold text-primary">
                  {stats.clientes}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.clientes > 0 
                    ? `${(stats.agendamentos / stats.clientes).toFixed(1)} agendamentos por cliente` 
                    : 'Nenhum cliente ainda'}
                </p>
                <p className="text-xs font-medium text-primary">
                  {stats.clientes > 0 ? '↑ Base crescendo' : 'Comece a divulgar'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {profile?.tipo === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Acesso Rápido</CardTitle>
              <CardDescription>
                Gerencie sua {terminology.business.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Button 
                  className="h-auto py-4 flex flex-col items-start"
                  variant="outline"
                  onClick={() => navigate("/settings")}
                >
                  <span className="font-semibold mb-1">Configurações</span>
                  <span className="text-xs text-muted-foreground">Nome, logo e informações</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-start" 
                  variant="outline"
                  onClick={() => navigate("/services")}
                >
                  <span className="font-semibold mb-1">{terminology.services}</span>
                  <span className="text-xs text-muted-foreground">Ex: {terminology.services.toLowerCase()}, preços e duração</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-start" 
                  variant="outline"
                  onClick={() => navigate("/barbers")}
                >
                  <span className="font-semibold mb-1">{terminology.professionals}</span>
                  <span className="text-xs text-muted-foreground">Sua equipe</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-start" 
                  variant="outline"
                  onClick={() => navigate("/appointments")}
                >
                  <span className="font-semibold mb-1">{terminology.appointments}</span>
                  <span className="text-xs text-muted-foreground">Gerencie os horários</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-start" 
                  variant="outline"
                  onClick={() => navigate("/calendar")}
                >
                  <span className="font-semibold mb-1">Calendário Mensal</span>
                  <span className="text-xs text-muted-foreground">Visão completa do mês</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-start" 
                  variant="outline"
                  onClick={() => navigate("/clients")}
                >
                  <span className="font-semibold mb-1">Análise de Clientes</span>
                  <span className="text-xs text-muted-foreground">Ativos, inativos e frequentes</span>
                </Button>
                <Button 
                  className="h-auto py-4 flex flex-col items-start" 
                  variant="outline"
                  onClick={() => navigate("/overview")}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-5 w-5" />
                    <span className="font-semibold">Visão Geral</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Dashboards e insights com IA</span>
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
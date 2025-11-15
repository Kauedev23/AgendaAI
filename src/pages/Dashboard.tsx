import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Scissors, TrendingUp, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useBusinessTerminology } from "@/hooks/useBusinessTerminology";
import logo from "@/assets/logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const { terminology } = useBusinessTerminology();
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
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
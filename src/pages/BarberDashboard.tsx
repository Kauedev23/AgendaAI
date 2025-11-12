import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Scissors, LogOut, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BarberDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [barbeiro, setBarbeiro] = useState<any>(null);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);

      // Buscar perfil
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Verificar se é barbeiro
      if (profileData?.tipo !== 'barbeiro') {
        navigate("/dashboard");
        return;
      }

      // Buscar dados do barbeiro
      const { data: barbeiroData } = await supabase
        .from("barbeiros")
        .select("*, barbearias(*)")
        .eq("user_id", user.id)
        .single();

      setBarbeiro(barbeiroData);

      // Buscar agendamentos do barbeiro
      const hoje = new Date().toISOString().split('T')[0];
      const { data: agendamentosData } = await supabase
        .from("agendamentos")
        .select(`
          *,
          servicos(nome, preco, duracao),
          profiles!agendamentos_cliente_id_fkey(nome, telefone, email)
        `)
        .eq("barbeiro_id", barbeiroData?.id)
        .gte("data", hoje)
        .order("data", { ascending: true })
        .order("hora", { ascending: true })
        .limit(20);

      setAgendamentos(agendamentosData || []);
    } catch (error: any) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados");
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

  const handleStatusUpdate = async (agendamentoId: string, novoStatus: "pendente" | "confirmado" | "cancelado" | "concluido") => {
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: novoStatus })
        .eq("id", agendamentoId);

      if (error) throw error;

      toast.success("Status atualizado!");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao atualizar status");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pendente: "secondary",
      confirmado: "default",
      cancelado: "destructive",
      concluido: "outline"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const agendamentosHoje = agendamentos.filter(a => {
    const hoje = new Date().toISOString().split('T')[0];
    return a.data === hoje;
  });

  const agendamentosConcluidos = agendamentos.filter(a => a.status === 'concluido').length;

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
                <h1 className="text-2xl font-bold text-primary">{barbeiro?.barbearias?.nome}</h1>
                <p className="text-sm text-muted-foreground">Painel do Barbeiro</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold">{profile?.nome}</p>
                <p className="text-sm text-muted-foreground">Barbeiro</p>
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
            Olá, {profile?.nome?.split(' ')[0]}! ✂️
          </h2>
          <p className="text-muted-foreground">
            Aqui estão seus próximos atendimentos
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hoje
              </CardTitle>
              <Calendar className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{agendamentosHoje.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {agendamentosHoje.length === 1 ? 'atendimento' : 'atendimentos'}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Próximos
              </CardTitle>
              <Clock className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{agendamentos.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                agendamentos futuros
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Concluídos
              </CardTitle>
              <Scissors className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{agendamentosConcluidos}</div>
              <p className="text-xs text-muted-foreground mt-1">
                atendimentos finalizados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Agendamentos</CardTitle>
            <CardDescription>
              Seus atendimentos agendados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {agendamentos.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum agendamento encontrado
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {agendamentos.map((agendamento) => (
                  <Card key={agendamento.id} className="card-hover">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                            <User className="h-6 w-6 text-secondary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">
                                {agendamento.profiles?.nome}
                              </h3>
                              {getStatusBadge(agendamento.status)}
                            </div>
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <p className="flex items-center gap-2">
                                <Scissors className="h-4 w-4" />
                                {agendamento.servicos?.nome} - R$ {agendamento.servicos?.preco}
                              </p>
                              <p className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(agendamento.data + 'T00:00:00'), "dd 'de' MMMM", { locale: ptBR })} às {agendamento.hora}
                              </p>
                              <p className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Duração: {agendamento.servicos?.duracao} min
                              </p>
                              {agendamento.profiles?.telefone && (
                                <p>Tel: {agendamento.profiles.telefone}</p>
                              )}
                            </div>
                            {agendamento.observacoes && (
                              <p className="mt-2 text-sm italic">
                                Obs: {agendamento.observacoes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {agendamento.status !== 'concluido' && agendamento.status !== 'cancelado' && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusUpdate(agendamento.id, 'confirmado')}
                            disabled={agendamento.status === 'confirmado'}
                          >
                            Confirmar
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleStatusUpdate(agendamento.id, 'concluido')}
                          >
                            Finalizar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleStatusUpdate(agendamento.id, 'cancelado')}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BarberDashboard;

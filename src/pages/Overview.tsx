import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Home, TrendingUp, DollarSign, Calendar, Users, Sparkles, Loader2, Clock, Award, Target } from "lucide-react";
import { toast } from "sonner";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'];

interface TopItem {
  nome: string;
  quantidade: number;
  valor: number;
}

const Overview = () => {
  const navigate = useNavigate();
  const { isChecking } = useSubscriptionStatus();
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [barbearia, setBarbearia] = useState<any>(null);
  const [insights, setInsights] = useState<any[]>([]);
  
  const [stats, setStats] = useState({
    faturamento: { total: 0, ticketMedio: 0, projecaoMes: 0 },
    agendamentos: { total: 0, concluidos: 0, pendentes: 0, cancelados: 0 },
    topClientes: [] as TopItem[],
    topServicos: [] as TopItem[],
    topProfissionais: [] as TopItem[],
    topDias: [] as { dia: string; quantidade: number }[],
    topHorarios: [] as { horario: string; quantidade: number }[],
    faturamentoPorDia: [] as { dia: string; valor: number }[],
  });

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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("tipo")
        .eq("id", user.id)
        .single();

      if (profileData?.tipo !== 'admin') {
        toast.error("Acesso negado");
        navigate("/");
        return;
      }

      const { data: barbeariasData } = await supabase
        .from("barbearias")
        .select("*")
        .eq("admin_id", user.id)
        .maybeSingle();

      if (!barbeariasData) {
        toast.error("Configure seu negócio primeiro");
        navigate("/settings");
        return;
      }

      setBarbearia(barbeariasData);

      // Buscar agendamentos com todos os dados relacionados
      const { data: agendamentos } = await supabase
        .from("agendamentos")
        .select(`
          *,
          servico:servicos(nome, preco),
          barbeiro:barbeiros(id, profiles:user_id(nome)),
          cliente:profiles!agendamentos_cliente_id_fkey(nome, email)
        `)
        .eq("barbearia_id", barbeariasData.id);

      if (!agendamentos) {
        setLoading(false);
        return;
      }

      // Calcular estatísticas gerais
      const concluidos = agendamentos.filter(a => a.status === 'concluido');
      const faturamentoTotal = concluidos.reduce((acc, a: any) => 
        acc + (a.servico?.preco || 0), 0
      );
      const ticketMedio = concluidos.length > 0 ? faturamentoTotal / concluidos.length : 0;

      // Calcular projeção do mês (baseado nos últimos 7 dias)
      const hoje = new Date();
      const seteDiasAtras = new Date(hoje.getTime() - 7 * 24 * 60 * 60 * 1000);
      const agendamentosRecentes = concluidos.filter((a: any) => 
        new Date(a.data) >= seteDiasAtras
      );
      const faturamento7Dias = agendamentosRecentes.reduce((acc, a: any) => 
        acc + (a.servico?.preco || 0), 0
      );
      const mediadiaria = faturamento7Dias / 7;
      const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      const projecaoMes = mediadiaria * diasNoMes;

      // Top Clientes
      const clientesMap = new Map<string, TopItem>();
      concluidos.forEach((a: any) => {
        if (a.cliente) {
          const key = a.cliente.nome;
          const existing = clientesMap.get(key) || { nome: key, quantidade: 0, valor: 0 };
          existing.quantidade += 1;
          existing.valor += a.servico?.preco || 0;
          clientesMap.set(key, existing);
        }
      });
      const topClientes = Array.from(clientesMap.values())
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

      // Top Serviços
      const servicosMap = new Map<string, TopItem>();
      concluidos.forEach((a: any) => {
        if (a.servico) {
          const key = a.servico.nome;
          const existing = servicosMap.get(key) || { nome: key, quantidade: 0, valor: 0 };
          existing.quantidade += 1;
          existing.valor += a.servico.preco || 0;
          servicosMap.set(key, existing);
        }
      });
      const topServicos = Array.from(servicosMap.values())
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);

      // Top Profissionais
      const profissionaisMap = new Map<string, TopItem>();
      concluidos.forEach((a: any) => {
        if (a.barbeiro?.profiles) {
          const key = a.barbeiro.profiles.nome;
          const existing = profissionaisMap.get(key) || { nome: key, quantidade: 0, valor: 0 };
          existing.quantidade += 1;
          existing.valor += a.servico?.preco || 0;
          profissionaisMap.set(key, existing);
        }
      });
      const topProfissionais = Array.from(profissionaisMap.values())
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);

      // Top Dias da Semana
      const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const diasMap = new Map<number, number>();
      agendamentos.forEach((a: any) => {
        const dia = new Date(a.data).getDay();
        diasMap.set(dia, (diasMap.get(dia) || 0) + 1);
      });
      const topDias = Array.from(diasMap.entries())
        .map(([dia, quantidade]) => ({ dia: diasSemana[dia], quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade);

      // Top Horários
      const horariosMap = new Map<string, number>();
      agendamentos.forEach((a: any) => {
        const hora = a.hora.substring(0, 5); // "HH:MM"
        horariosMap.set(hora, (horariosMap.get(hora) || 0) + 1);
      });
      const topHorarios = Array.from(horariosMap.entries())
        .map(([horario, quantidade]) => ({ horario, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 8);

      // Faturamento por dia (últimos 7 dias)
      const faturamentoPorDiaMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const data = new Date(hoje.getTime() - i * 24 * 60 * 60 * 1000);
        const dataStr = data.toISOString().split('T')[0];
        faturamentoPorDiaMap.set(dataStr, 0);
      }
      concluidos.forEach((a: any) => {
        const dataStr = a.data;
        if (faturamentoPorDiaMap.has(dataStr)) {
          faturamentoPorDiaMap.set(dataStr, 
            (faturamentoPorDiaMap.get(dataStr) || 0) + (a.servico?.preco || 0)
          );
        }
      });
      const faturamentoPorDia = Array.from(faturamentoPorDiaMap.entries())
        .map(([dia, valor]) => ({
          dia: new Date(dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          valor
        }));

      setStats({
        faturamento: { total: faturamentoTotal, ticketMedio, projecaoMes },
        agendamentos: {
          total: agendamentos.length,
          concluidos: concluidos.length,
          pendentes: agendamentos.filter(a => a.status === 'pendente').length,
          cancelados: agendamentos.filter(a => a.status === 'cancelado').length,
        },
        topClientes,
        topServicos,
        topProfissionais,
        topDias,
        topHorarios,
        faturamentoPorDia,
      });

    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = async () => {
    setLoadingInsights(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: {
          agendamentos: stats.agendamentos,
          faturamento: stats.faturamento,
          servicosData: stats.topServicos,
          barbeirosData: stats.topProfissionais
        }
      });

      if (error) throw error;
      
      setInsights(data.insights || []);
      toast.success("Insights gerados com sucesso!");
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao gerar insights");
    } finally {
      setLoadingInsights(false);
    }
  };

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando visão geral...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container-responsive py-6 sm:py-8">
        {/* Header */}
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="gap-2 hover:bg-transparent p-0 self-start"
            >
              <Home className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-base sm:text-lg">Voltar</span>
            </Button>
            
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-center flex-1">
              Visão Geral
            </h1>
            
            <div className="w-20 sm:w-24 hidden sm:block"></div>
          </div>
        </header>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="card-hover border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-primary">
                R$ {stats.faturamento.total.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ticket médio: R$ {stats.faturamento.ticketMedio.toFixed(2)}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover border-l-4 border-l-secondary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Projeção do Mês</CardTitle>
              <TrendingUp className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-secondary">
                R$ {stats.faturamento.projecaoMes.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Baseado nos últimos 7 dias
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover border-l-4 border-l-accent">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
              <Calendar className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">{stats.agendamentos.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.agendamentos.concluidos} concluídos
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover border-l-4 border-l-primary/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conclusão</CardTitle>
              <Target className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold">
                {stats.agendamentos.total > 0 
                  ? ((stats.agendamentos.concluidos / stats.agendamentos.total) * 100).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.agendamentos.pendentes} pendentes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Faturamento por Dia */}
          <Card className="card-responsive">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Faturamento (Últimos 7 dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.faturamentoPorDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="dia" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip 
                    formatter={(value: number) => `R$ ${value.toFixed(2)}`}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  />
                  <Line type="monotone" dataKey="valor" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Horários */}
          <Card className="card-responsive">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Horários Mais Procurados</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.topHorarios}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="horario" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                  <Bar dataKey="quantidade" fill="#06b6d4" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Insights com IA */}
        <Card className="mb-6 sm:mb-8 card-hover">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Insights Inteligentes
                </CardTitle>
                <CardDescription className="mt-1">
                  Consultoria automática gerada por IA
                </CardDescription>
              </div>
              <Button 
                onClick={generateInsights} 
                disabled={loadingInsights}
                className="gradient-primary text-white font-bold px-6 sm:px-8 py-5 sm:py-6 rounded-full w-full sm:w-auto"
              >
                {loadingInsights ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Insights
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground text-sm sm:text-base">
                  Clique em "Gerar Insights" para receber sugestões personalizadas
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <Card key={index} className="border-l-4 border-l-primary shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <Award className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="font-bold text-base sm:text-lg mb-2">{insight.titulo}</h3>
                          <p className="text-sm sm:text-base text-muted-foreground mb-3 leading-relaxed">
                            {insight.descricao}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full font-medium">
                              {insight.categoria}
                            </span>
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              insight.prioridade === 'alta' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              insight.prioridade === 'media' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            }`}>
                              Prioridade: {insight.prioridade}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Top Clientes */}
          <Card className="card-responsive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Users className="h-5 w-5 text-primary" />
                Top Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topClientes.map((cliente, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-sm sm:text-base">{cliente.nome}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">R$ {cliente.valor.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{cliente.quantidade} serviços</p>
                    </div>
                  </div>
                ))}
                {stats.topClientes.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Nenhum cliente ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Serviços */}
          <Card className="card-responsive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Award className="h-5 w-5 text-primary" />
                Top Serviços
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topServicos.map((servico, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary/10 text-secondary font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-sm sm:text-base">{servico.nome}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-secondary">{servico.quantidade}x</p>
                      <p className="text-xs text-muted-foreground">R$ {servico.valor.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
                {stats.topServicos.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Nenhum serviço ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Profissionais */}
          <Card className="card-responsive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <TrendingUp className="h-5 w-5 text-primary" />
                Top Profissionais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topProfissionais.map((prof, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-medium text-sm sm:text-base">{prof.nome}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-accent">R$ {prof.valor.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{prof.quantidade} atendimentos</p>
                    </div>
                  </div>
                ))}
                {stats.topProfissionais.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Nenhum profissional ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Dias da Semana */}
        <Card className="mt-6 card-responsive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Calendar className="h-5 w-5 text-primary" />
              Dias da Semana Mais Movimentados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.topDias} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" style={{ fontSize: '12px' }} />
                <YAxis dataKey="dia" type="category" width={80} style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="quantidade" fill="#06b6d4" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Overview;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, TrendingUp, DollarSign, Calendar, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const Reports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [barbearia, setBarbearia] = useState<any>(null);
  const [stats, setStats] = useState<any>({});
  const [insights, setInsights] = useState<any[]>([]);

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

      const { data: barbeariasData } = await supabase
        .from("barbearias")
        .select("*")
        .eq("admin_id", user.id)
        .maybeSingle();

      if (!barbeariasData) {
        toast.error("Configure sua barbearia primeiro");
        navigate("/settings");
        return;
      }

      setBarbearia(barbeariasData);

      // Buscar agendamentos
      const { data: agendamentos } = await supabase
        .from("agendamentos")
        .select("*, servico:servicos(nome, preco), barbeiro:barbeiros(id, profiles:user_id(nome))")
        .eq("barbearia_id", barbeariasData.id);

      // Buscar transações
      const { data: transacoes } = await supabase
        .from("transacoes")
        .select("*")
        .eq("barbearia_id", barbeariasData.id);

      // Calcular estatísticas
      const totalAgendamentos = agendamentos?.length || 0;
      const pendentes = agendamentos?.filter(a => a.status === 'pendente').length || 0;
      const confirmados = agendamentos?.filter(a => a.status === 'confirmado').length || 0;
      const concluidos = agendamentos?.filter(a => a.status === 'concluido').length || 0;
      
      const faturamentoTotal = transacoes?.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + parseFloat(String(t.valor)), 0) || 0;
      const ticketMedio = concluidos > 0 ? faturamentoTotal / concluidos : 0;

      // Serviços mais populares
      const servicosMap = new Map();
      agendamentos?.forEach((a: any) => {
        if (a.servico) {
          const existing = servicosMap.get(a.servico.nome) || { nome: a.servico.nome, quantidade: 0, faturamento: 0 };
          existing.quantidade += 1;
          if (a.status === 'concluido') {
            existing.faturamento += parseFloat(String(a.servico.preco));
          }
          servicosMap.set(a.servico.nome, existing);
        }
      });

      // Performance dos barbeiros
      const barbeirosMap = new Map();
      agendamentos?.forEach((a: any) => {
        if (a.barbeiro?.profiles) {
          const nome = a.barbeiro.profiles.nome;
          const existing = barbeirosMap.get(nome) || { nome, agendamentos: 0, faturamento: 0 };
          existing.agendamentos += 1;
          if (a.status === 'concluido' && a.servico) {
            existing.faturamento += parseFloat(String(a.servico.preco));
          }
          barbeirosMap.set(nome, existing);
        }
      });

      setStats({
        agendamentos: {
          total: totalAgendamentos,
          pendentes,
          confirmados,
          concluidos
        },
        faturamento: {
          total: faturamentoTotal,
          ticketMedio
        },
        servicos: Array.from(servicosMap.values()).sort((a, b) => b.quantidade - a.quantidade),
        barbeiros: Array.from(barbeirosMap.values()).sort((a, b) => b.agendamentos - a.agendamentos)
      });

    } catch (error) {
      console.error("Erro:", error);
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
          servicosData: stats.servicos,
          barbeirosData: stats.barbeiros
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
      <div className="container mx-auto px-6 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Relatórios e Insights</h1>
          <p className="text-muted-foreground">Análise detalhada do seu negócio</p>
        </div>

        {/* Estatísticas Gerais */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">
                R$ {stats.faturamento?.total.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Ticket médio: R$ {stats.faturamento?.ticketMedio.toFixed(2) || '0.00'}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
              <Calendar className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.agendamentos?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.agendamentos?.concluidos || 0} concluídos
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
              <TrendingUp className="h-5 w-5 text-secondary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {stats.agendamentos?.total > 0 
                  ? ((stats.agendamentos?.concluidos / stats.agendamentos?.total) * 100).toFixed(1)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Agendamentos finalizados</p>
            </CardContent>
          </Card>
        </div>

        {/* Insights com IA */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-secondary" />
                  Insights Inteligentes
                </CardTitle>
                <CardDescription>Sugestões geradas por IA para melhorar seu negócio</CardDescription>
              </div>
              <Button onClick={generateInsights} disabled={loadingInsights}>
                {loadingInsights ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                {loadingInsights ? "Gerando..." : "Gerar Insights"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {insights.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Clique em "Gerar Insights" para obter sugestões personalizadas
              </p>
            ) : (
              <div className="space-y-4">
                {insights.map((insight, index) => (
                  <Card key={index} className="border-l-4 border-l-secondary">
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-lg mb-2">{insight.titulo}</h3>
                      <p className="text-muted-foreground mb-3">{insight.descricao}</p>
                      <div className="flex gap-2">
                        <span className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded">
                          {insight.categoria}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          insight.prioridade === 'alta' ? 'bg-red-100 text-red-800' :
                          insight.prioridade === 'media' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {insight.prioridade}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Serviços e Barbeiros */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Serviços Mais Populares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.servicos?.slice(0, 5).map((servico: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{servico.nome}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{servico.quantidade} agendamentos</p>
                      <p className="text-xs text-muted-foreground">R$ {servico.faturamento.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance dos Barbeiros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.barbeiros?.map((barbeiro: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{barbeiro.nome}</span>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{barbeiro.agendamentos} atendimentos</p>
                      <p className="text-xs text-muted-foreground">R$ {barbeiro.faturamento.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Reports;

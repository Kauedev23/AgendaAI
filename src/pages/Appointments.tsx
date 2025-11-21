import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, User, Scissors, Star, Home } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import type { Tables } from "@/integrations/supabase/types";
import { useTerminology } from "@/context/BusinessTerminologyProvider";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { AvaliarDialog } from "@/components/AvaliarDialog";

// Type for joined agendamento
type Appointment = Tables<"agendamentos"> & {
  cliente?: { nome: string; email: string; telefone: string | null };
  barbeiro?: { id: string; nome: string };
  servico?: { nome: string; preco: number; duracao: number };
};

const Appointments = () => {
  const navigate = useNavigate();
  const { terminology } = useTerminology();
  const { isChecking } = useSubscriptionStatus();
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [barbearia, setBarbearia] = useState<Tables<"barbearias"> | null>(null);
  const [avaliarAgendamento, setAvaliarAgendamento] = useState<Appointment | null>(null);
  const [avaliacoesExistentes, setAvaliacoesExistentes] = useState<Set<string>>(new Set());

  const fetchAppointments: (id: string) => Promise<Appointment[]> = async (id) => {
    const { data: agendamentosData } = await supabase
      .from("agendamentos")
      .select(`
        *,
        cliente:profiles!agendamentos_cliente_id_fkey (nome, email, telefone),
        barbeiro:barbeiros (
          id,
          profiles:user_id (nome)
        ),
        servico:servicos (nome, preco, duracao)
      `)
      .eq("barbearia_id", id)
      .order("data", { ascending: true })
      .order("hora", { ascending: true });

    // Map barbeiro to have direct nome property
    return (agendamentosData || []).map((a: any) => ({
      ...a,
      barbeiro: a.barbeiro
        ? {
            id: a.barbeiro.id,
            nome: a.barbeiro.profiles?.nome ?? ""
          }
        : undefined,
    }));
  };

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Verificar se é admin
      const { data: profileData } = await supabase
        .from("profiles")
        .select("tipo")
        .eq("id", user.id)
        .single();

      if (profileData?.tipo !== 'admin') {
        toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
        navigate("/");
        return;
      }

      const { data: barbeariasData } = await supabase
        .from("barbearias")
        .select("*")
        .eq("admin_id", user.id)
        .single();

      if (!barbeariasData) {
        toast.error("Configure sua barbearia primeiro");
        navigate("/settings");
        return;
      }

      setBarbearia(barbeariasData);

      const agendamentosData = await fetchAppointments(barbeariasData.id);
      setAgendamentos(agendamentosData);

      // Buscar avaliações existentes
      if (agendamentosData && agendamentosData.length > 0) {
        const { data: avaliacoesData } = await supabase
          .from("avaliacoes")
          .select("agendamento_id")
          .in("agendamento_id", agendamentosData.map(a => a.id));
        
        const avaliacoesSet = new Set(avaliacoesData?.map(a => a.agendamento_id) || []);
        setAvaliacoesExistentes(avaliacoesSet);
      }
    } catch (error: unknown) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusUpdate = async (id: string, newStatus: "pendente" | "confirmado" | "cancelado" | "concluido") => {
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      const statusText = newStatus === 'confirmado' ? 'confirmado' : newStatus === 'concluido' ? 'concluído' : 'cancelado';
      toast.success(`${terminology.appointment} ${statusText}!`);
      loadData();
    } catch (error: unknown) {
      console.error("Erro:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "secondary" | "default" | "outline" | "destructive"> = {
      pendente: "secondary",
      confirmado: "default",
      concluido: "outline",
      cancelado: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="gap-2 hover:bg-transparent p-0"
          >
            <Home className="h-6 w-6" />
            <span className="text-lg">Voltar</span>
          </Button>
          
          <h1 className="text-3xl font-bold flex-1 text-center">
            {terminology.appointments}
          </h1>
          
          <div className="w-24"></div>
        </header>

        {agendamentos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                {`Nenhum ${terminology.appointment.toLowerCase()} encontrado.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {agendamentos.map((agendamento) => (
              <Card key={agendamento.id} className="card-hover">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg mb-1">{agendamento.cliente?.nome || terminology.client}</CardTitle>
                      <p className="text-sm text-muted-foreground">{agendamento.cliente?.email}</p>
                    </div>
                    {getStatusBadge(agendamento.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-secondary" />
                      <span className="text-sm">
                        {format(new Date(agendamento.data + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-secondary" />
                      <span className="text-sm">{agendamento.hora}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-secondary" />
                      <span className="text-sm">{agendamento.barbeiro?.nome || terminology.professional}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-secondary" />
                      <span className="text-sm">{agendamento.servico?.nome}</span>
                    </div>
                  </div>

                  {agendamento.observacoes && (
                    <p className="text-sm text-muted-foreground mb-4">
                      <strong>Obs:</strong> {agendamento.observacoes}
                    </p>
                  )}

                  {agendamento.status === 'pendente' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleStatusUpdate(agendamento.id, 'confirmado')}
                      >
                        Confirmar
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

                  {agendamento.status === 'confirmado' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatusUpdate(agendamento.id, 'concluido')}
                    >
                      Marcar como Concluído
                    </Button>
                  )}

                  {agendamento.status === 'concluido' && !avaliacoesExistentes.has(agendamento.id) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAvaliarAgendamento(agendamento)}
                      className="gap-2"
                    >
                      <Star className="h-4 w-4 text-yellow-500" />
                      Avaliar Atendimento
                    </Button>
                  )}

                  {agendamento.status === 'concluido' && avaliacoesExistentes.has(agendamento.id) && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      Avaliado
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AvaliarDialog
        open={!!avaliarAgendamento}
        agendamento={avaliarAgendamento}
        onClose={() => setAvaliarAgendamento(null)}
        onSuccess={() => {
          loadData();
          setAvaliarAgendamento(null);
        }}
      />
    </div>
  );
};

export default Appointments;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, User, Scissors } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const Appointments = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [barbearia, setBarbearia] = useState<any>(null);

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
        .single();

      if (!barbeariasData) {
        toast.error("Configure sua barbearia primeiro");
        navigate("/settings");
        return;
      }

      setBarbearia(barbeariasData);

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
        .eq("barbearia_id", barbeariasData.id)
        .order("data", { ascending: true })
        .order("hora", { ascending: true });

      setAgendamentos(agendamentosData || []);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: "pendente" | "confirmado" | "cancelado" | "concluido") => {
    try {
      const { error } = await supabase
        .from("agendamentos")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`Agendamento ${newStatus === 'confirmado' ? 'confirmado' : newStatus === 'concluido' ? 'concluído' : 'cancelado'}!`);
      loadData();
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pendente: "secondary",
      confirmado: "default",
      concluido: "outline",
      cancelado: "destructive"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
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
          <h1 className="text-3xl font-bold text-primary mb-2">Agendamentos</h1>
          <p className="text-muted-foreground">Gerencie todos os agendamentos da barbearia</p>
        </div>

        {agendamentos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum agendamento encontrado.
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
                      <CardTitle className="text-lg mb-1">{agendamento.cliente?.nome || "Cliente"}</CardTitle>
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
                      <span className="text-sm">{agendamento.barbeiro?.profiles?.nome || "Barbeiro"}</span>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Appointments;

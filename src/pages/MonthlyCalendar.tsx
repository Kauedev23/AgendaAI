import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";
import { useTerminology } from "@/context/BusinessTerminologyProvider";

type Appointment = Tables<"agendamentos"> & {
  servico?: { nome: string };
};

const MonthlyCalendar = () => {
  const navigate = useNavigate();
  const { terminology } = useTerminology();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState<Appointment[]>([]);
  const [barbearia, setBarbearia] = useState<Tables<"barbearias"> | null>(null);

  const loadData = useCallback(async () => {
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
        .single();

      if (!barbeariasData) {
        toast.error("Configure sua barbearia primeiro");
        navigate("/settings");
        return;
      }

      setBarbearia(barbeariasData);

      // Buscar agendamentos do mês atual
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data: agendamentosData } = await supabase
        .from("agendamentos")
        .select(`
          *,
          servico:servicos (nome)
        `)
        .eq("barbearia_id", barbeariasData.id)
        .gte("data", format(monthStart, "yyyy-MM-dd"))
        .lte("data", format(monthEnd, "yyyy-MM-dd"));

      setAgendamentos(agendamentosData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar calendário");
    } finally {
      setLoading(false);
    }
  }, [navigate, currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getAppointmentsForDay = (day: Date) => {
    return agendamentos.filter((apt) => 
      isSameDay(new Date(apt.data), day)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmado":
        return "bg-green-100 text-green-800 border-green-200";
      case "pendente":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "cancelado":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando calendário...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Calendário Mensal</h1>
                <p className="text-sm text-muted-foreground">{barbearia?.nome}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Hoje
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Header dias da semana */}
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-sm text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}

              {/* Padding inicial */}
              {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-24 border rounded-lg bg-muted/30" />
              ))}

              {/* Dias do mês */}
              {daysInMonth.map((day) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toString()}
                    className={`min-h-24 border rounded-lg p-2 transition-all hover:shadow-md ${
                      isToday ? "border-primary bg-primary/5" : "bg-white"
                    } ${!isSameMonth(day, currentDate) ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-semibold ${isToday ? "text-primary" : ""}`}>
                        {format(day, "d")}
                      </span>
                      {dayAppointments.length > 0 && (
                        <Badge variant="secondary" className="text-xs px-1.5">
                          {dayAppointments.length}
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((apt, i) => (
                        <div
                          key={apt.id}
                          className={`text-xs p-1 rounded border ${getStatusColor(apt.status)}`}
                        >
                          <div className="font-medium truncate">
                            {apt.hora.substring(0, 5)}
                          </div>
                        </div>
                      ))}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dayAppointments.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legenda */}
            <div className="mt-6 flex flex-wrap gap-4 justify-center border-t pt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-200" />
                <span className="text-sm text-muted-foreground">Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-200" />
                <span className="text-sm text-muted-foreground">Confirmado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-200" />
                <span className="text-sm text-muted-foreground">Cancelado</span>
              </div>
            </div>

            {/* Resumo do mês */}
            <div className="mt-6 grid md:grid-cols-3 gap-4 border-t pt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {agendamentos.length}
                </p>
                <p className="text-sm text-muted-foreground">Total de {terminology.appointments}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {agendamentos.filter((a) => a.status === "confirmado").length}
                </p>
                <p className="text-sm text-muted-foreground">Confirmados</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {agendamentos.filter((a) => a.status === "pendente").length}
                </p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MonthlyCalendar;

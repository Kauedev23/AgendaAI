import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, Clock, User, Check, ArrowLeft, ArrowRight, 
  Phone, MapPin, Star, Loader2, LogOut, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { format, addDays, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

// Schema de validação
const bookingSchema = z.object({
  observacoes: z.string().max(500, "Observações muito longas").optional(),
});

const PublicBooking = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  
  const [barbearia, setBarbearia] = useState<any>(null);
  const [barbeiros, setBarbeiros] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<string>("");
  const [selectedServico, setSelectedServico] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [observacoes, setObservacoes] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  
  const [step, setStep] = useState(1);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    checkAuth();
    loadBarbearia();
  }, [slug]);

  useEffect(() => {
    if (selectedBarbeiro && selectedDate) {
      loadAvailableTimes();
    }
  }, [selectedBarbeiro, selectedDate, selectedServico]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/client-auth", { state: { from: window.location.pathname } });
      return;
    }

    setUser(user);

    // Buscar perfil
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado");
    navigate("/client-auth");
  };

  const loadBarbearia = async () => {
    try {
      const { data: barbeariasData } = await supabase
        .from("barbearias")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!barbeariasData) {
        toast.error("Negócio não encontrado");
        setLoading(false);
        return;
      }

      setBarbearia(barbeariasData);

      // Buscar barbeiros ativos
      const { data: barbeirosData } = await supabase
        .from("barbeiros")
        .select(`
          *,
          profiles:user_id(nome, avatar_url)
        `)
        .eq("barbearia_id", barbeariasData.id)
        .eq("ativo", true);

      setBarbeiros(barbeirosData || []);

      // Buscar serviços ativos
      const { data: servicosData } = await supabase
        .from("servicos")
        .select("*")
        .eq("barbearia_id", barbeariasData.id)
        .eq("ativo", true)
        .order("preco");

      setServicos(servicosData || []);
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTimes = async () => {
    try {
      const barbeiro = barbeiros.find(b => b.id === selectedBarbeiro);
      if (!barbeiro) return;

      const servico = servicos.find(s => s.id === selectedServico);
      if (!servico) return;

      // Buscar agendamentos existentes nesta data
      const { data: agendamentos } = await supabase
        .from("agendamentos")
        .select("hora, data")
        .eq("barbeiro_id", selectedBarbeiro)
        .eq("data", selectedDate)
        .in("status", ["pendente", "confirmado"]);

      // Gerar horários disponíveis
      const inicio = parse(barbeiro.horario_inicio || "08:00", "HH:mm", new Date());
      const fim = parse(barbeiro.horario_fim || "19:00", "HH:mm", new Date());
      const duracao = servico.duracao || 30;

      const times: string[] = [];
      let current = inicio;

      while (current < fim) {
        const timeStr = format(current, "HH:mm");
        
        // Verificar se já tem agendamento neste horário
        const temAgendamento = agendamentos?.some(a => a.hora === timeStr + ":00");
        
        if (!temAgendamento) {
          times.push(timeStr);
        }

        // Adicionar minutos (não dias)
        current = new Date(current.getTime() + duracao * 60 * 1000);
      }

      setAvailableTimes(times);
    } catch (error: any) {
      console.error("Erro:", error);
    }
  };

  const handleBooking = async () => {
    if (!user) {
      toast.error("Você precisa estar logado");
      navigate("/client-auth", { state: { from: window.location.pathname } });
      return;
    }

    // Validar observações
    const validation = bookingSchema.safeParse({ observacoes });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("public-booking", {
        body: {
          barbearia_id: barbearia.id,
          barbeiro_id: selectedBarbeiro,
          servico_id: selectedServico,
          data: selectedDate,
          hora: selectedTime,
          observacoes: observacoes.trim() || null,
        },
      });

      if (error) throw error;

      setBookingSuccess(true);
      toast.success("Agendamento realizado com sucesso!");
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error(error.message || "Erro ao realizar agendamento");
    } finally {
      setSubmitting(false);
    }
  };

  const getNextDates = () => {
    const dates = [];
    const barbeiro = barbeiros.find(b => b.id === selectedBarbeiro);
    const diasFuncionamento = barbeiro?.dias_funcionamento || 
      ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

    const diasMap: Record<number, string> = {
      0: "domingo",
      1: "segunda",
      2: "terca",
      3: "quarta",
      4: "quinta",
      5: "sexta",
      6: "sabado",
    };

    for (let i = 0; i < 14; i++) {
      const date = addDays(new Date(), i);
      const diaSemana = diasMap[date.getDay()];
      
      if (diasFuncionamento.includes(diaSemana)) {
        dates.push(date);
      }
    }

    return dates.slice(0, 7);
  };

  const canContinue = () => {
    if (step === 1) return selectedServico !== "";
    if (step === 2) return selectedBarbeiro !== "";
    if (step === 3) return selectedDate !== "" && selectedTime !== "";
    return false;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!barbearia) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">Negócio não encontrado</p>
            <Button onClick={() => navigate("/")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full shadow-2xl">
          <CardContent className="pt-12 pb-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Agendamento Confirmado!</h2>
            <p className="text-lg text-muted-foreground mb-6">
              Seu horário foi reservado com sucesso
            </p>
            
            <Card className="bg-muted/50 border-0 mb-8">
              <CardContent className="pt-6 space-y-3 text-left">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {format(new Date(selectedDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {barbeiros.find(b => b.id === selectedBarbeiro)?.profiles?.nome}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Button
                onClick={() => window.location.reload()}
                className="w-full h-12 gradient-primary font-semibold"
              >
                Fazer Novo Agendamento
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="w-full h-12"
              >
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container-responsive py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {barbearia.logo_url && (
                <Avatar className="h-12 w-12">
                  <AvatarImage src={barbearia.logo_url} alt={barbearia.nome} />
                  <AvatarFallback>{barbearia.nome[0]}</AvatarFallback>
                </Avatar>
              )}
              <div>
                <h1 className="text-xl font-bold">{barbearia.nome}</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {barbearia.endereco || "Online"}
                </p>
              </div>
            </div>
            
            {user && (
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-primary/10">
                    {profile?.nome?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="container-responsive py-8">
        {/* Progress Steps */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all ${
                  step >= s 
                    ? "bg-primary text-white" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {step > s ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 4 && (
                  <div className={`flex-1 h-1 mx-2 rounded transition-all ${
                    step > s ? "bg-primary" : "bg-muted"
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-3 text-xs sm:text-sm font-medium">
            <span className={step >= 1 ? "text-primary" : "text-muted-foreground"}>Serviço</span>
            <span className={step >= 2 ? "text-primary" : "text-muted-foreground"}>Profissional</span>
            <span className={step >= 3 ? "text-primary" : "text-muted-foreground"}>Data/Hora</span>
            <span className={step >= 4 ? "text-primary" : "text-muted-foreground"}>Confirmar</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Step 1: Escolher Serviço */}
          {step === 1 && (
            <div className="space-y-4">
              <CardHeader className="px-0">
                <CardTitle className="text-2xl">Escolha o Serviço</CardTitle>
                <CardDescription>Selecione o serviço que deseja realizar</CardDescription>
              </CardHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {servicos.map((servico) => (
                  <Card
                    key={servico.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      selectedServico === servico.id
                        ? "ring-2 ring-primary bg-primary/5"
                        : ""
                    }`}
                    onClick={() => setSelectedServico(servico.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-lg">{servico.nome}</h3>
                        <Badge variant="secondary" className="text-base font-bold">
                          R$ {servico.preco.toFixed(2)}
                        </Badge>
                      </div>
                      {servico.descricao && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {servico.descricao}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {servico.duracao} minutos
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Escolher Profissional */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </div>

              <CardHeader className="px-0">
                <CardTitle className="text-2xl">Escolha o Profissional</CardTitle>
                <CardDescription>Selecione quem irá te atender</CardDescription>
              </CardHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {barbeiros.map((barbeiro) => {
                  const avgRating = 4.8;

                  return (
                    <Card
                      key={barbeiro.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedBarbeiro === barbeiro.id
                          ? "ring-2 ring-primary bg-primary/5"
                          : ""
                      }`}
                      onClick={() => setSelectedBarbeiro(barbeiro.id)}
                    >
                      <CardContent className="p-6 text-center">
                        <Avatar className="h-24 w-24 mx-auto mb-4 border-4 border-primary/20">
                          <AvatarImage src={barbeiro.foto_url || barbeiro.profiles?.avatar_url} />
                          <AvatarFallback className="text-2xl bg-primary/10">
                            {barbeiro.profiles?.nome?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <h3 className="font-bold text-lg mb-2">{barbeiro.profiles?.nome}</h3>
                        {barbeiro.especialidades && barbeiro.especialidades.length > 0 && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {barbeiro.especialidades.join(", ")}
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">{avgRating.toFixed(1)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Escolher Data e Hora */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </div>

              <CardHeader className="px-0">
                <CardTitle className="text-2xl">Escolha Data e Horário</CardTitle>
                <CardDescription>Selecione quando deseja ser atendido</CardDescription>
              </CardHeader>

              {/* Datas */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Data</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {getNextDates().map((date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const isSelected = selectedDate === dateStr;

                    return (
                      <Button
                        key={dateStr}
                        variant={isSelected ? "default" : "outline"}
                        className={`h-auto py-4 flex flex-col gap-1 ${
                          isSelected ? "gradient-primary" : ""
                        }`}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          setSelectedTime("");
                        }}
                      >
                        <span className="text-xs uppercase">
                          {format(date, "EEE", { locale: ptBR })}
                        </span>
                        <span className="text-2xl font-bold">
                          {format(date, "dd", { locale: ptBR })}
                        </span>
                        <span className="text-xs">
                          {format(date, "MMM", { locale: ptBR })}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Horários */}
              {selectedDate && (
                <div>
                  <Label className="text-base font-semibold mb-3 block">Horário</Label>
                  {availableTimes.length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Clock className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          Nenhum horário disponível nesta data
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {availableTimes.map((time) => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          className={`h-12 font-semibold ${
                            selectedTime === time ? "gradient-primary" : ""
                          }`}
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmar */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => setStep(3)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              </div>

              <CardHeader className="px-0">
                <CardTitle className="text-2xl">Confirmar Agendamento</CardTitle>
                <CardDescription>Revise os detalhes antes de confirmar</CardDescription>
              </CardHeader>

              <Card className="bg-muted/50 border-2">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Serviço</p>
                      <p className="font-bold text-lg">
                        {servicos.find(s => s.id === selectedServico)?.nome}
                      </p>
                      <p className="text-sm text-primary font-semibold">
                        R$ {servicos.find(s => s.id === selectedServico)?.preco.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={barbeiros.find(b => b.id === selectedBarbeiro)?.foto_url} />
                      <AvatarFallback>
                        {barbeiros.find(b => b.id === selectedBarbeiro)?.profiles?.nome?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-muted-foreground">Profissional</p>
                      <p className="font-bold text-lg">
                        {barbeiros.find(b => b.id === selectedBarbeiro)?.profiles?.nome}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data e Horário</p>
                      <p className="font-bold text-lg">
                        {format(new Date(selectedDate), "dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-sm font-semibold text-secondary">{selectedTime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <Label htmlFor="observacoes" className="text-base font-semibold">
                  Observações (Opcional)
                </Label>
                <Textarea
                  id="observacoes"
                  placeholder="Alguma observação ou pedido especial?"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="mt-2 min-h-24"
                  maxLength={500}
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {observacoes.length}/500 caracteres
                </p>
              </div>

              <Button
                onClick={handleBooking}
                disabled={submitting}
                className="w-full h-14 text-lg font-bold gradient-primary"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Confirmar Agendamento
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 4 && step > 0 && (
            <div className="flex justify-end gap-3 mt-8">
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canContinue()}
                className="h-12 px-8 gradient-primary font-semibold"
              >
                Continuar
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicBooking;

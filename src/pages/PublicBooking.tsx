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
import { Calendar, Clock, User, Check, ArrowLeft, ArrowRight, Phone, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";

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
  const [step, setStep] = useState(0);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [telefone, setTelefone] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [clienteName, setClienteName] = useState("");

  useEffect(() => { loadBarbearia(); }, [slug]);
  useEffect(() => { if (selectedBarbeiro && selectedDate) loadAvailableTimes(); }, [selectedBarbeiro, selectedDate, selectedServico]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneLoading(true);
    try {
      if (telefone.replace(/\D/g, "").length < 10) { 
        toast.error("Por favor, insira um telefone válido"); 
        setPhoneLoading(false); 
        return; 
      }
      
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("telefone", telefone)
        .eq("tipo", "cliente")
        .maybeSingle();
      
      if (existingProfile) {
        const emailFromPhone = `${telefone.replace(/\D/g, "")}@cliente.app`;
        const { error: signInError, data: authData } = await supabase.auth.signInWithPassword({ 
          email: emailFromPhone, 
          password: telefone.replace(/\D/g, "") 
        });
        
        if (signInError) { 
          toast.error("Erro ao fazer login"); 
          console.error(signInError);
          setPhoneLoading(false); 
          return; 
        }
        
        setUser(authData.user); 
        setProfile(existingProfile); 
        setClienteName(existingProfile.nome);
        toast.success(`Bem-vindo de volta, ${existingProfile.nome}!`); 
        setStep(1);
      } else { 
        setShowNameInput(true); 
      }
    } catch (error) { 
      toast.error("Erro ao processar telefone"); 
      console.error(error);
    } finally { 
      setPhoneLoading(false); 
    }
  };

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneLoading(true);
    try {
      if (!clienteName.trim() || clienteName.trim().length < 3) { 
        toast.error("Por favor, insira seu nome completo"); 
        setPhoneLoading(false); 
        return; 
      }
      
      const emailFromPhone = `${telefone.replace(/\D/g, "")}@cliente.app`;
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ 
        email: emailFromPhone, 
        password: telefone.replace(/\D/g, ""), 
        options: { 
          data: { nome: clienteName, telefone, tipo: "cliente" }, 
          emailRedirectTo: `${window.location.origin}/` 
        } 
      });
      
      if (signUpError || !authData.user) { 
        toast.error("Erro ao criar conta"); 
        console.error(signUpError);
        setPhoneLoading(false); 
        return; 
      }
      
      await supabase.from("profiles").update({ nome: clienteName, telefone }).eq("id", authData.user.id);
      setUser(authData.user); 
      setProfile({ id: authData.user.id, nome: clienteName, telefone, email: emailFromPhone });
      toast.success("Conta criada com sucesso!"); 
      setStep(1);
    } catch (error) { 
      toast.error("Erro ao criar conta"); 
      console.error(error);
    } finally { 
      setPhoneLoading(false); 
    }
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
      
      const { data: publicBarbers } = await supabase.rpc("get_public_barbers", { _slug: String(slug) });
      setBarbeiros(publicBarbers || []);
      
      const { data: servicosData } = await supabase
        .from("servicos")
        .select("*")
        .eq("barbearia_id", barbeariasData.id)
        .eq("ativo", true)
        .order("preco", { ascending: true });
      
      setServicos(servicosData || []);
      setLoading(false);
    } catch (error) { 
      toast.error("Erro ao carregar dados"); 
      console.error(error);
      setLoading(false); 
    }
  };

  const loadAvailableTimes = async () => {
    if (!selectedBarbeiro || !selectedDate || !selectedServico) {
      setAvailableTimes([]);
      return;
    }

    try {
      const servico = servicos.find(s => s.id === selectedServico);
      if (!servico) return;

      const duracao = servico.duracao || 60;
      const horarioInicio = barbearia?.horario_abertura || "08:00";
      const horarioFim = barbearia?.horario_fechamento || "19:00";

      const { data: existingAgendamentos } = await supabase
        .from("agendamentos")
        .select("hora, servico_id")
        .eq("barbeiro_id", selectedBarbeiro)
        .eq("data", selectedDate)
        .in("status", ["pendente", "confirmado"]);

      const agendamentosMap = (existingAgendamentos || []).reduce((acc, curr) => {
        const servicoInfo = servicos.find(s => s.id === curr.servico_id);
        const duracaoAgendamento = servicoInfo?.duracao || 60;
        acc[curr.hora] = duracaoAgendamento;
        return acc;
      }, {} as Record<string, number>);

      const [hI, mI] = horarioInicio.split(":").map(Number);
      const [hF, mF] = horarioFim.split(":").map(Number);
      const minutosInicio = hI * 60 + mI;
      const minutosFim = hF * 60 + mF;

      const slots: string[] = [];
      for (let m = minutosInicio; m + duracao <= minutosFim; m += duracao) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

        let conflito = false;
        for (let offset = 0; offset < duracao; offset += 30) {
          const testM = m + offset;
          const testH = Math.floor(testM / 60);
          const testMin = testM % 60;
          const testStr = `${String(testH).padStart(2, "0")}:${String(testMin).padStart(2, "0")}`;

          if (testStr in agendamentosMap) {
            conflito = true;
            break;
          }
        }

        if (!conflito) slots.push(timeStr);
      }

      setAvailableTimes(slots);
    } catch (error) {
      console.error("Erro ao carregar horários:", error);
      setAvailableTimes([]);
    }
  };

  const handleBooking = async () => {
    try {
      const validation = bookingSchema.safeParse({ observacoes });
      if (!validation.success) { 
        toast.error("Observações muito longas"); 
        return; 
      }
      
      setSubmitting(true);
      
      const payload = { 
        barbeariaId: barbearia.id, 
        barbeiroId: selectedBarbeiro, 
        servicoId: selectedServico, 
        date: selectedDate, 
        time: selectedTime, 
        nome: clienteName, 
        email: `${telefone.replace(/\D/g, "")}@cliente.app`, 
        telefone, 
        observacoes: observacoes || null 
      };
      
      const { data, error } = await supabase.functions.invoke("public-booking", { body: payload });
      
      if (error || data?.error) { 
        toast.error(data?.error || "Erro ao criar agendamento"); 
        return; 
      }
      
      toast.success("Agendamento realizado com sucesso!"); 
      setBookingSuccess(true);
    } catch (error) { 
      toast.error("Erro ao processar agendamento"); 
      console.error(error);
    } finally { 
      setSubmitting(false); 
    }
  };

  const getNextDates = () => {
    const dates: string[] = [];
    const diasValidos = barbearia?.dias_funcionamento || [];
    let currentDate = new Date();
    
    while (dates.length < 7) {
      const dayName = format(currentDate, "EEEE", { locale: ptBR }).toLowerCase();
      const normalizedDayName = dayName.replace("ç", "c").replace("-feira", "");
      
      if (diasValidos.includes(normalizedDayName)) {
        dates.push(format(currentDate, "yyyy-MM-dd"));
      }
      currentDate = addDays(currentDate, 1);
    }
    return dates;
  };

  const canContinue = () => {
    if (step === 0) return false;
    if (step === 1 && !selectedServico) return false;
    if (step === 2 && !selectedBarbeiro) return false;
    if (step === 3 && (!selectedDate || !selectedTime)) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!barbearia) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <p className="text-muted-foreground">Negócio não encontrado</p>
        <Button onClick={() => navigate("/")}>Voltar ao início</Button>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-2xl font-bold">Agendamento Confirmado!</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Seu agendamento foi realizado com sucesso. Em breve você receberá a confirmação.
        </p>
        <Button onClick={() => window.location.href = `/booking/${slug}`}>
          Fazer novo agendamento
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => step === 0 ? navigate("/") : setStep(step - 1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {barbearia && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {barbearia.logo_url && (
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={barbearia.logo_url} />
                    <AvatarFallback>{barbearia.nome[0]}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <h1 className="text-2xl font-bold">{barbearia.nome}</h1>
                  {barbearia.endereco && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {barbearia.endereco}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {step > 0 && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex justify-between items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1">
                <div className={`h-2 rounded-full transition-colors ${
                  s <= step ? 'bg-primary' : 'bg-muted'
                }`} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Serviço</span>
            <span>Profissional</span>
            <span>Data/Hora</span>
            <span>Confirmar</span>
          </div>
        </div>
      )}

      {step === 0 && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Identificação
            </CardTitle>
            <CardDescription>
              {!showNameInput 
                ? "Digite seu telefone para continuar" 
                : "Complete seu cadastro"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showNameInput ? (
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    type="tel"
                    placeholder="(11) 98765-4321"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    maxLength={16}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={phoneLoading || telefone.replace(/\D/g, "").length < 10}
                >
                  {phoneLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Continuar"
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleQuickRegister} className="space-y-4">
                <div>
                  <Label htmlFor="telefone-readonly">Telefone</Label>
                  <Input
                    id="telefone-readonly"
                    type="tel"
                    value={telefone}
                    disabled
                  />
                </div>
                <div>
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Seu nome completo"
                    value={clienteName}
                    onChange={(e) => setClienteName(e.target.value)}
                    required
                    minLength={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNameInput(false);
                      setClienteName("");
                    }}
                    className="flex-1"
                  >
                    Voltar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1" 
                    disabled={phoneLoading || clienteName.trim().length < 3}
                  >
                    {phoneLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar Conta"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Escolha o Serviço</CardTitle>
            <CardDescription>Selecione o serviço desejado</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {servicos.map((servico) => (
              <button
                key={servico.id}
                onClick={() => setSelectedServico(servico.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedServico === servico.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{servico.nome}</h3>
                    {servico.descricao && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {servico.descricao}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {servico.duracao} min
                      </Badge>
                    </div>
                  </div>
                  <span className="text-lg font-bold">
                    R$ {Number(servico.preco).toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Escolha o Profissional</CardTitle>
            <CardDescription>Selecione quem irá atendê-lo</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {barbeiros.map((barbeiro) => (
              <button
                key={barbeiro.id}
                onClick={() => setSelectedBarbeiro(barbeiro.id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  selectedBarbeiro === barbeiro.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={barbeiro.foto_url} />
                    <AvatarFallback>
                      {barbeiro.nome?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{barbeiro.nome}</h3>
                    {barbeiro.bio && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {barbeiro.bio}
                      </p>
                    )}
                    {barbeiro.especialidades && barbeiro.especialidades.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {barbeiro.especialidades.map((esp: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {esp}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <div className="max-w-4xl mx-auto grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Escolha a Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {getNextDates().map((date) => (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedDate === date
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(date + "T00:00:00"), "EEE", { locale: ptBR })}
                      </p>
                      <p className="text-lg font-bold">
                        {format(new Date(date + "T00:00:00"), "dd")}
                      </p>
                      <p className="text-xs">
                        {format(new Date(date + "T00:00:00"), "MMM", { locale: ptBR })}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle>Escolha o Horário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {availableTimes.length > 0 ? (
                    availableTimes.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedTime === time
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <p className="text-center font-semibold">{time}</p>
                      </button>
                    ))
                  ) : (
                    <p className="col-span-full text-center text-muted-foreground py-8">
                      Nenhum horário disponível para esta data
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {step === 4 && (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Confirmar Agendamento</CardTitle>
            <CardDescription>Revise os dados antes de confirmar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  <p className="font-medium">{clienteName}</p>
                  <p className="text-sm text-muted-foreground">{telefone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Check className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Serviço</p>
                  <p className="font-medium">
                    {servicos.find(s => s.id === selectedServico)?.nome}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Profissional</p>
                  <p className="font-medium">
                    {barbeiros.find(b => b.id === selectedBarbeiro)?.nome}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Data e Hora</p>
                  <p className="font-medium">
                    {format(new Date(selectedDate + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })} às {selectedTime}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações (opcional)</Label>
              <Textarea
                id="observacoes"
                placeholder="Alguma observação sobre o atendimento?"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step > 0 && (
        <div className="max-w-4xl mx-auto mt-6 flex gap-3">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canContinue()}
              className="flex-1"
            >
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleBooking}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar Agendamento
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicBooking;

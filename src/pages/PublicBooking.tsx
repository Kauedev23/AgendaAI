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
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, User, Check, ArrowLeft, ArrowRight, Mail, Lock, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";
import { useNotifications } from "@/hooks/useNotifications";
import { usePublicBusinessTerminology } from "@/hooks/usePublicBusinessTerminology";

const bookingSchema = z.object({
  observacoes: z.string().max(500, "Observações muito longas").optional(),
});

const PublicBooking = () => {
  // --- HOOKS DE ESTADO ---
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
  const [authLoading, setAuthLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [authData, setAuthData] = useState({
    email: "",
    password: "",
    nome: "",
  });
  const { scheduleAppointmentReminder, showNotification } = useNotifications();
  const { terminology: publicTerminology } = usePublicBusinessTerminology(slug || "");

  // --- FUNÇÕES INTERNAS ---

  // Carrega dados públicos da barbearia, barbeiros e serviços
  const loadData = async () => {
    try {
      setLoading(true);
      if (!slug) {
        toast.error("Barbearia não encontrada");
        navigate("/");
        return;
      }
      // Buscar barbearia pelo slug
      const { data: barbeariaData, error: barbeariaError } = await supabase
        .from("barbearias")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (barbeariaError || !barbeariaData) {
        toast.error("Barbearia não encontrada");
        navigate("/");
        return;
      }
      setBarbearia(barbeariaData);

      // Primeiro, buscar todos os barbeiros sem join
      const { data: barbeirosSimples } = await supabase
        .from("barbeiros")
        .select("*")
        .eq("barbearia_id", barbeariaData.id)
        .eq("ativo", true);
      
      console.log("🔍 Barbeiros sem join:", barbeirosSimples);

      if (barbeirosSimples && barbeirosSimples.length > 0) {
        // Buscar profiles separadamente
        const userIds = barbeirosSimples.map(b => b.user_id);
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, nome, email, telefone")
          .in("id", userIds);
        
        console.log("📋 Profiles buscados:", profilesData);
        
        // Verificar quais barbeiros NÃO têm profile e criar
        const profileIds = new Set(profilesData?.map(p => p.id) || []);
        const barbeirossSemProfile = barbeirosSimples.filter(b => !profileIds.has(b.user_id));
        
        if (barbeirossSemProfile.length > 0) {
          console.log("⚠️ Barbeiros sem profile, criando...", barbeirossSemProfile);
          
          // Criar profiles faltantes
          const profilesToCreate = barbeirossSemProfile.map(b => ({
            id: b.user_id,
            nome: "Profissional", // Nome padrão
            tipo: "barbeiro",
            email: "",
            telefone: "",
            barbearia_id: b.barbearia_id
          }));
          
          const { error: insertError } = await supabase
            .from("profiles")
            .insert(profilesToCreate);
          
          if (insertError) {
            console.error("❌ Erro ao criar profiles:", insertError);
          } else {
            console.log("✅ Profiles criados com sucesso!");
            // Recarregar profiles
            const { data: newProfilesData } = await supabase
              .from("profiles")
              .select("id, nome, email, telefone")
              .in("id", userIds);
            
            // Atualizar profilesData com os novos
            profilesData?.push(...(newProfilesData || []));
          }
        }
        
        const barbeirosComNome = barbeirosSimples.map(b => {
          const profile = profilesData?.find(p => p.id === b.user_id);
          console.log(`👤 Barbeiro ${b.id} -> Profile:`, profile);
          
          return {
            ...b,
            nome: profile?.nome || "Profissional",
            email: profile?.email || "",
            telefone: profile?.telefone || ""
          };
        });
        
        console.log("✅ Barbeiros finais:", barbeirosComNome);
        setBarbeiros(barbeirosComNome);
      } else {
        console.log("❌ Nenhum barbeiro encontrado");
        setBarbeiros([]);
      }

      // Buscar serviços ativos
      const { data: servicosData } = await supabase
        .from("servicos")
        .select("*")
        .eq("barbearia_id", barbeariaData.id)
        .eq("ativo", true)
        .order("preco", { ascending: true });
      setServicos(servicosData || []);
    } catch (error) {
      toast.error("Erro ao carregar dados públicos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    checkExistingSession();
    handleOAuthCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Processar callback do OAuth (Google)
  const handleOAuthCallback = async () => {
    try {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      
      if (accessToken) {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Erro ao obter sessão OAuth:", error);
          return;
        }
        
        if (session?.user) {
          setUser(session.user);
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          
          if (profileData) {
            setProfile(profileData);
            setStep(1);
            toast.success(`Bem-vindo, ${profileData.nome || session.user.email}!`);
          }
        }
        // Limpar hash da URL
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (error) {
      console.error("Erro ao processar callback OAuth:", error);
    }
  };

  // Verificar se já existe sessão ativa
  const checkExistingSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Erro ao verificar sessão:", error);
        return;
      }
      
      if (session?.user) {
        setUser(session.user);
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          setStep(1); // Já está autenticado, vai direto para seleção de serviço
        }
      }
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      const currentUrl = window.location.origin + window.location.pathname;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: currentUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        toast.error("Erro ao fazer login com Google: " + error.message);
        console.error("Erro OAuth:", error);
        setAuthLoading(false);
      }
      // Se sucesso, será redirecionado automaticamente
    } catch (error) {
      toast.error("Erro ao processar login com Google");
      console.error("Erro crítico OAuth:", error);
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);

    try {
      // Validações básicas
      if (!authData.email || !authData.password) {
        toast.error("Preencha todos os campos");
        setAuthLoading(false);
        return;
      }

      if (authData.password.length < 6) {
        toast.error("A senha deve ter no mínimo 6 caracteres");
        setAuthLoading(false);
        return;
      }

      if (!isLogin && (!authData.nome || authData.nome.trim().length < 3)) {
        toast.error("Por favor, informe seu nome completo (mínimo 3 caracteres)");
        setAuthLoading(false);
        return;
      }

      if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: authData.email,
          password: authData.password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("Email ou senha incorretos");
          } else if (error.message.includes("Email not confirmed")) {
            toast.error("Confirme seu email antes de fazer login");
          } else {
            toast.error("Erro ao fazer login");
          }
          console.error(error);
          setAuthLoading(false);
          return;
        }

        if (data.user) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();
          
          setProfile(profileData);
          setUser(data.user);
          toast.success(`Bem-vindo de volta${profileData?.nome ? ', ' + profileData.nome : ''}!`);
          setStep(1);
        }
      } else {
        // Cadastro
        const { data, error } = await supabase.auth.signUp({
          email: authData.email,
          password: authData.password,
          options: {
            data: {
              nome: authData.nome.trim(),
              tipo: "cliente",
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Este email já está cadastrado. Faça login.");
            setIsLogin(true);
          } else if (error.message.includes("Invalid email")) {
            toast.error("Email inválido");
          } else {
            toast.error("Erro ao criar conta: " + error.message);
          }
          console.error(error);
          setAuthLoading(false);
          return;
        }

        if (data.user) {
          setUser(data.user);
          
          // Aguardar criação do perfil (trigger automático)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", data.user.id)
            .single();
          
          setProfile(profileData);
          toast.success("Conta criada com sucesso!");
          setStep(1);
        }
      }
    } catch (error) {
      toast.error("Erro ao processar autenticação");
      console.error(error);
    } finally {
      setAuthLoading(false);
    }
  };


  // Carrega horários disponíveis para o barbeiro, data e serviço selecionados
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

  // Atualiza horários disponíveis quando seleção muda
  useEffect(() => {
    if (selectedBarbeiro && selectedDate && selectedServico) {
      loadAvailableTimes();
    } else {
      setAvailableTimes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBarbeiro, selectedDate, selectedServico, servicos, barbearia]);

  const handleBooking = async () => {
    try {
      // Validações
      if (!profile || !user) {
        toast.error("Você precisa estar logado para agendar");
        setStep(0);
        return;
      }

      if (!selectedServico || !selectedBarbeiro || !selectedDate || !selectedTime) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      const validation = bookingSchema.safeParse({ observacoes });
      if (!validation.success) { 
        toast.error("Observações muito longas (máximo 500 caracteres)"); 
        return; 
      }
      
      setSubmitting(true);
      
      const payload = { 
        barbeariaId: barbearia.id, 
        barbeiroId: selectedBarbeiro, 
        servicoId: selectedServico, 
        date: selectedDate, 
        time: selectedTime, 
        nome: profile?.nome || user?.user_metadata?.nome || "Cliente", 
        email: user?.email || profile?.email || "", 
        telefone: profile?.telefone || "", 
        observacoes: observacoes || null 
      };

      console.log("📤 Enviando agendamento:", payload);
      
      try {
        const { data, error } = await supabase.functions.invoke("public-booking", { body: payload });
        
        console.log("📥 Resposta da função:", { data, error });
        
        if (error) {
          // Erro de rede ou invocação
          const errorMsg = error.message || "Erro ao criar agendamento";
          toast.error(errorMsg); 
          console.error("❌ Erro na invocação:", error);
          return; 
        }

        if (data?.error) { 
          // Erro retornado pela função
          toast.error(data.error); 
          console.error("❌ Erro retornado pela função:", data.error);
          return; 
        }
        
        if (!data?.ok && !data?.agendamentoId) {
          // Resposta inesperada
          toast.error("Resposta inesperada do servidor");
          console.error("❌ Resposta inválida:", data);
          return;
        }
      
        // Agendar lembrete de notificação
        const barbeiroInfo = barbeiros.find(b => b.id === selectedBarbeiro);
        if (data?.agendamentoId) {
          scheduleAppointmentReminder(
            data.agendamentoId,
            selectedDate,
            selectedTime,
            barbearia.nome,
            barbeiroInfo?.nome || publicTerminology.professional
          );
          
          // Mostra notificação imediata de confirmação
          showNotification(`${publicTerminology.appointment} Confirmado! 🎉`, {
            body: `Seu horário está marcado para ${format(new Date(selectedDate), "dd/MM/yyyy")} às ${selectedTime}`,
            tag: `booking-confirmed-${data.agendamentoId}`,
          });
        }
        
        toast.success(`${publicTerminology.appointment} realizado com sucesso!`);
        setBookingSuccess(true);
      } catch (invokeError) {
        // Erro de rede/timeout
        console.error("❌ Erro de invocação:", invokeError);
        toast.error("Erro de conexão. Verifique sua internet.");
        return;
      }
    } catch (error) { 
      toast.error("Erro ao processar agendamento"); 
      console.error("Erro crítico:", error);
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
        <h2 className="text-2xl font-bold">{`${publicTerminology.appointment} Confirmado!`}</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Seu {publicTerminology.appointment.toLowerCase()} foi realizado com sucesso. Em breve você receberá a confirmação.
        </p>
        <Button onClick={() => window.location.reload()}>
          {`Fazer novo ${publicTerminology.appointment.toLowerCase()}`}
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
          
          {user && step > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {profile?.nome || user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUser(null);
                  setProfile(null);
                  setStep(0);
                  toast.success("Logout realizado");
                }}
              >
                Sair
              </Button>
            </div>
          )}
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

      {/* TELA INICIAL DE LOGIN/CADASTRO */}
      {step === 0 && (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {isLogin ? "Entrar na Conta" : "Criar Conta"}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? "Acesse sua conta para agendar" 
                : "Cadastre-se para começar a agendar"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base font-semibold"
              onClick={handleGoogleLogin}
              disabled={authLoading}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuar com Google
            </Button>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">
                ou
              </span>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nome"
                      type="text"
                      placeholder="Seu nome"
                      value={authData.nome}
                      onChange={(e) => setAuthData(prev => ({ ...prev, nome: e.target.value }))}
                      className="pl-10"
                      required={!isLogin}
                      disabled={authLoading}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={authData.email}
                    onChange={(e) => setAuthData(prev => ({ ...prev, email: e.target.value }))}
                    className="pl-10"
                    required
                    disabled={authLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={authData.password}
                    onChange={(e) => setAuthData(prev => ({ ...prev, password: e.target.value }))}
                    className="pl-10"
                    required
                    disabled={authLoading}
                    minLength={6}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={authLoading}
              >
                {authLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isLogin ? "Entrando..." : "Criando conta..."}
                  </>
                ) : (
                  <>{isLogin ? "Entrar" : "Criar Conta"}</>
                )}
              </Button>
            </form>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm"
                disabled={authLoading}
              >
                {isLogin 
                  ? "Não tem conta? Cadastre-se" 
                  : "Já tem conta? Faça login"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>{publicTerminology.selectService}</CardTitle>
            <CardDescription>{publicTerminology.selectService}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {servicos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum serviço disponível no momento</p>
              </div>
            ) : (
              servicos.map((servico) => (
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
              ))
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>{publicTerminology.selectProfessional}</CardTitle>
            <CardDescription>{publicTerminology.selectProfessional}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {barbeiros.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum profissional disponível no momento</p>
              </div>
            ) : (
              barbeiros.map((barbeiro) => (
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
              ))
            )}
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
              <CardTitle>{`Confirmar ${publicTerminology.appointment}`}</CardTitle>
            <CardDescription>Revise os dados antes de confirmar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{publicTerminology.client}</p>
                  <p className="font-medium">{profile?.nome || user?.user_metadata?.nome || "Cliente"}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Check className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{publicTerminology.service}</p>
                  <p className="font-medium">
                    {servicos.find(s => s.id === selectedServico)?.nome}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">{publicTerminology.professional}</p>
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
}

export default PublicBooking;

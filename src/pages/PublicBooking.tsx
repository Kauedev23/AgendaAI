import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Scissors, MapPin, Phone, Check } from "lucide-react";
import { toast } from "sonner";
import { format, addDays, parse } from "date-fns";
import { ptBR } from "date-fns/locale";

const PublicBooking = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [barbearia, setBarbearia] = useState<any>(null);
  const [barbeiros, setBarbeiros] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [selectedBarbeiro, setSelectedBarbeiro] = useState<string>("");
  const [selectedServico, setSelectedServico] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [clientData, setClientData] = useState({
    nome: "",
    email: "",
    telefone: "",
    observacoes: ""
  });
  const [step, setStep] = useState(1);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    loadBarbearia();
  }, [slug]);

  useEffect(() => {
    if (selectedBarbeiro && selectedDate) {
      loadAvailableTimes();
    }
  }, [selectedBarbeiro, selectedDate]);

  // Aplicar cores personalizadas da barbearia
  useEffect(() => {
    if (barbearia?.cor_primaria && barbearia?.cor_secundaria) {
      // Converter hex para HSL
      const hexToHSL = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return null;
        
        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0, l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }

        return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
      };

      const primaryHSL = hexToHSL(barbearia.cor_primaria);
      const secondaryHSL = hexToHSL(barbearia.cor_secundaria);

      if (primaryHSL && secondaryHSL) {
        document.documentElement.style.setProperty('--primary', primaryHSL);
        document.documentElement.style.setProperty('--secondary', secondaryHSL);
        document.documentElement.style.setProperty('--accent', secondaryHSL);
      }
    }

    return () => {
      // Resetar para as cores padrão ao sair
      document.documentElement.style.setProperty('--primary', '221 39% 11%');
      document.documentElement.style.setProperty('--secondary', '0 84% 60%');
      document.documentElement.style.setProperty('--accent', '0 84% 60%');
    };
  }, [barbearia]);

  const loadBarbearia = async () => {
    try {
      const { data: barbeariasData } = await supabase
        .from("barbearias")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!barbeariasData) {
        toast.error("Barbearia não encontrada");
        return;
      }

      setBarbearia(barbeariasData);

      // Usar a função pública segura para buscar barbeiros
      const { data: barbeirosData, error: barbeirosError } = await supabase
        .rpc('get_public_barbers', { _slug: slug });

      if (barbeirosError) {
        console.error("Erro ao buscar barbeiros:", barbeirosError);
        toast.error("Erro ao carregar barbeiros");
      }

      // Mapear dados para o formato esperado
      const barbeirosFormatted = (barbeirosData || []).map((b: any) => ({
        id: b.id,
        bio: b.bio,
        especialidades: b.especialidades,
        foto_url: b.foto_url,
        profiles: { nome: b.nome }
      }));

      setBarbeiros(barbeirosFormatted);

      const { data: servicosData } = await supabase
        .from("servicos")
        .select("*")
        .eq("barbearia_id", barbeariasData.id)
        .eq("ativo", true);

      setServicos(servicosData || []);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTimes = async () => {
    if (!barbearia || !selectedDate) return;

    const start = barbearia.horario_abertura || "09:00";
    const end = barbearia.horario_fechamento || "19:00";
    
    const times: string[] = [];
    let current = parse(start, "HH:mm", new Date());
    const endTime = parse(end, "HH:mm", new Date());

    while (current < endTime) {
      times.push(format(current, "HH:mm"));
      current = new Date(current.getTime() + 30 * 60000); // +30 min
    }

      // Buscar horários já ocupados
      const { data: agendamentos } = await supabase
        .from("agendamentos")
        .select("hora, servico_id")
        .eq("barbeiro_id", selectedBarbeiro)
        .eq("data", selectedDate)
        .in("status", ["pendente", "confirmado"]);

      // Mapear horários ocupados considerando duração do serviço
      const occupiedSlots = new Set<string>();
      
      if (agendamentos) {
        for (const ag of agendamentos) {
          const { data: servico } = await supabase
            .from("servicos")
            .select("duracao")
            .eq("id", ag.servico_id)
            .single();
          
          if (servico) {
            const startTime = parse(ag.hora, "HH:mm", new Date());
            const slots = Math.ceil(servico.duracao / 30); // quantos blocos de 30min
            
            for (let i = 0; i < slots; i++) {
              const blockedTime = new Date(startTime.getTime() + i * 30 * 60000);
              occupiedSlots.add(format(blockedTime, "HH:mm"));
            }
          }
        }
      }

      const available = times.filter(time => !occupiedSlots.has(time));
      setAvailableTimes(available);
  };

  const handleBooking = async () => {
    if (!clientData.nome || !clientData.email) {
      toast.error("Preencha nome e email");
      return;
    }

    try {
      // Criar ou buscar cliente
      let clienteId = null;
      const { data: existingClient } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", clientData.email)
        .maybeSingle();

      if (existingClient) {
        clienteId = existingClient.id;
      } else {
        // Criar novo usuário cliente
        const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: clientData.email,
          password: tempPassword,
          options: {
            data: {
              nome: clientData.nome,
              tipo: "cliente"
            },
            emailRedirectTo: `${window.location.origin}/`
          }
        });

        if (authError) {
          console.error("Auth error:", authError);
          // Se usuário já existe, buscar ID
          const { data: userData } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", clientData.email)
            .maybeSingle();
          clienteId = userData?.id;
        } else {
          clienteId = authData.user?.id;
        }
      }

      if (!clienteId) {
        toast.error("Erro ao processar cliente");
        return;
      }

      // Atualizar telefone se fornecido
      if (clientData.telefone) {
        await supabase
          .from("profiles")
          .update({ telefone: clientData.telefone })
          .eq("id", clienteId);
      }

      // Criar agendamento
      const { error } = await supabase.from("agendamentos").insert([{
        barbearia_id: barbearia.id,
        barbeiro_id: selectedBarbeiro,
        servico_id: selectedServico,
        cliente_id: clienteId,
        data: selectedDate,
        hora: selectedTime,
        observacoes: clientData.observacoes || null,
        status: "pendente"
      }]);

      if (error) throw error;

      setBookingSuccess(true);
      toast.success("Agendamento realizado com sucesso!");
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao realizar agendamento");
    }
  };

  const getNext7Days = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(new Date(), i));
    }
    return days;
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

  if (!barbearia) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Barbearia não encontrada</p>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">Agendamento Confirmado!</h2>
            <p className="text-muted-foreground mb-6">
              Enviamos um email de confirmação com todos os detalhes do seu agendamento.
            </p>
            <div className="bg-muted p-4 rounded-lg text-left space-y-2">
              <p><strong>Data:</strong> {format(new Date(selectedDate + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}</p>
              <p><strong>Horário:</strong> {selectedTime}</p>
              <p><strong>Serviço:</strong> {servicos.find(s => s.id === selectedServico)?.nome}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <Scissors className="h-10 w-10 text-secondary" />
            <div>
              <h1 className="text-3xl font-bold text-primary">{barbearia.nome}</h1>
              <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                {barbearia.endereco && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {barbearia.endereco}
                  </span>
                )}
                {barbearia.telefone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {barbearia.telefone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        {/* Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-secondary text-white' : 'bg-muted'}`}>1</div>
              <span className="hidden sm:inline">Serviço</span>
            </div>
            <div className="w-12 h-0.5 bg-border" />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-secondary text-white' : 'bg-muted'}`}>2</div>
              <span className="hidden sm:inline">Data/Hora</span>
            </div>
            <div className="w-12 h-0.5 bg-border" />
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-secondary text-white' : 'bg-muted'}`}>3</div>
              <span className="hidden sm:inline">Seus Dados</span>
            </div>
          </div>
        </div>

        {/* Step 1: Escolher Barbeiro e Serviço */}
        {step === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Escolha o Barbeiro</CardTitle>
              </CardHeader>
              <CardContent>
                {barbeiros.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Scissors className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum barbeiro disponível no momento</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {barbeiros.map(barbeiro => (
                      <Card
                        key={barbeiro.id}
                        className={`cursor-pointer transition-all border-2 hover:shadow-md ${
                          selectedBarbeiro === barbeiro.id 
                            ? 'ring-2 ring-secondary border-secondary bg-secondary/5' 
                            : 'border-border hover:border-secondary/50'
                        }`}
                        onClick={() => setSelectedBarbeiro(barbeiro.id)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                              <Scissors className="h-5 w-5 text-secondary" />
                            </div>
                            <p className="font-semibold text-lg text-primary">
                              {barbeiro.profiles?.nome || 'Barbeiro'}
                            </p>
                          </div>
                          {barbeiro.bio && (
                            <p className="text-sm text-muted-foreground mt-2">{barbeiro.bio}</p>
                          )}
                          {barbeiro.especialidades && barbeiro.especialidades.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {barbeiro.especialidades.map((esp: string, idx: number) => (
                                <span key={idx} className="text-xs bg-muted px-2 py-1 rounded-full">
                                  {esp}
                                </span>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Escolha o Serviço</CardTitle>
              </CardHeader>
              <CardContent>
                {servicos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Scissors className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum serviço disponível no momento</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {servicos.map(servico => (
                      <Card
                        key={servico.id}
                        className={`cursor-pointer transition-all border-2 hover:shadow-md ${
                          selectedServico === servico.id 
                            ? 'ring-2 ring-secondary border-secondary bg-secondary/5' 
                            : 'border-border hover:border-secondary/50'
                        }`}
                        onClick={() => setSelectedServico(servico.id)}
                      >
                        <CardContent className="pt-6">
                          <p className="font-semibold text-lg text-primary mb-2">{servico.nome}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-secondary font-bold text-xl">R$ {servico.preco.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {servico.duracao} min
                            </p>
                          </div>
                          {servico.descricao && (
                            <p className="text-sm text-muted-foreground mt-2">{servico.descricao}</p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              onClick={() => setStep(2)}
              disabled={!selectedBarbeiro || !selectedServico}
              className="w-full"
              size="lg"
            >
              Continuar
            </Button>
          </div>
        )}

        {/* Step 2: Escolher Data e Horário */}
        {step === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Escolha a Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {getNext7Days().map(day => (
                    <Button
                      key={day.toISOString()}
                      variant={selectedDate === format(day, "yyyy-MM-dd") ? "default" : "outline"}
                      onClick={() => setSelectedDate(format(day, "yyyy-MM-dd"))}
                      className="flex flex-col h-auto py-3"
                    >
                      <span className="text-xs">{format(day, "EEE", { locale: ptBR })}</span>
                      <span className="text-lg font-bold">{format(day, "dd")}</span>
                      <span className="text-xs">{format(day, "MMM", { locale: ptBR })}</span>
                    </Button>
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
                  {availableTimes.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum horário disponível para esta data
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                      {availableTimes.map(time => (
                        <Button
                          key={time}
                          variant={selectedTime === time ? "default" : "outline"}
                          onClick={() => setSelectedTime(time)}
                        >
                          {time}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!selectedDate || !selectedTime}
                className="flex-1"
                size="lg"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Dados do Cliente */}
        {step === 3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Seus Dados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo *</Label>
                  <Input
                    id="nome"
                    value={clientData.nome}
                    onChange={(e) => setClientData({ ...clientData, nome: e.target.value })}
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={clientData.email}
                    onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={clientData.telefone}
                    onChange={(e) => setClientData({ ...clientData, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="obs">Observações</Label>
                  <Textarea
                    id="obs"
                    value={clientData.observacoes}
                    onChange={(e) => setClientData({ ...clientData, observacoes: e.target.value })}
                    placeholder="Alguma preferência ou observação?"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={handleBooking}
                className="flex-1"
                size="lg"
              >
                Confirmar Agendamento
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicBooking;

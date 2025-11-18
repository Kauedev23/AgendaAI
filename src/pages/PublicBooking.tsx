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
      if (telefone.replace(/\D/g, "").length < 10) { toast.error("Por favor, insira um telefone válido"); setPhoneLoading(false); return; }
      const { data: existingProfile } = await supabase.from("profiles").select("*").eq("telefone", telefone).eq("tipo", "cliente").maybeSingle();
      if (existingProfile) {
        const emailFromPhone = `${telefone.replace(/\D/g, "")}@cliente.app`;
        const { error: signInError, data: authData } = await supabase.auth.signInWithPassword({ email: emailFromPhone, password: telefone.replace(/\D/g, "") });
        if (signInError) { toast.error("Erro ao fazer login"); setPhoneLoading(false); return; }
        setUser(authData.user); setProfile(existingProfile); setClienteName(existingProfile.nome);
        toast.success(`Bem-vindo de volta, ${existingProfile.nome}!`); setStep(1);
      } else { setShowNameInput(true); }
    } catch (error) { toast.error("Erro ao processar telefone"); } finally { setPhoneLoading(false); }
  };

  const handleQuickRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneLoading(true);
    try {
      if (!clienteName.trim() || clienteName.trim().length < 3) { toast.error("Por favor, insira seu nome completo"); setPhoneLoading(false); return; }
      const emailFromPhone = `${telefone.replace(/\D/g, "")}@cliente.app`;
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ email: emailFromPhone, password: telefone.replace(/\D/g, ""), options: { data: { nome: clienteName, telefone, tipo: "cliente" }, emailRedirectTo: `${window.location.origin}/` } });
      if (signUpError || !authData.user) { toast.error("Erro ao criar conta"); setPhoneLoading(false); return; }
      await supabase.from("profiles").update({ nome: clienteName, telefone }).eq("id", authData.user.id);
      setUser(authData.user); setProfile({ id: authData.user.id, nome: clienteName, telefone, email: emailFromPhone });
      toast.success("Conta criada com sucesso!"); setStep(1);
    } catch (error) { toast.error("Erro ao criar conta"); } finally { setPhoneLoading(false); }
  };

  const loadBarbearia = async () => {
    try {
      const { data: barbeariasData } = await supabase.from("barbearias").select("*").eq("slug", slug).maybeSingle();
      if (!barbeariasData) { toast.error("Negócio não encontrado"); setLoading(false); return; }
      setBarbearia(barbeariasData);
      const { data: publicBarbers } = await supabase.rpc("get_public_barbers", { _slug: String(slug) });
      setBarbeiros(publicBarbers || []);
      const { data: servicosData } = await supabase.from("servicos").select("*").eq("barbearia_id", barbeariasData.id).eq("ativo", true).order("preco", { ascending: true });
      setServicos(servicosData || []);
      setLoading(false);
    } catch (error) { toast.error("Erro ao carregar dados"); setLoading(false); }
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
    try {
      const validation = bookingSchema.safeParse({ observacoes });
      if (!validation.success) { toast.error("Observações muito longas"); return; }
      setSubmitting(true);
      const payload = { barbeariaId: barbearia.id, barbeiroId: selectedBarbeiro, servicoId: selectedServico, date: selectedDate, time: selectedTime, nome: clienteName, email: `${telefone.replace(/\D/g, "")}@cliente.app`, telefone, observacoes: observacoes || null };
      const { data, error } = await supabase.functions.invoke("public-booking", { body: payload });
      if (error || data?.error) { toast.error("Erro ao criar agendamento"); return; }
      toast.success("Agendamento realizado com sucesso!"); setBookingSuccess(true);
    } catch (error) { toast.error("Erro ao processar agendamento"); } finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!barbearia) return <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4"><p>Negócio não encontrado</p><Button onClick={() => navigate("/")}>Voltar</Button></div>;
  if (bookingSuccess) return <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4"><CheckCircle2 className="h-16 w-16 text-green-500" /><h2 className="text-2xl font-bold">Agendamento Confirmado!</h2></div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" size="icon" onClick={() => step === 0 ? navigate("/") : setStep(step - 1)}><ArrowLeft /></Button>
        {step === 0 && (
          <Card className="max-w-md mx-auto mt-6">
            <CardHeader><CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" />Identificação</CardTitle></CardHeader>
            <CardContent>
              {!showNameInput ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div><Label>Telefone</Label><Input type="tel" placeholder="(11) 98765-4321" value={telefone} onChange={(e) => setTelefone(formatPhone(e.target.value))} maxLength={16} required /></div>
                  <Button type="submit" className="w-full" disabled={phoneLoading}>{phoneLoading ? "Verificando..." : "Continuar"}</Button>
                </form>
              ) : (
                <form onSubmit={handleQuickRegister} className="space-y-4">
                  <div><Label>Telefone</Label><Input type="tel" value={telefone} disabled /></div>
                  <div><Label>Nome Completo</Label><Input type="text" value={clienteName} onChange={(e) => setClienteName(e.target.value)} required minLength={3} /></div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => { setShowNameInput(false); setClienteName(""); }} className="flex-1">Voltar</Button>
                    <Button type="submit" className="flex-1" disabled={phoneLoading}>Criar Conta</Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PublicBooking;

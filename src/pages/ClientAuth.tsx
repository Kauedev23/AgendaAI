import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Phone, User, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";

// Schema de validação
const phoneAuthSchema = z.object({
  nome: z.string()
    .trim()
    .min(3, "Nome deve ter pelo menos 3 caracteres")
    .max(100, "Nome muito longo"),
  telefone: z.string()
    .trim()
    .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Formato inválido. Use: (11) 98765-4321")
    .min(14, "Telefone inválido")
    .max(16, "Telefone inválido"),
});

const ClientAuth = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "profile">("phone");
  const [telefone, setTelefone] = useState("");
  const [clientData, setClientData] = useState({
    nome: "",
    foto_url: "",
  });
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/";

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 10) 
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar telefone
      const validation = z.string().trim().min(14).safeParse(telefone);
      if (!validation.success) {
        toast.error("Por favor, insira um telefone válido");
        setLoading(false);
        return;
      }

      // Verificar se já existe usuário com este telefone
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("telefone", telefone)
        .eq("tipo", "cliente")
        .maybeSingle();

      if (existingProfile) {
        // Cliente já existe - fazer login automático
        const emailFromPhone = `${telefone.replace(/\D/g, "")}@cliente.app`;
        
        try {
          // Tentar fazer login
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: emailFromPhone,
            password: telefone.replace(/\D/g, ""),
          });

          if (signInError) {
            toast.error("Erro ao fazer login. Tente novamente.");
            console.error(signInError);
            setLoading(false);
            return;
          }

          toast.success(`Bem-vindo de volta, ${existingProfile.nome}!`);
          navigate(from, { replace: true });
        } catch (error: any) {
          toast.error("Erro ao fazer login");
          console.error(error);
        }
      } else {
        // Novo cliente - solicitar informações adicionais
        setStep("profile");
      }
    } catch (error: any) {
      toast.error("Erro ao processar telefone");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar dados
      const validation = phoneAuthSchema.safeParse({
        nome: clientData.nome,
        telefone: telefone,
      });

      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        setLoading(false);
        return;
      }

      // Criar usuário
      const emailFromPhone = `${telefone.replace(/\D/g, "")}@cliente.app`;
      const passwordFromPhone = telefone.replace(/\D/g, "");

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: emailFromPhone,
        password: passwordFromPhone,
        options: {
          data: {
            nome: clientData.nome,
            tipo: "cliente",
            telefone: telefone,
          },
        },
      });

      if (signUpError) {
        // Se o usuário já existe mas não conseguiu logar antes, tentar login
        if (signUpError.message.includes("already registered")) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: emailFromPhone,
            password: passwordFromPhone,
          });

          if (signInError) {
            toast.error("Erro ao fazer login");
            setLoading(false);
            return;
          }
        } else {
          throw signUpError;
        }
      }

      // Atualizar perfil com telefone e foto
      if (authData?.user) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            telefone: telefone,
            avatar_url: clientData.foto_url || null,
          })
          .eq("id", authData.user.id);

        if (updateError) {
          console.error("Erro ao atualizar perfil:", updateError);
        }
      }

      toast.success("Conta criada com sucesso!");
      navigate(from, { replace: true });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione apenas imagens");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setClientData((prev) => ({ ...prev, foto_url: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
            <Calendar className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Agenda AI</h1>
          <p className="text-muted-foreground">Agende seus serviços rapidamente</p>
        </div>

        <Card className="shadow-2xl border-0">
          {step === "phone" ? (
            <>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">Entrar com Telefone</CardTitle>
                <CardDescription>Digite seu telefone para continuar</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefone" className="text-base">
                      Telefone
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="telefone"
                        type="tel"
                        placeholder="(11) 98765-4321"
                        value={telefone}
                        onChange={(e) => setTelefone(formatPhone(e.target.value))}
                        className="pl-10 h-12 text-base"
                        maxLength={16}
                        required
                        disabled={loading}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Usaremos seu telefone para identificação rápida
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold gradient-primary"
                    disabled={loading || telefone.length < 14}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      <>
                        Continuar
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="text-center pb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setStep("phone")}
                  className="absolute left-4 top-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <CardTitle className="text-2xl">Complete seu Perfil</CardTitle>
                <CardDescription>Algumas informações sobre você</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Upload de Foto */}
                  <div className="flex flex-col items-center gap-4">
                    <Avatar className="h-24 w-24 border-4 border-primary/20">
                      {clientData.foto_url ? (
                        <AvatarImage src={clientData.foto_url} alt="Foto" />
                      ) : (
                        <AvatarFallback className="bg-primary/10">
                          <User className="h-12 w-12 text-primary" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="foto-input"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById("foto-input")?.click()}
                      >
                        Adicionar Foto (Opcional)
                      </Button>
                    </div>
                  </div>

                  {/* Nome */}
                  <div className="space-y-2">
                    <Label htmlFor="nome" className="text-base">
                      Nome Completo *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="nome"
                        type="text"
                        placeholder="Seu nome"
                        value={clientData.nome}
                        onChange={(e) =>
                          setClientData((prev) => ({ ...prev, nome: e.target.value }))
                        }
                        className="pl-10 h-12 text-base"
                        required
                        maxLength={100}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <Phone className="inline h-4 w-4 mr-1" />
                      Telefone: <span className="font-medium text-foreground">{telefone}</span>
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold gradient-primary"
                    disabled={loading || !clientData.nome.trim()}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      <>
                        Finalizar Cadastro
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
        </p>
      </div>
    </div>
  );
};

export default ClientAuth;

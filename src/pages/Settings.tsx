import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Upload, Home, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useTerminology } from "@/context/BusinessTerminologyProvider";

const Settings = () => {
  const navigate = useNavigate();
  const { isChecking } = useSubscriptionStatus();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [barbearia, setBarbearia] = useState<any>(null);
  const { terminology } = useTerminology();
  const [formData, setFormData] = useState({
    nome: "",
    slug: "",
    telefone: "",
    endereco: "",
    descricao: "",
    instagram: "",
    facebook: "",
    cor_primaria: "#1a1f3a",
    cor_secundaria: "#dc2626",
    horario_abertura: "09:00",
    horario_fechamento: "19:00",
    dias_funcionamento: ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
    tipo_comercio: "barbearia"
  });

  const loadBarbearia = async () => {
    // ...function body unchanged...
  };

  useEffect(() => {
    const fetchBarbearia = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Verificar perfil e permitir onboarding se não for admin ainda
        const { data: profileData } = await supabase
          .from("profiles")
          .select("tipo")
          .eq("id", user.id)
          .single();

        // Verificar se já existe barbearia do usuário
        const { data: existingBarbearia } = await supabase
          .from("barbearias")
          .select("id")
          .eq("admin_id", user.id)
          .maybeSingle();

        if (profileData?.tipo !== 'admin' && existingBarbearia) {
          toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
          navigate("/");
          return;
        }

        const { data, error } = await supabase
          .from("barbearias")
          .select("*")
          .eq("admin_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.error("Erro ao carregar barbearia:", error);
          toast.error("Erro ao carregar dados");
        }

        if (data) {
          setBarbearia(data);
          setFormData({
            nome: data.nome || "",
            slug: data.slug || "",
            telefone: data.telefone || "",
            endereco: data.endereco || "",
            descricao: (data as any).descricao || "",
            instagram: (data as any).instagram || "",
            facebook: (data as any).facebook || "",
            cor_primaria: data.cor_primaria || "#1a1f3a",
            cor_secundaria: data.cor_secundaria || "#dc2626",
            horario_abertura: data.horario_abertura || "09:00",
            horario_fechamento: data.horario_fechamento || "19:00",
            dias_funcionamento: data.dias_funcionamento || ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"],
            tipo_comercio: (data as any).tipo_comercio || "barbearia"
          });
        }
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBarbearia();
    // eslint-disable-next-line
  }, []);

  const handleSave = async () => {
    if (!formData.nome || !formData.slug) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Verificar se o slug já existe (excluindo a barbearia atual se estiver editando)
      const { data: existingSlug } = await supabase
        .from("barbearias")
        .select("id")
        .eq("slug", formData.slug)
        .maybeSingle();

      if (existingSlug && (!barbearia || existingSlug.id !== barbearia.id)) {
        toast.error("Este slug já está sendo usado por outro negócio. Escolha um slug único.");
        setSaving(false);
        return;
      }

      const dataToSave = {
        ...formData,
        admin_id: user.id
      };

      if (barbearia) {
        const { error } = await supabase
          .from("barbearias")
          .update(dataToSave)
          .eq("id", barbearia.id);

        if (error) throw error;
        toast.success("Configurações atualizadas!");
        // Notify terminology provider to refresh immediately
        try {
          window.dispatchEvent(new CustomEvent('business:updated', { detail: { tipo_comercio: dataToSave.tipo_comercio } }));
        } catch (err) {
          console.error('Erro ao disparar evento business:updated', err);
        }
      } else {
        const { data: newBarbearia, error } = await supabase
          .from("barbearias")
          .insert([dataToSave])
          .select()
          .single();

        if (error) throw error;

        // Promover usuário a admin ao criar a barbearia
        await supabase
          .from("profiles")
          .update({ tipo: "admin" })
          .eq("id", user.id);

        // Criar serviços padrão baseados no tipo de comércio
        if (newBarbearia) {
          const { getDefaultServices } = await import("@/utils/defaultServices");
          const defaultServices = getDefaultServices(formData.tipo_comercio);
          
          const servicosToInsert = defaultServices.map(servico => ({
            ...servico,
            barbearia_id: newBarbearia.id,
            ativo: true
          }));

          await supabase
            .from("servicos")
            .insert(servicosToInsert);
        }

        toast.success("Negócio criado com sucesso! Serviços padrão foram adicionados.");
        // Notify terminology provider for new business
        try {
          window.dispatchEvent(new CustomEvent('business:updated', { detail: { tipo_comercio: dataToSave.tipo_comercio } }));
        } catch (err) {
          console.error('Erro ao disparar evento business:updated', err);
        }
      }

      // Recarregar dados após salvar
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const diasSemana = [
    { value: "domingo", label: "Domingo" },
    { value: "segunda", label: "Segunda" },
    { value: "terca", label: "Terça" },
    { value: "quarta", label: "Quarta" },
    { value: "quinta", label: "Quinta" },
    { value: "sexta", label: "Sexta" },
    { value: "sabado", label: "Sábado" }
  ];

  const toggleDia = (dia: string) => {
    setFormData(prev => ({
      ...prev,
      dias_funcionamento: prev.dias_funcionamento.includes(dia)
        ? prev.dias_funcionamento.filter(d => d !== dia)
        : [...prev.dias_funcionamento, dia]
    }));
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
            Configurações do {terminology.business}
          </h1>
          
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Logout realizado com sucesso!");
              navigate("/");
            }}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </header>

        <div className="grid gap-6 max-w-4xl">
          <Card>
              <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Dados principais do {terminology.business.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo_comercio">Tipo de Comércio *</Label>
                <select
                  id="tipo_comercio"
                  value={formData.tipo_comercio}
                  onChange={(e) => setFormData({ ...formData, tipo_comercio: e.target.value })}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md"
                >
                  <option value="barbearia">Barbearia</option>
                  <option value="salao">Salão de Beleza</option>
                  <option value="tatuagem">Estúdio de Tatuagem</option>
                  <option value="spa">Massoterapia / Spa</option>
                  <option value="estetica">Clínica Estética</option>
                  <option value="consultorio">Consultório</option>
                  <option value="personal">Personal Trainer</option>
                  <option value="oficina">Oficina / Serviços Especializados</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Negócio *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Studio Premium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL Única) *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="Ex: studio-premium-123"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sua página: /{formData.slug || "seu-slug"}
                  </p>
                  <p className="text-xs text-orange-600">
                    ⚠️ O slug deve ser único - não pode estar sendo usado por outro negócio
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone}
                    onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, número, bairro"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Conte um pouco sobre seu negócio..."
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="@seunegocio"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="facebook.com/seunegocio"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Horário de Funcionamento</CardTitle>
              <CardDescription>Defina os horários e dias de atendimento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="abertura">Horário de Abertura</Label>
                  <Input
                    id="abertura"
                    type="time"
                    value={formData.horario_abertura}
                    onChange={(e) => setFormData({ ...formData, horario_abertura: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechamento">Horário de Fechamento</Label>
                  <Input
                    id="fechamento"
                    type="time"
                    value={formData.horario_fechamento}
                    onChange={(e) => setFormData({ ...formData, horario_fechamento: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dias de Funcionamento</Label>
                <div className="flex flex-wrap gap-2">
                  {diasSemana.map(dia => (
                    <Button
                      key={dia.value}
                      type="button"
                      variant={formData.dias_funcionamento.includes(dia.value) ? "default" : "outline"}
                      onClick={() => toggleDia(dia.value)}
                      className="flex-1 min-w-[100px]"
                    >
                      {dia.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personalização Visual</CardTitle>
              <CardDescription>Escolha as cores do tema do seu negócio</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cor_primaria">Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cor_primaria"
                      type="color"
                      value={formData.cor_primaria}
                      onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.cor_primaria}
                      onChange={(e) => setFormData({ ...formData, cor_primaria: e.target.value })}
                      placeholder="#1a1f3a"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cor_secundaria">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cor_secundaria"
                      type="color"
                      value={formData.cor_secundaria}
                      onChange={(e) => setFormData({ ...formData, cor_secundaria: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={formData.cor_secundaria}
                      onChange={(e) => setFormData({ ...formData, cor_secundaria: e.target.value })}
                      placeholder="#dc2626"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col md:flex-row gap-4">
            <Button onClick={handleSave} disabled={saving} size="lg" className="flex-1 md:flex-none">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Salvando..." : "Salvar Configurações"}
            </Button>
            
            {barbearia && formData.slug && (
              <Card className="flex-1">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                        <Label className="text-sm font-medium">Link Público para {terminology.appointments}</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={`${window.location.origin}/${formData.slug}`} 
                        readOnly 
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/${formData.slug}`);
                          toast.success("Link copiado!");
                        }}
                        variant="secondary"
                      >
                        Copiar Link
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Compartilhe este link com seus {terminology.clients.toLowerCase()} para que eles possam agendar {terminology.appointments.toLowerCase()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;

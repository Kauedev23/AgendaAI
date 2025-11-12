import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Upload } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [barbearia, setBarbearia] = useState<any>(null);
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
    dias_funcionamento: ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"]
  });

  useEffect(() => {
    loadBarbearia();
  }, []);

  const loadBarbearia = async () => {
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
          dias_funcionamento: data.dias_funcionamento || ["segunda", "terca", "quarta", "quinta", "sexta", "sabado"]
        });
      }
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.slug) {
      toast.error("Nome e slug são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
      } else {
        const { error } = await supabase
          .from("barbearias")
          .insert([dataToSave]);

        if (error) throw error;

        // Promover usuário a admin ao criar a barbearia
        await supabase
          .from("profiles")
          .update({ tipo: "admin" })
          .eq("id", user.id);

        toast.success("Barbearia criada com sucesso!");
      }

      loadBarbearia();
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
          <h1 className="text-3xl font-bold text-primary mb-2">Configurações da Barbearia</h1>
          <p className="text-muted-foreground">Configure os dados e aparência da sua barbearia</p>
        </div>

        <div className="grid gap-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Dados principais da barbearia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Barbearia *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Barbearia do João"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug (URL Única) *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="Ex: barbearia-joao"
                  />
                  <p className="text-xs text-muted-foreground">
                    Sua página: /barbearia/{formData.slug || "seu-slug"}
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
                  placeholder="Conte um pouco sobre sua barbearia..."
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
                    placeholder="@suabarbearia"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input
                    id="facebook"
                    value={formData.facebook}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="facebook.com/suabarbearia"
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
              <CardDescription>Escolha as cores do tema da sua barbearia</CardDescription>
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
                    <Label className="text-sm font-medium">Link Público para Agendamento</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={`${window.location.origin}/barbearia/${formData.slug}`} 
                        readOnly 
                        className="flex-1"
                      />
                      <Button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/barbearia/${formData.slug}`);
                          toast.success("Link copiado!");
                        }}
                        variant="secondary"
                      >
                        Copiar Link
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Compartilhe este link com seus clientes para que eles possam agendar horários
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

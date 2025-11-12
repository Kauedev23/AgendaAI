import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Scissors, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

const Barbers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [barbeiros, setBarbeiros] = useState<any[]>([]);
  const [barbearia, setBarbearia] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBarbeiro, setEditingBarbeiro] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    bio: "",
    especialidades: [] as string[]
  });

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

      // Verificar se é admin
      const { data: profileData } = await supabase
        .from("profiles")
        .select("tipo")
        .eq("id", user.id)
        .single();

      if (profileData?.tipo !== 'admin') {
        toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
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

      const { data: barbeirosData } = await supabase
        .from("barbeiros")
        .select(`
          *,
          profiles:user_id (nome, email, telefone)
        `)
        .eq("barbearia_id", barbeariasData.id)
        .order("created_at", { ascending: false });

      setBarbeiros(barbeirosData || []);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.email) {
      toast.error("Nome e email são obrigatórios");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Email inválido");
      return;
    }

    try {
      setLoading(true);

      if (editingBarbeiro) {
        // Atualizar barbeiro existente
        const updateData: any = {
          bio: formData.bio || null,
          especialidades: formData.especialidades.length > 0 ? formData.especialidades : null
        };

        const { error } = await supabase
          .from("barbeiros")
          .update(updateData)
          .eq("id", editingBarbeiro.id);

        if (error) throw error;

        // Atualizar profile se houver telefone
        if (formData.telefone) {
          await supabase
            .from("profiles")
            .update({ telefone: formData.telefone })
            .eq("id", editingBarbeiro.user_id);
        }

        toast.success("Barbeiro atualizado!");
      } else {
        // Criar novo barbeiro usando Edge Function
        const { data, error } = await supabase.functions.invoke('create-barber-user', {
          body: {
            email: formData.email,
            nome: formData.nome,
            telefone: formData.telefone,
            barbearia_id: barbearia.id,
            bio: formData.bio,
            especialidades: formData.especialidades.length > 0 ? formData.especialidades : null
          }
        });

        if (error) {
          console.error('Erro ao criar barbeiro:', error);
          throw new Error(error.message || 'Erro ao criar barbeiro');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        toast.success(`Barbeiro cadastrado! Senha temporária: ${data.temp_password}`, {
          duration: 10000
        });
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error(error.message || "Erro ao salvar barbeiro");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este barbeiro?")) return;

    try {
      const { error } = await supabase
        .from("barbeiros")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Barbeiro removido");
      loadData();
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao remover barbeiro");
    }
  };

  const handleEdit = (barbeiro: any) => {
    setEditingBarbeiro(barbeiro);
    setFormData({
      nome: barbeiro.profiles?.nome || "",
      email: barbeiro.profiles?.email || "",
      telefone: barbeiro.profiles?.telefone || "",
      bio: barbeiro.bio || "",
      especialidades: barbeiro.especialidades || []
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      telefone: "",
      bio: "",
      especialidades: []
    });
    setEditingBarbeiro(null);
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

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Gestão de Barbeiros</h1>
            <p className="text-muted-foreground">Gerencie sua equipe de profissionais</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Barbeiro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingBarbeiro ? "Editar Barbeiro" : "Novo Barbeiro"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    disabled={!!editingBarbeiro}
                  />
                </div>
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
                  <Label htmlFor="bio">Biografia</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Conte um pouco sobre o barbeiro..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleSave} className="w-full">
                  {editingBarbeiro ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {barbeiros.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Scissors className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum barbeiro cadastrado ainda.<br />
                Clique em "Adicionar Barbeiro" para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {barbeiros.map((barbeiro) => (
              <Card key={barbeiro.id} className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">{barbeiro.profiles?.nome}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(barbeiro)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(barbeiro.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{barbeiro.profiles?.email}</p>
                  {barbeiro.profiles?.telefone && (
                    <p className="text-sm text-muted-foreground mb-2">{barbeiro.profiles.telefone}</p>
                  )}
                  {barbeiro.bio && (
                    <p className="text-sm mt-3">{barbeiro.bio}</p>
                  )}
                  <div className="mt-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${barbeiro.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {barbeiro.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Barbers;

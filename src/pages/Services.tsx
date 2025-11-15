import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Scissors, Trash2, Edit, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

const Services = () => {
  const navigate = useNavigate();
  const { isChecking } = useSubscriptionStatus();
  const [loading, setLoading] = useState(true);
  const [servicos, setServicos] = useState<any[]>([]);
  const [barbearia, setBarbearia] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServico, setEditingServico] = useState<any>(null);
  const [formData, setFormData] = useState({
    nome: "",
    preco: "",
    duracao: "",
    descricao: ""
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

      const { data: servicosData } = await supabase
        .from("servicos")
        .select("*")
        .eq("barbearia_id", barbeariasData.id)
        .order("created_at", { ascending: false });

      setServicos(servicosData || []);
    } catch (error) {
      console.error("Erro:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.preco || !formData.duracao) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const servicoData = {
        barbearia_id: barbearia.id,
        nome: formData.nome,
        preco: parseFloat(formData.preco),
        duracao: parseInt(formData.duracao),
        descricao: formData.descricao || null,
        ativo: true
      };

      if (editingServico) {
        const { error } = await supabase
          .from("servicos")
          .update(servicoData)
          .eq("id", editingServico.id);

        if (error) throw error;
        toast.success("Serviço atualizado!");
      } else {
        const { error } = await supabase
          .from("servicos")
          .insert([servicoData]);

        if (error) throw error;
        toast.success("Serviço cadastrado!");
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error(error.message || "Erro ao salvar serviço");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este serviço?")) return;

    try {
      const { error } = await supabase
        .from("servicos")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Serviço removido");
      loadData();
    } catch (error: any) {
      console.error("Erro:", error);
      toast.error("Erro ao remover serviço");
    }
  };

  const handleEdit = (servico: any) => {
    setEditingServico(servico);
    setFormData({
      nome: servico.nome,
      preco: servico.preco.toString(),
      duracao: servico.duracao.toString(),
      descricao: servico.descricao || ""
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      preco: "",
      duracao: "",
      descricao: ""
    });
    setEditingServico(null);
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-6 py-8">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Dashboard
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Gestão de Serviços</h1>
            <p className="text-muted-foreground">Gerencie os serviços oferecidos</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Serviço
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingServico ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Serviço *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Corte masculino"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preco">Preço (R$) *</Label>
                    <Input
                      id="preco"
                      type="number"
                      step="0.01"
                      value={formData.preco}
                      onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                      placeholder="50.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duracao">Duração (min) *</Label>
                    <Input
                      id="duracao"
                      type="number"
                      value={formData.duracao}
                      onChange={(e) => setFormData({ ...formData, duracao: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descreva o serviço..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleSave} className="w-full">
                  {editingServico ? "Atualizar" : "Cadastrar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {servicos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Scissors className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                Nenhum serviço cadastrado ainda.<br />
                Clique em "Adicionar Serviço" para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servicos.map((servico) => (
              <Card key={servico.id} className="card-hover">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">{servico.nome}</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(servico)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(servico.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-secondary" />
                      <span className="text-xl font-bold text-secondary">
                        R$ {servico.preco.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{servico.duracao} minutos</span>
                    </div>
                    {servico.descricao && (
                      <p className="text-sm text-muted-foreground mt-3">{servico.descricao}</p>
                    )}
                    <div className="mt-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${servico.ativo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {servico.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
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

export default Services;

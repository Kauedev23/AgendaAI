import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Home, Plus, Loader2 } from "lucide-react";
import { BarbeiroCard } from "@/components/BarbeiroCard";
import { EditarHorarioDialog } from "@/components/EditarHorarioDialog";
import { useTerminology } from "@/context/BusinessTerminologyProvider";
import { ImageUpload } from "@/components/ImageUpload";

interface Barbeiro {
  id: string;
  user_id: string;
  barbearia_id: string;
  ativo: boolean;
  bio: string | null;
  especialidades: string[] | null;
  foto_url: string | null;
  dias_funcionamento: string[];
  horario_inicio: string;
  horario_fim: string;
  profiles: {
    nome: string;
    email: string;
  };
}

interface BarbeiroStats {
  faturamento: number;
  servicos_realizados: number;
  avaliacao_media: number;
  total_avaliacoes: number;
}

export default function Barbers() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [barbeirosStats, setBarbeirosStats] = useState<Map<string, BarbeiroStats>>(new Map());
  const [barbearia, setBarbearia] = useState<Tables<"barbearias"> | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingBarbeiro, setEditingBarbeiro] = useState<Barbeiro | null>(null);
  const [editingHorario, setEditingHorario] = useState<(Barbeiro & { nome: string }) | null>(null);
  const [deleteId, setDeleteId] = useState<string>("");
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    senha: "",
    bio: "",
    especialidades: "",
    foto_url: "",
  });

  const { terminology } = useTerminology();

  const loadData = useCallback(async () => {
    try {
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: barberiaData } = await supabase
        .from("barbearias")
        .select("*")
        .eq("admin_id", user.id)
        .single();

      if (!barberiaData) {
        toast.error(`Configure sua ${terminology.business} primeiro`);
        navigate("/settings");
        return;
      }

      setBarbearia(barberiaData);

      const { data: barbeirosData, error } = await supabase
        .from("barbeiros")
        .select(`
          *,
          profiles:user_id (
            nome,
            email
          )
        `)
        .eq("barbearia_id", barberiaData.id);

      if (error) throw error;

      setBarbeiros(barbeirosData || []);
      
      await loadAllStats(barbeirosData || [], barberiaData.id);
    } catch (error: unknown) {
      console.error("Erro ao carregar dados:", error);
      toast.error(`Erro ao carregar ${terminology.professionals.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [navigate, terminology.business, terminology.professionals]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line
  }, [loadData]);

  const loadAllStats = useCallback(async (barbeiros: Barbeiro[], barbeariaId: string) => {
    const statsMap = new Map<string, BarbeiroStats>();
    
    for (const barbeiro of barbeiros) {
      const stats = await getBarbeiroStats(barbeiro.id, barbeariaId);
      statsMap.set(barbeiro.id, stats);
    }
    
    setBarbeirosStats(statsMap);
  }, []);

  const getBarbeiroStats = async (barbeiroId: string, barbeariaId: string): Promise<BarbeiroStats> => {
    try {
      const { data: agendamentos } = await supabase
        .from("agendamentos")
        .select("id")
        .eq("barbeiro_id", barbeiroId)
        .eq("status", "concluido");

      const agendamentoIds = agendamentos?.map(a => a.id) || [];
      
      let faturamento = 0;
      if (agendamentoIds.length > 0) {
        const { data: transacoes } = await supabase
          .from("transacoes")
          .select("valor")
          .eq("barbearia_id", barbeariaId)
          .in("agendamento_id", agendamentoIds);
        
        faturamento = transacoes?.reduce((sum, t) => sum + Number(t.valor), 0) || 0;
      }

      const { data: avaliacoes } = await supabase
        .from("avaliacoes")
        .select("nota")
        .eq("barbeiro_id", barbeiroId);

      const total_avaliacoes = avaliacoes?.length || 0;
      const avaliacao_media = total_avaliacoes > 0
        ? avaliacoes.reduce((sum, a) => sum + a.nota, 0) / total_avaliacoes
        : 0;

      return {
        faturamento,
        servicos_realizados: agendamentos?.length || 0,
        avaliacao_media,
        total_avaliacoes,
      };
    } catch (error) {
      console.error("Erro ao carregar stats:", error);
      return {
        faturamento: 0,
        servicos_realizados: 0,
        avaliacao_media: 0,
        total_avaliacoes: 0,
      };
    }
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.email) {
      toast.error("Preencha nome e email");
      return;
    }

    if (!editingBarbeiro && !formData.senha) {
      toast.error(`Senha é obrigatória para novos ${terminology.professional.toLowerCase()}`);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Email inválido");
      return;
    }

    try {
      if (editingBarbeiro) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ nome: formData.nome })
          .eq("id", editingBarbeiro.user_id);

        if (profileError) throw profileError;

        const { error: barbeiroError } = await supabase
          .from("barbeiros")
          .update({
            bio: formData.bio || null,
            especialidades: formData.especialidades
              ? formData.especialidades.split(",").map((e) => e.trim())
              : null,
            foto_url: formData.foto_url || null,
          })
          .eq("id", editingBarbeiro.id);

        if (barbeiroError) throw barbeiroError;

        toast.success(`${terminology.professional} atualizado!`);
      } else {
        const { data, error } = await supabase.functions.invoke(
          "create-barber-user",
          {
            body: {
              email: formData.email,
              password: formData.senha,
              nome: formData.nome,
              barbearia_id: barbearia.id,
              bio: formData.bio || null,
              especialidades: formData.especialidades
                ? formData.especialidades.split(",").map((e) => e.trim())
                : null,
              foto_url: formData.foto_url || null,
            },
          }
        );

        if (error) throw error;
        toast.success(`${terminology.professional} criado com sucesso!`);
      }

      setShowDialog(false);
      resetForm();
      loadData();
    } catch (error: unknown) {
      console.error("Erro ao salvar:", error);
      toast.error(error instanceof Error ? error.message : `Erro ao salvar ${terminology.professional.toLowerCase()}`);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("barbeiros")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast.success(`${terminology.professional} removido!`);
      setShowDeleteDialog(false);
      loadData();
    } catch (error: unknown) {
      console.error("Erro ao deletar:", error);
      toast.error(`Erro ao remover ${terminology.professional.toLowerCase()}`);
    }
  };

  const handleEdit = (barbeiro: Barbeiro) => {
    setEditingBarbeiro(barbeiro);
    setFormData({
      nome: barbeiro.profiles.nome,
      email: barbeiro.profiles.email,
      senha: "",
      bio: barbeiro.bio || "",
      especialidades: barbeiro.especialidades?.join(", ") || "",
      foto_url: barbeiro.foto_url || "",
    });
    setShowDialog(true);
  };

  const handleSaveHorario = async (data: {
    dias_funcionamento: string[];
    horario_inicio: string;
    horario_fim: string;
  }) => {
    if (!editingHorario) return;

    const { error } = await supabase
      .from("barbeiros")
      .update(data)
      .eq("id", editingHorario.id);

    if (error) throw error;
    
    await loadData();
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      email: "",
      senha: "",
      bio: "",
      especialidades: "",
      foto_url: "",
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
    <div className="min-h-screen bg-white p-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="gap-2 hover:bg-transparent p-0"
          >
            <Home className="h-6 w-6" />
            <span className="text-lg">Voltar</span>
          </Button>
          
          <h1 className="text-3xl font-bold flex-1">
            Meus {terminology.professionals}
          </h1>
          
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
                <Button className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold px-8 py-6 rounded-full text-base">
                  <Plus className="h-5 w-5 mr-2" />
                  {`Adicionar ${terminology.professional}`}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                   <DialogTitle>{editingBarbeiro ? `Editar ${terminology.professional}` : `Novo ${terminology.professional}`}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <ImageUpload
                    currentImage={formData.foto_url}
                    onImageChange={(url) => setFormData({ ...formData, foto_url: url })}
                    placeholder="Carregar foto do profissional"
                    size="md"
                  />
                  <div>
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      disabled={!!editingBarbeiro}
                    />
                  </div>
                  {!editingBarbeiro && (
                    <div>
                      <Label htmlFor="senha">Senha</Label>
                      <Input
                        id="senha"
                        type="password"
                        value={formData.senha}
                        onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="bio">Bio (opcional)</Label>
                    <Input
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="especialidades">Especialidades (separadas por vírgula)</Label>
                    <Input
                      id="especialidades"
                      value={formData.especialidades}
                      onChange={(e) => setFormData({ ...formData, especialidades: e.target.value })}
                      placeholder="Corte, Barba, Coloração"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </header>

          {barbeiros.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Nenhum {terminology.professionals.toLowerCase()} cadastrado ainda
            </p>
            <Button 
              onClick={() => setShowDialog(true)}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              {`Adicionar Primeiro ${terminology.professional}`}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {barbeiros.map((barbeiro) => (
              <BarbeiroCard
                key={barbeiro.id}
                barbeiro={{
                  ...barbeiro,
                  nome: barbeiro.profiles.nome,
                } as Barbeiro & { nome: string }}
                stats={barbeirosStats.get(barbeiro.id) || {
                  faturamento: 0,
                  servicos_realizados: 0,
                  avaliacao_media: 0,
                  total_avaliacoes: 0,
                }}
                onEditHorario={() => setEditingHorario({
                  ...barbeiro,
                  nome: barbeiro.profiles.nome,
                })}
                onEdit={() => handleEdit(barbeiro)}
              />
            ))}
          </div>
        )}

        

        <EditarHorarioDialog
          open={!!editingHorario}
          barbeiro={editingHorario}
          onClose={() => setEditingHorario(null)}
          onSave={handleSaveHorario}
        />

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este {terminology.professional.toLowerCase()}? Esta ação não pode
                ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

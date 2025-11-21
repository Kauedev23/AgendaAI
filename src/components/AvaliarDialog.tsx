import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AvaliacaoStars } from "./AvaliacaoStars";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTerminology } from "@/context/BusinessTerminologyProvider";

interface AvaliarDialogProps {
  open: boolean;
  agendamento: {
    id: string;
    barbeiro_id: string;
    cliente_id: string;
    barbeiro?: { nome: string };
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AvaliarDialog = ({
  open,
  agendamento,
  onClose,
  onSuccess,
}: AvaliarDialogProps) => {
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const { terminology } = useTerminology();

  const handleSubmit = async () => {
    if (nota === 0) {
      toast.error("Selecione uma nota de 1 a 5 estrelas");
      return;
    }

    if (!agendamento) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("avaliacoes").insert({
        barbeiro_id: agendamento.barbeiro_id,
        cliente_id: agendamento.cliente_id,
        agendamento_id: agendamento.id,
        nota,
        comentario: comentario.trim() || null,
      });

      if (error) throw error;

      toast.success("Avaliação enviada com sucesso!");
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Erro ao enviar avaliação:", error);
      if (error.code === "23505") {
        toast.error("Você já avaliou este agendamento");
      } else {
        toast.error("Erro ao enviar avaliação");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNota(0);
    setComentario("");
    onClose();
  };

  const handleRatingChange: (rating: number) => void = (rating) => {
    setNota(rating);
  };

  if (!agendamento) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{`Avaliar ${terminology.appointment}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">
              {`Como foi seu ${terminology.appointment.toLowerCase()} com ${agendamento.barbeiro?.nome || terminology.professional.toLowerCase()}?`}
            </p>
            <div className="flex justify-center">
              <AvaliacaoStars
                rating={nota}
                size={40}
                interactive
                onChange={handleRatingChange}
              />
            </div>
            {nota > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {nota === 1 && "Muito insatisfeito"}
                {nota === 2 && "Insatisfeito"}
                {nota === 3 && "Regular"}
                {nota === 4 && "Satisfeito"}
                {nota === 5 && "Muito satisfeito"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentario">
              Comentário (opcional)
            </Label>
            <Textarea
              id="comentario"
              placeholder="Conte-nos mais sobre sua experiência..."
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comentario.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {"Cancelar"}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || nota === 0}>
            {loading ? "Enviando..." : `Enviar ${terminology.appointment} Avaliação`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

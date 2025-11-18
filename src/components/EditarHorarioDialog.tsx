import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface EditarHorarioDialogProps {
  open: boolean;
  barbeiro: {
    id: string;
    nome: string;
    dias_funcionamento: string[];
    horario_inicio: string;
    horario_fim: string;
  } | null;
  onClose: () => void;
  onSave: (data: {
    dias_funcionamento: string[];
    horario_inicio: string;
    horario_fim: string;
  }) => Promise<void>;
}

export const EditarHorarioDialog = ({
  open,
  barbeiro,
  onClose,
  onSave,
}: EditarHorarioDialogProps) => {
  const [dias, setDias] = useState<string[]>([]);
  const [horarioInicio, setHorarioInicio] = useState("");
  const [horarioFim, setHorarioFim] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (barbeiro) {
      setDias(barbeiro.dias_funcionamento || []);
      setHorarioInicio(barbeiro.horario_inicio?.substring(0, 5) || "08:00");
      setHorarioFim(barbeiro.horario_fim?.substring(0, 5) || "19:00");
    }
  }, [barbeiro]);

  const diasSemana = [
    { value: "segunda", label: "Segunda-feira" },
    { value: "terca", label: "Terça-feira" },
    { value: "quarta", label: "Quarta-feira" },
    { value: "quinta", label: "Quinta-feira" },
    { value: "sexta", label: "Sexta-feira" },
    { value: "sabado", label: "Sábado" },
    { value: "domingo", label: "Domingo" },
  ];

  const toggleDia = (dia: string) => {
    if (dias.includes(dia)) {
      setDias(dias.filter((d) => d !== dia));
    } else {
      setDias([...dias, dia]);
    }
  };

  const handleSubmit = async () => {
    if (dias.length === 0) {
      toast.error("Selecione pelo menos um dia de funcionamento");
      return;
    }

    if (horarioFim <= horarioInicio) {
      toast.error("O horário de fim deve ser maior que o horário de início");
      return;
    }

    setLoading(true);
    try {
      await onSave({
        dias_funcionamento: dias,
        horario_inicio: horarioInicio + ":00",
        horario_fim: horarioFim + ":00",
      });
      toast.success("Horário atualizado com sucesso!");
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar horário:", error);
      toast.error("Erro ao atualizar horário");
    } finally {
      setLoading(false);
    }
  };

  if (!barbeiro) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Horário - {barbeiro.nome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Dias de Funcionamento</Label>
            <div className="space-y-2">
              {diasSemana.map((dia) => (
                <div key={dia.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={dia.value}
                    checked={dias.includes(dia.value)}
                    onCheckedChange={() => toggleDia(dia.value)}
                  />
                  <label
                    htmlFor={dia.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {dia.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="horario-inicio">Horário de Início</Label>
              <Input
                id="horario-inicio"
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horario-fim">Horário de Fim</Label>
              <Input
                id="horario-fim"
                type="time"
                value={horarioFim}
                onChange={(e) => setHorarioFim(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

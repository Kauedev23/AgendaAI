import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Edit } from "lucide-react";
import { useTerminology } from "@/context/BusinessTerminologyProvider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface BarbeiroCardProps {
  barbeiro: {
    id: string;
    nome: string;
    foto_url: string | null;
    ativo: boolean;
    dias_funcionamento: string[];
    horario_inicio: string;
    horario_fim: string;
    bio: string | null;
  };
  stats: {
    faturamento: number;
    servicos_realizados: number;
    avaliacao_media: number;
    total_avaliacoes: number;
  };
  onEditHorario: () => void;
  onEdit: () => void;
}

export const BarbeiroCard = ({ barbeiro, stats, onEditHorario, onEdit }: BarbeiroCardProps) => {
  const { terminology } = useTerminology();
  const diasMap: Record<string, string> = {
    segunda: "Segunda",
    terca: "Terça",
    quarta: "Quarta",
    quinta: "Quinta",
    sexta: "Sexta",
    sabado: "Sábado",
    domingo: "Domingo",
  };

  const getDiasTexto = () => {
    if (!barbeiro.dias_funcionamento || barbeiro.dias_funcionamento.length === 0) {
      return "Não definido";
    }
    
    const dias = barbeiro.dias_funcionamento;
    const diasOrdenados = ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"];
    const diasFiltrados = diasOrdenados.filter(dia => dias.includes(dia));
    
    if (diasFiltrados.length === 7) {
      return "Segunda à domingo";
    } else if (diasFiltrados.length === 6 && !dias.includes("domingo")) {
      return "Segunda à sábado";
    } else if (diasFiltrados.length === 5 && !dias.includes("sabado") && !dias.includes("domingo")) {
      return "Segunda à sexta";
    } else {
      return diasFiltrados.map(dia => diasMap[dia]).join(", ");
    }
  };

  const formatTime = (time: string) => {
    if (!time) return "00h00";
    const [hours, minutes] = time.split(":");
    return `${hours}h${minutes}`;
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border-0"
      onClick={onEdit}
    >
      <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 p-6 text-white relative">
        {barbeiro.ativo && (
          <Badge className="absolute top-4 right-4 bg-green-500 hover:bg-green-500 border-0 text-white font-bold text-sm px-3 py-1">
            {"Ativo"}
          </Badge>
        )}
        
        <div className="flex items-start gap-4 mb-6">
          <Avatar className="h-24 w-24 border-4 border-white shadow-xl flex-shrink-0">
            <AvatarImage src={barbeiro.foto_url || ""} alt={barbeiro.nome} />
            <AvatarFallback className="bg-cyan-700 text-white text-2xl font-bold">
              {barbeiro.nome?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0 pt-1">
            <h3 className="text-3xl font-bold mb-3 text-white">{barbeiro.nome}</h3>
            
            <div className="space-y-1">
              <h4 className="text-blue-900 font-bold text-base">
                {terminology.schedule}
              </h4>
              <p className="text-white text-base font-medium">
                {getDiasTexto()}
              </p>
              <p className="text-white text-base font-bold">
                {formatTime(barbeiro.horario_inicio)} às {formatTime(barbeiro.horario_fim)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
          <div className="text-center">
            <p className="text-white/90 text-xs font-semibold mb-1">Faturamento</p>
            <p className="text-white text-xl font-bold">
              R$ {stats.faturamento.toFixed(0)}
            </p>
          </div>

          <div className="text-center border-l border-r border-white/20">
            <p className="text-white/90 text-xs font-semibold mb-1">{`${terminology.services} Realizados`}</p>
            <p className="text-white text-xl font-bold">
              {stats.servicos_realizados}
            </p>
          </div>

          <div className="text-center">
            <p className="text-white/90 text-xs font-semibold mb-1">{`${terminology.clients} (${terminology.professional.toLowerCase()} Avaliações)`}</p>
            <div className="flex justify-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={
                    star <= Math.round(stats.avaliacao_media)
                      ? "fill-yellow-400 text-yellow-400"
                      : "fill-white/40 text-white/40"
                  }
                  size={24}
                />
              ))}
            </div>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEditHorario();
          }}
          className="absolute top-4 left-4 text-white hover:bg-white/20 h-8 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit className="h-3 w-3 mr-1" />
          {`Editar ${terminology.schedule}`}
        </Button>
      </div>
    </Card>
  );
};

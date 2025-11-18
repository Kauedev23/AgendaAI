import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvaliacaoStars } from "./AvaliacaoStars";
import { Clock, DollarSign, Scissors, Edit } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  const diasMap: Record<string, string> = {
    segunda: "Seg",
    terca: "Ter",
    quarta: "Qua",
    quinta: "Qui",
    sexta: "Sex",
    sabado: "Sáb",
    domingo: "Dom",
  };

  const diasResumidos = barbeiro.dias_funcionamento
    ?.map((dia) => diasMap[dia] || dia)
    .join(", ");

  const formatTime = (time: string) => {
    if (!time) return "";
    return time.substring(0, 5);
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-6 text-white relative">
        {barbeiro.ativo && (
          <Badge className="absolute top-3 right-3 bg-green-500 hover:bg-green-600 border-0">
            Ativo
          </Badge>
        )}
        
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
            <AvatarImage src={barbeiro.foto_url || ""} alt={barbeiro.nome} />
            <AvatarFallback className="bg-teal-700 text-white text-xl">
              {barbeiro.nome?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold truncate mb-1">{barbeiro.nome}</h3>
            <div className="flex items-center gap-1">
              <AvaliacaoStars 
                rating={stats.avaliacao_media} 
                size={18}
                showCount
                count={stats.total_avaliacoes}
              />
            </div>
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Horário de atendimento</span>
          </div>
          <p className="pl-6">{diasResumidos || "Não definido"}</p>
          <div className="flex items-center justify-between pl-6">
            <span>
              {formatTime(barbeiro.horario_inicio)} às {formatTime(barbeiro.horario_fim)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEditHorario}
              className="text-white hover:bg-white/20 h-7 px-2"
            >
              <Edit className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
        </div>
      </div>

      <CardContent className="p-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-600" />
            <div className="text-lg font-bold text-green-700">
              R$ {stats.faturamento.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Faturamento</div>
          </div>

          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Scissors className="h-5 w-5 mx-auto mb-1 text-blue-600" />
            <div className="text-lg font-bold text-blue-700">
              {stats.servicos_realizados}
            </div>
            <div className="text-xs text-muted-foreground">Serviços</div>
          </div>

          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="flex justify-center mb-1">
              <AvaliacaoStars rating={stats.avaliacao_media} size={16} />
            </div>
            <div className="text-lg font-bold text-yellow-700">
              {stats.avaliacao_media.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">Avaliação</div>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={onEdit}
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar Profissional
        </Button>
      </CardContent>
    </Card>
  );
};

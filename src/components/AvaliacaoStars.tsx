import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvaliacaoStarsProps {
  rating: number; // 0-5
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  showCount?: boolean;
  count?: number;
}

export const AvaliacaoStars = ({
  rating,
  size = 20,
  interactive = false,
  onChange,
  showCount = false,
  count = 0,
}: AvaliacaoStarsProps) => {
  const handleClick = (index: number) => {
    if (interactive && onChange) {
      onChange(index + 1);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((index) => (
          <Star
            key={index}
            size={size}
            className={cn(
              "transition-all",
              interactive && "cursor-pointer hover:scale-110",
              index < Math.floor(rating)
                ? "fill-yellow-500 text-yellow-500"
                : index < rating
                ? "fill-yellow-500/50 text-yellow-500"
                : "fill-none text-gray-300"
            )}
            onClick={() => handleClick(index)}
          />
        ))}
      </div>
      {showCount && (
        <span className="text-sm text-muted-foreground ml-1">
          ({count})
        </span>
      )}
    </div>
  );
};

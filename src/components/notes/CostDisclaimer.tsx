import { cn } from "@/lib/utils";

interface CostDisclaimerProps {
  className?: string;
}

export function CostDisclaimer({ className }: CostDisclaimerProps) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      Przedstawione koszty mają charakter szacunkowy i mogą się różnić w zależności od sezonu, dostępności oraz
      indywidualnych preferencji.
    </p>
  );
}


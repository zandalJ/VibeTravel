import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PlanErrorStateProps {
  message?: string;
  onRetry: () => void;
}

export function PlanErrorState({ message, onRetry }: PlanErrorStateProps) {
  return (
    <section
      className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-destructive"
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-4 flex items-start gap-3">
        <AlertCircle className="mt-1 size-5 flex-shrink-0" aria-hidden />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Wystąpił błąd</h2>
          <p className="text-sm text-destructive/80">
            {message || "Nie udało się pobrać planu. Spróbuj ponownie."}
          </p>
        </div>
      </div>

      <Button type="button" variant="destructive" onClick={onRetry} className="inline-flex items-center gap-2">
        <RotateCw className="size-4" aria-hidden />
        Spróbuj ponownie
      </Button>
    </section>
  );
}


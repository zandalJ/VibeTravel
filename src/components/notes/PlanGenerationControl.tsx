import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PlanGenerationControlProps {
  isProfileComplete: boolean;
  remainingGenerations: number | null;
  isGenerating: boolean;
  onGeneratePlan: () => void;
}

export function PlanGenerationControl({
  isProfileComplete,
  remainingGenerations,
  isGenerating,
  onGeneratePlan,
}: PlanGenerationControlProps) {
  const canGenerate =
    isProfileComplete && remainingGenerations !== null && remainingGenerations > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generowanie planu</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isProfileComplete && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Aby wygenerować plan, uzupełnij najpierw swój profil preferencji.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-2">
              <a href="/profile">Przejdź do profilu</a>
            </Button>
          </div>
        )}

        {isProfileComplete && remainingGenerations !== null && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Pozostałe generowania w tym miesiącu:{" "}
              <span className="font-semibold">{remainingGenerations}</span>
            </p>

            {remainingGenerations === 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">
                  Wykorzystałeś limit generowań w tym miesiącu. Spróbuj ponownie w
                  następnym miesiącu.
                </p>
              </div>
            )}
          </div>
        )}

        <Button
          onClick={onGeneratePlan}
          disabled={!canGenerate || isGenerating}
          className="w-full"
        >
          {isGenerating ? "Generowanie..." : "Wygeneruj plan podróży"}
        </Button>
      </CardContent>
    </Card>
  );
}
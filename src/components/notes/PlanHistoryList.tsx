import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PlanListItemDTO } from "@/types";

interface PlanHistoryListProps {
  plans: PlanListItemDTO[];
  isLoading: boolean;
}

export function PlanHistoryList({ plans, isLoading }: PlanHistoryListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historia planów</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Ładowanie...</p>
        </CardContent>
      </Card>
    );
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historia planów</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Brak wygenerowanych planów dla tej notatki.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historia planów</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {new Date(plan.created_at).toLocaleDateString("pl-PL", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {plan.feedback_value !== null && (
                  <p className="text-sm text-muted-foreground">
                    Ocena: {plan.feedback_value === 1 ? "Pozytywna" : "Negatywna"}
                  </p>
                )}
              </div>
              <Button asChild variant="outline" size="sm">
                <a href={`/plans/${plan.id}`}>Zobacz szczegóły</a>
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
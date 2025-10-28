import { useMemo } from "react";
import type { PlanDTO } from "@/types";

interface PlanHeaderProps {
  note: PlanDTO["note"] | null | undefined;
  noteId: string | null | undefined;
}

function formatDateRange(startDate: string | null | undefined, endDate: string | null | undefined) {
  if (!startDate || !endDate) {
    return "—";
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "—";
  }

  const formatter = new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function PlanHeader({ note, noteId }: PlanHeaderProps) {
  const destination = note?.destination?.trim() || "—";

  const dateRange = useMemo(
    () => formatDateRange(note?.start_date, note?.end_date),
    [note?.start_date, note?.end_date],
  );

  return (
    <header className="space-y-3" aria-labelledby="plan-heading">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Wygenerowany plan</p>
          <h1 id="plan-heading" className="text-3xl font-bold leading-tight text-foreground">
            {destination}
          </h1>
          <p className="text-muted-foreground text-sm">{dateRange}</p>
        </div>

        {noteId && (
          <a
            href={`/notes/${noteId}`}
            className="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Powrót do notatki"
          >
            ← Powrót do notatki
          </a>
        )}
      </div>
    </header>
  );
}


import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NoteListItemDTO } from "@/types";
import { cn } from "@/lib/utils";

interface NoteCardProps {
  note: NoteListItemDTO;
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
    month: "2-digit",
    year: "numeric",
  });

  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

export function NoteCard({ note }: NoteCardProps) {
  const dateRange = useMemo(
    () => formatDateRange(note.start_date, note.end_date),
    [note.start_date, note.end_date],
  );

  return (
    <Card
      asChild
      className={cn(
        "transition-shadow hover:shadow-md focus-within:shadow-md",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <a
        href={`/notes/${note.id}`}
        aria-label={`Przejdź do notatki ${note.destination}`}
        className="flex h-full flex-col"
      >
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">
            {note.destination}
          </CardTitle>
          <p className="text-muted-foreground text-sm">{dateRange}</p>
        </CardHeader>

        <CardContent className="mt-auto flex items-center justify-between text-sm text-muted-foreground">
          <span>Plany</span>
          <span className="inline-flex items-center justify-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            {note.plan_count}
          </span>
        </CardContent>
      </a>
    </Card>
  );
}


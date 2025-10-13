import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { NoteDTO } from "@/types";

interface NoteDetailsCardProps {
  note: NoteDTO | null;
  isLoading: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

export function NoteDetailsCard({
  note,
  isLoading,
  onDelete,
  onEdit,
}: NoteDetailsCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Szczegóły notatki</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Ładowanie...</p>
        </CardContent>
      </Card>
    );
  }

  if (!note) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Szczegóły notatki</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nie znaleziono notatki.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle>Szczegóły notatki</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              Edytuj
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete}>
              Usuń
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">
            Miejsce docelowe
          </h3>
          <p className="text-lg">{note.destination || "Nie określono"}</p>
        </div>

        {note.start_date && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">
              Data rozpoczęcia
            </h3>
            <p>
              {new Date(note.start_date).toLocaleDateString("pl-PL", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        )}

        {note.end_date && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">
              Data zakończenia
            </h3>
            <p>
              {new Date(note.end_date).toLocaleDateString("pl-PL", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        )}

        {note.duration_days && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">
              Długość podróży
            </h3>
            <p>
              {note.duration_days} {note.duration_days === 1 ? "dzień" : "dni"}
            </p>
          </div>
        )}

        {note.budget && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1">
              Budżet
            </h3>
            <p>{note.budget} PLN</p>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">
            Notatki
          </h3>
          <p className="whitespace-pre-wrap">{note.content || "Brak notatek"}</p>
        </div>

        <div className="text-xs text-muted-foreground pt-2 border-t">
          Utworzono:{" "}
          {new Date(note.created_at).toLocaleDateString("pl-PL", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </CardContent>
    </Card>
  );
}
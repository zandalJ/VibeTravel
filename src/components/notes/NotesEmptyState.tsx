import { Button } from "@/components/ui/button";

interface NotesEmptyStateProps {
  onCreateFirst?: () => void;
}

export function NotesEmptyState({ onCreateFirst }: NotesEmptyStateProps) {
  const handleClick = () => {
    if (onCreateFirst) {
      onCreateFirst();
      return;
    }

    window.location.href = "/notes/new";
  };

  return (
    <section className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-card/80 px-6 py-16 text-center">
      <span role="img" aria-hidden="true" className="text-5xl">
        ✨
      </span>
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Zacznij planować swoje podróże</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Nie masz jeszcze żadnych notatek. Dodaj pierwszą, aby rozpocząć organizację.
        </p>
      </div>
      <Button onClick={handleClick} size="lg">
        Stwórz pierwszą notatkę
      </Button>
    </section>
  );
}


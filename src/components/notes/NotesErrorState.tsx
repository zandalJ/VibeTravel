import { Button } from "@/components/ui/button";

interface NotesErrorStateProps {
  onRetry: () => Promise<void>;
  message?: string;
}

export function NotesErrorState({ onRetry, message }: NotesErrorStateProps) {
  return (
    <section
      role="alert"
      className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/40 bg-destructive/10 px-6 py-12 text-center"
    >
      <div>
        <h2 className="text-2xl font-semibold text-destructive">Nie udało się pobrać notatek</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          {message ?? "Spróbuj ponownie za chwilę. Jeżeli problem będzie się powtarzał, skontaktuj się z nami."}
        </p>
      </div>
      <Button variant="outline" onClick={() => onRetry()}>
        Spróbuj ponownie
      </Button>
    </section>
  );
}


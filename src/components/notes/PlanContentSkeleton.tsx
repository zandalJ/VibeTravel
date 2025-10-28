export function PlanContentSkeleton() {
  return (
    <article
      className="rounded-lg border border-border bg-card p-6 shadow-sm"
      role="status"
      aria-live="polite"
      aria-label="Ładowanie planu"
    >
      <p className="sr-only">Trwa wczytywanie szczegółów planu podróży…</p>
      <div className="space-y-6" aria-hidden="true">
        <div className="space-y-3">
          <div className="h-9 w-2/3 animate-pulse rounded bg-muted" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={`paragraph-${index}`} className="h-4 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>

        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`list-${index}`} className="h-4 w-11/12 animate-pulse rounded bg-muted" />
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            <div className="h-9 w-28 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </article>
  );
}


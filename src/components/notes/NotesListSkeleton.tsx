interface NotesListSkeletonProps {
  count?: number;
}

export function NotesListSkeleton({ count = 6 }: NotesListSkeletonProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="animate-pulse rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-3 h-6 w-2/3 rounded bg-muted" />
          <div className="h-4 w-1/2 rounded bg-muted" />
          <div className="mt-6 flex items-center justify-between">
            <div className="h-4 w-12 rounded bg-muted" />
            <div className="h-6 w-10 rounded-full bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}


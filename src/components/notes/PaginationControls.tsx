import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  total: number;
  limit: number;
  offset: number;
  onChange: (offset: number) => Promise<void>;
  isLoading?: boolean;
}

export function PaginationControls({
  total,
  limit,
  offset,
  onChange,
  isLoading = false,
}: PaginationControlsProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPrevious = offset > 0;
  const hasNext = offset + limit < total;

  const handlePrevious = () => {
    if (!hasPrevious || isLoading) {
      return;
    }

    return onChange(Math.max(0, offset - limit));
  };

  const handleNext = () => {
    if (!hasNext || isLoading) {
      return;
    }

    return onChange(offset + limit);
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label="Stronicowanie notatek" className="flex items-center justify-between gap-4">
      <div className="text-muted-foreground text-sm">
        Strona {currentPage} z {totalPages}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handlePrevious} disabled={!hasPrevious || isLoading}>
          Poprzednia
        </Button>
        <Button variant="outline" onClick={handleNext} disabled={!hasNext || isLoading}>
          Następna
        </Button>
      </div>
    </nav>
  );
}


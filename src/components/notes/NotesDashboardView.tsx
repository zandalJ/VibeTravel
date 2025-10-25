import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useNotesList } from "@/components/hooks/useNotesList";
import { NotesList } from "./NotesList";
import { NotesListSkeleton } from "./NotesListSkeleton";
import { NotesEmptyState } from "./NotesEmptyState";
import { NotesErrorState } from "./NotesErrorState";
import { PaginationControls } from "./PaginationControls";

const SKELETON_CARD_COUNT = 6;

export function NotesDashboardView() {
  const { viewModel, retry, goToOffset } = useNotesList();

  const isEmpty = useMemo(
    () => !viewModel.isLoading && !viewModel.error && viewModel.notes.length === 0,
    [viewModel.isLoading, viewModel.error, viewModel.notes.length],
  );

  const showPagination = viewModel.pagination.total > viewModel.pagination.limit;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Twoje notatki</h1>
          <p className="text-muted-foreground text-sm">Zarządzaj zapisanymi miejscami i planami podróży.</p>
        </div>
        <Button asChild size="lg">
          <a href="/notes/new">Dodaj nową notatkę</a>
        </Button>
      </header>

      {viewModel.isLoading ? (
        <NotesListSkeleton count={SKELETON_CARD_COUNT} />
      ) : null}

      {viewModel.error ? (
        <NotesErrorState onRetry={retry} message={viewModel.error} />
      ) : null}

      {isEmpty ? <NotesEmptyState /> : null}

      {!viewModel.isLoading && !isEmpty && !viewModel.error ? (
        <NotesList notes={viewModel.notes} isRefetching={viewModel.isRefetching} />
      ) : null}

      {showPagination ? (
        <PaginationControls
          total={viewModel.pagination.total}
          limit={viewModel.pagination.limit}
          offset={viewModel.pagination.offset}
          onChange={goToOffset}
          isLoading={viewModel.isRefetching}
        />
      ) : null}
    </div>
  );
}


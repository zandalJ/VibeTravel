import { memo } from "react";
import type { NoteListItemDTO } from "@/types";
import { NoteCard } from "./NoteCard";

interface NotesListProps {
  notes: NoteListItemDTO[];
  isRefetching?: boolean;
}

function NotesListComponent({ notes, isRefetching = false }: NotesListProps) {
  return (
    <section aria-live={isRefetching ? "polite" : undefined}>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" data-reloading={isRefetching ? "true" : undefined}>
        {notes.map((note) => (
          <li key={note.id}>
            <NoteCard note={note} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export const NotesList = memo(NotesListComponent);


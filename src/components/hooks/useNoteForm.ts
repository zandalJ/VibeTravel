import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  createNoteSchema,
  type NoteFormViewModel,
} from "@/lib/validators/notes.validator";
import type { NoteDTO } from "@/types";

interface UseNoteFormProps {
  onSuccess?: (note: NoteDTO) => void;
  onError?: (error: string) => void;
}

interface UseNoteFormReturn {
  form: ReturnType<typeof useForm<NoteFormViewModel>>;
  onSubmit: (data: NoteFormViewModel) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

/**
 * Custom hook for managing note creation form state and submission
 * Calls POST /api/notes to create a new note
 */
export function useNoteForm({
  onSuccess,
  onError,
}: UseNoteFormProps): UseNoteFormReturn {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<NoteFormViewModel>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      destination: "",
      start_date: "",
      end_date: "",
      total_budget: null,
      additional_notes: null,
    },
  });

  const onSubmit = async (data: NoteFormViewModel) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create note");
      }

      const savedNote: NoteDTO = await response.json();

      if (onSuccess) {
        onSuccess(savedNote);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    onSubmit,
    isSubmitting,
    error,
  };
}
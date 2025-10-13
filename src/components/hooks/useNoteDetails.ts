import { useState, useEffect, useCallback } from "react";
import type { NoteDetailsViewModel } from "@/types";
import { toast } from "sonner";

interface UseNoteDetailsParams {
  noteId: string;
}

interface UseNoteDetailsReturn extends NoteDetailsViewModel {
  handleGeneratePlan: () => Promise<void>;
  handleDeleteNote: () => Promise<void>;
  handleOpenDeleteDialog: () => void;
  handleCloseDeleteDialog: () => void;
  refreshData: () => Promise<void>;
}

export function useNoteDetails({
  noteId,
}: UseNoteDetailsParams): UseNoteDetailsReturn {
  const [viewModel, setViewModel] = useState<NoteDetailsViewModel>({
    note: null,
    plans: [],
    isProfileComplete: false,
    remainingGenerations: null,
    isLoading: true,
    isGeneratingPlan: false,
    isDeletingNote: false,
    error: null,
    isDeleteDialogOpen: false,
  });

  // Fetch initial data
  const fetchNoteDetails = useCallback(async () => {
    try {
      setViewModel((prev) => ({ ...prev, isLoading: true, error: null }));

      // Fetch note details
      const noteResponse = await fetch(`/api/notes/${noteId}`);
      if (!noteResponse.ok) {
        throw new Error("Nie udało się pobrać danych notatki");
      }
      const noteData = await noteResponse.json();

      // Fetch plans history
      const plansResponse = await fetch(`/api/notes/${noteId}/plans`);
      if (!plansResponse.ok) {
        throw new Error("Nie udało się pobrać historii planów");
      }
      const plansData = await plansResponse.json();

      // TODO: Fetch profile status and remaining generations
      // For now, set placeholder values
      const isProfileComplete = true;
      const remainingGenerations = 5;

      setViewModel((prev) => ({
        ...prev,
        note: noteData,
        plans: plansData.plans || [],
        isProfileComplete,
        remainingGenerations,
        isLoading: false,
      }));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd";
      setViewModel((prev) => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      toast.error(errorMessage);
    }
  }, [noteId]);

  // Initial data fetch
  useEffect(() => {
    fetchNoteDetails();
  }, [fetchNoteDetails]);

  // Generate new plan
  const handleGeneratePlan = useCallback(async () => {
    if (!viewModel.isProfileComplete) {
      toast.error("Uzupełnij profil preferencji przed generowaniem planu");
      return;
    }

    if (
      viewModel.remainingGenerations === null ||
      viewModel.remainingGenerations <= 0
    ) {
      toast.error("Wykorzystano limit generowań w tym miesiącu");
      return;
    }

    try {
      setViewModel((prev) => ({ ...prev, isGeneratingPlan: true }));

      const response = await fetch(`/api/notes/${noteId}/generate-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Nie udało się wygenerować planu");
      }

      const data = await response.json();

      toast.success("Plan został wygenerowany!");

      // Redirect to the new plan
      window.location.href = `/plans/${data.id}`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd";
      toast.error(errorMessage);
      setViewModel((prev) => ({ ...prev, isGeneratingPlan: false }));
    }
  }, [noteId, viewModel.isProfileComplete, viewModel.remainingGenerations]);

  // Delete note
  const handleDeleteNote = useCallback(async () => {
    try {
      setViewModel((prev) => ({
        ...prev,
        isDeletingNote: true,
        isDeleteDialogOpen: false,
      }));

      const response = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Nie udało się usunąć notatki");
      }

      toast.success("Notatka została usunięta");

      // Redirect to notes list
      window.location.href = "/notes";
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd";
      toast.error(errorMessage);
      setViewModel((prev) => ({ ...prev, isDeletingNote: false }));
    }
  }, [noteId]);

  // Dialog handlers
  const handleOpenDeleteDialog = useCallback(() => {
    setViewModel((prev) => ({ ...prev, isDeleteDialogOpen: true }));
  }, []);

  const handleCloseDeleteDialog = useCallback(() => {
    setViewModel((prev) => ({ ...prev, isDeleteDialogOpen: false }));
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    await fetchNoteDetails();
  }, [fetchNoteDetails]);

  return {
    ...viewModel,
    handleGeneratePlan,
    handleDeleteNote,
    handleOpenDeleteDialog,
    handleCloseDeleteDialog,
    refreshData,
  };
}
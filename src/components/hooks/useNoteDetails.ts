import { useState, useEffect, useCallback } from "react";
import type { NoteDetailsViewModel } from "@/types";
import { toast } from "sonner";

interface UseNoteDetailsParams {
  noteId: string;
}

interface UseNoteDetailsReturn extends NoteDetailsViewModel {
  handleGeneratePlan: () => Promise<void>;
  handleAcceptPlan: () => Promise<void>;
  handleRejectPlan: () => void;
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
    generatedPlanPreview: null,
    isPlanPreviewDialogOpen: false,
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

  // Refresh data
  const refreshData = useCallback(async () => {
    await fetchNoteDetails();
  }, [fetchNoteDetails]);

  // Generate new plan (without saving to database)
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
      
      // Show preview dialog with generated plan
      setViewModel((prev) => ({
        ...prev,
        isGeneratingPlan: false,
        generatedPlanPreview: data.plan,
        isPlanPreviewDialogOpen: true,
      }));
    } catch (error) {
      console.error("Failed to generate plan:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Wystąpił błąd podczas generowania planu";
      setViewModel((prev) => ({
        ...prev,
        isGeneratingPlan: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
    }
  }, [noteId, viewModel.isProfileComplete, viewModel.remainingGenerations]);

  // Accept generated plan - save to database
  const handleAcceptPlan = useCallback(async () => {
    if (!viewModel.generatedPlanPreview) {
      return;
    }

    try {
      const response = await fetch(`/api/notes/${noteId}/plans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: viewModel.generatedPlanPreview.content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Nie udało się zapisać planu");
      }

      toast.success("Plan został zaakceptowany i zapisany");
      
      // Close dialog and refresh data
      setViewModel((prev) => ({
        ...prev,
        generatedPlanPreview: null,
        isPlanPreviewDialogOpen: false,
      }));
      
      await refreshData();
    } catch (error) {
      console.error("Failed to save plan:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Wystąpił błąd podczas zapisywania planu";
      toast.error(errorMessage);
    }
  }, [noteId, viewModel.generatedPlanPreview, refreshData]);

  // Reject generated plan - just close dialog
  const handleRejectPlan = useCallback(() => {
    setViewModel((prev) => ({
      ...prev,
      generatedPlanPreview: null,
      isPlanPreviewDialogOpen: false,
    }));
    toast.info("Plan został odrzucony");
  }, []);

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

      // Redirect to dashboard after deletion
      window.location.href = "/dashboard";
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

  return {
    ...viewModel,
    handleGeneratePlan,
    handleAcceptPlan,
    handleRejectPlan,
    handleDeleteNote,
    handleOpenDeleteDialog,
    handleCloseDeleteDialog,
    refreshData,
  };
}
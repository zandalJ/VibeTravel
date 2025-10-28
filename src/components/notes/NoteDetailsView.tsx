import { useNoteDetails } from "@/components/hooks/useNoteDetails";
import { NoteDetailsCard } from "./NoteDetailsCard";
import { PlanGenerationControl } from "./PlanGenerationControl";
import { PlanHistoryList } from "./PlanHistoryList";
import { ConfirmationDialog } from "./ConfirmationDialog";
import { PlanPreviewDialog } from "./PlanPreviewDialog";
import { Toaster } from "@/components/ui/sonner";

interface NoteDetailsViewProps {
  noteId: string;
}

export function NoteDetailsView({ noteId }: NoteDetailsViewProps) {
  const {
    note,
    plans,
    isProfileComplete,
    remainingGenerations,
    isLoading,
    isGeneratingPlan,
    isDeletingNote,
    error,
    isDeleteDialogOpen,
    generatedPlanPreview,
    isPlanPreviewDialogOpen,
    handleGeneratePlan,
    handleAcceptPlan,
    handleRejectPlan,
    handleDeleteNote,
    handleOpenDeleteDialog,
    handleCloseDeleteDialog,
  } = useNoteDetails({ noteId });

  const handleEditNote = () => {
    window.location.href = `/notes/${noteId}/edit`;
  };

  if (error && !isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Wystąpił błąd</h2>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Szczegóły notatki</h1>
            <a href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Powrót do listy notatek
            </a>
          </div>

          {/* Loading overlay */}
          {(isDeletingNote || isGeneratingPlan) && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">
                  {isDeletingNote ? "Usuwanie notatki..." : "Generowanie planu..."}
                </p>
              </div>
            </div>
          )}

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Note details */}
            <div className="lg:col-span-2 space-y-6">
              <NoteDetailsCard
                note={note}
                isLoading={isLoading}
                onDelete={handleOpenDeleteDialog}
                onEdit={handleEditNote}
              />

              <PlanHistoryList plans={plans} isLoading={isLoading} />
            </div>

            {/* Right column - Plan generation */}
            <div className="lg:col-span-1">
              <PlanGenerationControl
                isProfileComplete={isProfileComplete}
                remainingGenerations={remainingGenerations}
                isGenerating={isGeneratingPlan}
                onGeneratePlan={handleGeneratePlan}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plan preview dialog */}
      <PlanPreviewDialog
        isOpen={isPlanPreviewDialogOpen}
        plan={generatedPlanPreview}
        onAccept={handleAcceptPlan}
        onReject={handleRejectPlan}
      />

      {/* Confirmation dialog */}
      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onConfirm={handleDeleteNote}
        onCancel={handleCloseDeleteDialog}
        title="Czy na pewno chcesz usunąć tę notatkę?"
        description="Ta operacja jest nieodwracalna. Wszystkie powiązane plany podróży również zostaną usunięte."
      />

      {/* Toast notifications */}
      <Toaster />
    </>
  );
}

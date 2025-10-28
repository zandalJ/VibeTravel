import { useCallback, useMemo } from "react";
import { useGeneratedPlan } from "@/components/hooks/useGeneratedPlan";
import { PlanHeader } from "./PlanHeader";
import { PlanContent } from "./PlanContent";
import { PlanContentSkeleton } from "./PlanContentSkeleton";
import { PlanErrorState } from "./PlanErrorState";
import { Toaster } from "@/components/ui/sonner";

interface GeneratedPlanViewProps {
  planId: string;
}

export function GeneratedPlanView({ planId }: GeneratedPlanViewProps) {
  const { viewModel, retry, submitFeedback, copy } = useGeneratedPlan({ planId });
  const { plan, isLoading, error, isSubmittingFeedback, currentFeedback } = viewModel;

  const hasError = useMemo(() => Boolean(!isLoading && error), [isLoading, error]);
  const canRenderContent = useMemo(() => Boolean(!isLoading && !error && plan), [isLoading, error, plan]);

  const handleCopy = useCallback(
    async (content: string) => {
      await copy(content);
    },
    [copy],
  );

  const handleFeedback = useCallback(
    async (value: 1 | -1) => {
      await submitFeedback(value);
    },
    [submitFeedback],
  );

  const noteData = plan?.note;
  const noteId = plan?.note_id;

  return (
    <>
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {isLoading && (
            <div className="space-y-3">
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            </div>
          )}

          {plan && (
            <PlanHeader
              note={noteData}
              noteId={noteId}
            />
          )}

          {isLoading && <PlanContentSkeleton />}

          {hasError && (
            <PlanErrorState
              message={error ?? "Wystąpił nieoczekiwany błąd"}
              onRetry={retry}
            />
          )}

          {canRenderContent && plan && (
            <PlanContent
              plan={plan}
              onCopy={handleCopy}
              onFeedback={handleFeedback}
              isSubmittingFeedback={isSubmittingFeedback}
              currentFeedback={currentFeedback}
            />
          )}
        </div>
      </main>

      <Toaster />
    </>
  );
}


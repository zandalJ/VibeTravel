import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PlanDTO } from "@/types";

interface PlanPreviewDialogProps {
  isOpen: boolean;
  plan: PlanDTO | null;
  onAccept: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

/**
 * Dialog component for previewing a generated travel plan
 * User can accept (save to history) or reject (discard) the plan
 */
export function PlanPreviewDialog({
  isOpen,
  plan,
  onAccept,
  onReject,
  isLoading = false,
}: PlanPreviewDialogProps) {
  if (!plan) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onReject()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Wygenerowany plan podróży</DialogTitle>
          <DialogDescription>
            Sprawdź wygenerowany plan. Możesz go zaakceptować i zapisać do
            historii lub odrzucić.
          </DialogDescription>
        </DialogHeader>

        {/* Plan content preview */}
        <div className="my-6 p-6 bg-muted/50 rounded-lg border">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: plan.content }}
            />
          </div>
        </div>

        {/* Plan metadata */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <strong>Model:</strong> {plan.model}
          </p>
          <p>
            <strong>Wygenerowano:</strong>{" "}
            {new Date(plan.created_at).toLocaleString("pl-PL")}
          </p>
          {plan.tokens_used && (
            <p>
              <strong>Użyte tokeny:</strong> {plan.tokens_used}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onReject}
            disabled={isLoading}
          >
            Odrzuć
          </Button>
          <Button type="button" onClick={onAccept} disabled={isLoading}>
            {isLoading ? "Zapisywanie..." : "Zaakceptuj i zapisz"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


import type { PlanDTO } from "@/types";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { CostDisclaimer } from "./CostDisclaimer";
import { CopyToClipboardButton } from "./CopyToClipboardButton";
import { FeedbackButtons } from "./FeedbackButtons";

interface PlanContentProps {
  plan: PlanDTO;
  onCopy: (content: string) => Promise<void>;
  onFeedback: (value: 1 | -1) => Promise<void>;
  isSubmittingFeedback: boolean;
  currentFeedback: 1 | -1 | null;
}

export function PlanContent({ plan, onCopy, onFeedback, isSubmittingFeedback, currentFeedback }: PlanContentProps) {
  return (
    <article className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="space-y-6">
        <MarkdownRenderer content={plan.content} />

        <CostDisclaimer />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CopyToClipboardButton content={plan.content} onCopy={onCopy} />

          <FeedbackButtons
            currentFeedback={currentFeedback}
            isSubmitting={isSubmittingFeedback}
            onChange={onFeedback}
          />
        </div>
      </div>
    </article>
  );
}


import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";

interface FeedbackButtonsProps {
  currentFeedback: 1 | -1 | null;
  isSubmitting: boolean;
  onChange: (value: 1 | -1) => Promise<void>;
}

export function FeedbackButtons({ currentFeedback, isSubmitting, onChange }: FeedbackButtonsProps) {
  const [pendingVote, setPendingVote] = useState<1 | -1 | null>(null);
  const statusMessage = useMemo(() => {
    if (isSubmitting) {
      return "Trwa wysyłanie opinii";
    }

    if (currentFeedback === 1) {
      return "Oceniłeś plan pozytywnie";
    }

    if (currentFeedback === -1) {
      return "Oceniłeś plan negatywnie";
    }

    return "Plan nie został jeszcze oceniony";
  }, [currentFeedback, isSubmitting]);

  const handleVote = useCallback(
    async (value: 1 | -1) => {
      if (isSubmitting || currentFeedback === value) {
        return;
      }

      try {
        setPendingVote(value);
        await onChange(value);
      } finally {
        setPendingVote(null);
      }
    },
    [currentFeedback, isSubmitting, onChange],
  );

  const showSpinnerUp = isSubmitting && pendingVote === 1;
  const showSpinnerDown = isSubmitting && pendingVote === -1;

  return (
    <div
      className="flex items-center gap-2"
      role="group"
      aria-label="Oceń plan"
      aria-busy={isSubmitting || undefined}
    >
      <Button
        type="button"
        variant={currentFeedback === 1 ? "secondary" : "outline"}
        size="sm"
        disabled={isSubmitting}
        aria-pressed={currentFeedback === 1}
        aria-label="Oceń plan pozytywnie"
        onClick={() => handleVote(1)}
        data-state={currentFeedback === 1 ? "active" : "inactive"}
      >
        {showSpinnerUp ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ThumbsUp className="size-4" aria-hidden />}
        Lubię to
      </Button>

      <Button
        type="button"
        variant={currentFeedback === -1 ? "secondary" : "outline"}
        size="sm"
        disabled={isSubmitting}
        aria-pressed={currentFeedback === -1}
        aria-label="Oceń plan negatywnie"
        onClick={() => handleVote(-1)}
        data-state={currentFeedback === -1 ? "active" : "inactive"}
      >
        {showSpinnerDown ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ThumbsDown className="size-4" aria-hidden />}
        Nie podoba mi się
      </Button>

      <p className="sr-only" role="status" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}


"use client";

import { cn } from "@/lib/utils";
import type { AuthFeedbackState } from "@/lib/validators/auth.validator";

interface AuthFeedbackProps {
  feedback: AuthFeedbackState;
  className?: string;
}

export function AuthFeedback({ feedback, className }: AuthFeedbackProps) {
  if (!feedback) {
    return null;
  }

  const isError = feedback.status === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-4 py-3 text-sm",
        isError
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-emerald-300/60 bg-emerald-50 text-emerald-700",
        className
      )}
    >
      {feedback.message}
    </div>
  );
}


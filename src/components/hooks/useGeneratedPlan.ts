import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ErrorResponseDTO,
  FeedbackResponseDTO,
  GeneratedPlanViewModel,
  PlanDTO,
  SubmitFeedbackCommand,
  UseGeneratedPlanParams,
  UseGeneratedPlanReturn,
} from "@/types";
import { toast } from "sonner";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const INVALID_PLAN_ID_MESSAGE = "Nieprawidłowy identyfikator planu";
const PLAN_FETCH_ERROR_MESSAGE = "Nie udało się pobrać szczegółów planu";

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

function parseFeedback(value: number | null | undefined): 1 | -1 | null {
  if (value === 1 || value === -1) {
    return value;
  }
  return null;
}

async function safeParseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    console.warn("Failed to parse JSON response", error);
    return null;
  }
}

function mapErrorMessage(
  status: number,
  errorBody: ErrorResponseDTO | null,
  defaultMessage: string,
): string {
  if (!errorBody) {
    if (status === 404) {
      return "Plan nie został znaleziony";
    }
    if (status === 403) {
      return "Nie masz uprawnień do tego planu";
    }
    if (status === 400) {
      return INVALID_PLAN_ID_MESSAGE;
    }
    return defaultMessage;
  }

  switch (errorBody.code) {
    case "PLAN_NOT_FOUND":
    case "NOT_FOUND":
      return "Plan nie został znaleziony";
    case "FORBIDDEN":
      return "Nie masz uprawnień do tego planu";
    case "VALIDATION_ERROR":
      return INVALID_PLAN_ID_MESSAGE;
    default:
      return errorBody.error || defaultMessage;
  }
}

interface InternalState extends GeneratedPlanViewModel {}

const INITIAL_STATE: InternalState = {
  plan: null,
  isLoading: true,
  error: null,
  isSubmittingFeedback: false,
  currentFeedback: null,
};

export function useGeneratedPlan({ planId }: UseGeneratedPlanParams): UseGeneratedPlanReturn {
  const [viewModel, setViewModel] = useState<InternalState>(INITIAL_STATE);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sanitizedPlanId = useMemo(() => planId.trim(), [planId]);

  const fetchPlan = useCallback(async () => {
    if (!isValidUuid(sanitizedPlanId)) {
      setViewModel((prev) => ({
        ...prev,
        isLoading: false,
        error: INVALID_PLAN_ID_MESSAGE,
        plan: null,
        currentFeedback: null,
      }));
      toast.error(INVALID_PLAN_ID_MESSAGE);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setViewModel((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      const response = await fetch(`/api/plans/${sanitizedPlanId}`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorBody = await safeParseJson<ErrorResponseDTO>(response);
        const message = mapErrorMessage(response.status, errorBody, PLAN_FETCH_ERROR_MESSAGE);
        throw new Error(message);
      }

      const data = (await response.json()) as PlanDTO;

      setViewModel({
        plan: data,
        isLoading: false,
        error: null,
        isSubmittingFeedback: false,
        currentFeedback: parseFeedback(data.feedback),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const message =
        error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";

      setViewModel((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
        plan: null,
        currentFeedback: null,
      }));

      toast.error(message);
    }
  }, [sanitizedPlanId]);

  useEffect(() => {
    fetchPlan();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchPlan]);

  const retry = useCallback(async () => {
    await fetchPlan();
  }, [fetchPlan]);

  const submitFeedback = useCallback(
    async (value: 1 | -1) => {
      if (!viewModel.plan) {
        toast.error("Plan nie został jeszcze wczytany");
        return;
      }

      if (viewModel.isSubmittingFeedback) {
        return;
      }

      setViewModel((prev) => ({
        ...prev,
        isSubmittingFeedback: true,
        error: null,
      }));

      try {
        const payload: SubmitFeedbackCommand = { feedback: value };
        const response = await fetch(`/api/plans/${sanitizedPlanId}/feedback`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorBody = await safeParseJson<ErrorResponseDTO>(response);
          const message = mapErrorMessage(response.status, errorBody, "Nie udało się wysłać opinii");
          throw new Error(message);
        }

        const data = (await response.json()) as FeedbackResponseDTO;

        setViewModel((prev) => ({
          ...prev,
          isSubmittingFeedback: false,
          currentFeedback: parseFeedback(data.feedback) ?? value,
          plan: prev.plan
            ? {
                ...prev.plan,
                feedback: parseFeedback(data.feedback) ?? value,
              }
            : prev.plan,
        }));

        toast.success(data.message || "Dziękujemy za opinię");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Nie udało się wysłać opinii. Spróbuj ponownie.";

        setViewModel((prev) => ({
          ...prev,
          isSubmittingFeedback: false,
          error: message,
        }));

        toast.error(message);
      }
    },
    [sanitizedPlanId, viewModel.plan, viewModel.isSubmittingFeedback],
  );

  const copy = useCallback(
    async (content: string) => {
      const textToCopy = content?.trim() || viewModel.plan?.content;

      if (!textToCopy) {
        toast.error("Brak treści do skopiowania");
        return;
      }

      try {
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = textToCopy;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "absolute";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          const successful = document.execCommand("copy");
          document.body.removeChild(textarea);

          if (!successful) {
            throw new Error("Clipboard API niedostępne");
          }
        }

        toast.success("Plan skopiowany do schowka");
      } catch (error) {
        console.error("Clipboard copy failed", error);
        toast.error("Nie udało się skopiować. Spróbuj ponownie.");
      }
    },
    [viewModel.plan?.content],
  );

  return {
    viewModel,
    retry,
    submitFeedback,
    copy,
  };
}


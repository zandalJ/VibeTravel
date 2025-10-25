import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  NotesListResponseDTO,
  NotesListViewModel,
  SortParams,
  ValidationErrorResponseDTO,
} from "@/types";

interface UseNotesListParams {
  limit?: number;
  offset?: number;
  sort?: SortParams;
}

interface UseNotesListReturn {
  viewModel: NotesListViewModel;
  retry: () => Promise<void>;
  setSort: (sort: SortParams) => Promise<void>;
  goToOffset: (offset: number) => Promise<void>;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_SORT: SortParams = { field: "created_at", direction: "desc" };

const ALLOWED_SORT_FIELDS: ReadonlyArray<SortParams["field"]> = [
  "created_at",
  "start_date",
  "destination",
];

const ALLOWED_SORT_DIRECTIONS: ReadonlyArray<SortParams["direction"]> = [
  "asc",
  "desc",
];

function normalizeLimit(limit?: number): number {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  if (limit < 1) {
    return 1;
  }

  if (limit > MAX_LIMIT) {
    return MAX_LIMIT;
  }

  return Math.floor(limit);
}

function normalizeOffset(offset?: number): number {
  if (typeof offset !== "number" || Number.isNaN(offset) || offset < 0) {
    return 0;
  }

  return Math.floor(offset);
}

function normalizeSort(sort?: SortParams): SortParams {
  if (!sort) {
    return DEFAULT_SORT;
  }

  const field = ALLOWED_SORT_FIELDS.includes(sort.field)
    ? sort.field
    : DEFAULT_SORT.field;

  const direction = ALLOWED_SORT_DIRECTIONS.includes(sort.direction)
    ? sort.direction
    : DEFAULT_SORT.direction;

  if (field === sort.field && direction === sort.direction) {
    return sort;
  }

  return { field, direction } satisfies SortParams;
}

function createQueryString({
  limit,
  offset,
  sort,
}: Required<UseNotesListParams>): string {
  const params = new URLSearchParams();
  params.set("limit", limit.toString());
  params.set("offset", offset.toString());
  params.set("sort", `${sort.field}:${sort.direction}`);
  return params.toString();
}

function extractFriendlyErrorMessage(
  status: number,
  payload: unknown,
): string {
  if (status === 400 && payload && typeof payload === "object") {
    const validationPayload = payload as ValidationErrorResponseDTO;
    if (validationPayload.code === "VALIDATION_ERROR") {
      return "Nieprawidłowe parametry filtrowania lub sortowania.";
    }
  }

  if (status >= 500) {
    return "Wystąpił błąd po stronie serwera.";
  }

  return "Nie udało się pobrać listy notatek.";
}

export function useNotesList({
  limit,
  offset,
  sort,
}: UseNotesListParams = {}): UseNotesListReturn {
  const normalizedInitialLimit = normalizeLimit(limit);
  const normalizedInitialOffset = normalizeOffset(offset);
  const normalizedInitialSort = useMemo(() => normalizeSort(sort), [sort]);

  const [queryParams, setQueryParams] = useState<Required<UseNotesListParams>>({
    limit: normalizedInitialLimit,
    offset: normalizedInitialOffset,
    sort: normalizedInitialSort,
  });

  const [viewModel, setViewModel] = useState<NotesListViewModel>({
    notes: [],
    pagination: {
      total: 0,
      limit: normalizedInitialLimit,
      offset: normalizedInitialOffset,
    },
    sort: normalizedInitialSort,
    isLoading: true,
    isRefetching: false,
    error: null,
  });

  const reloadKeyRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = controller;

    setViewModel((prev) => ({
      ...prev,
      isLoading: !hasLoadedOnceRef.current,
      isRefetching: hasLoadedOnceRef.current,
      error: null,
      sort: queryParams.sort,
      pagination: {
        ...prev.pagination,
        limit: queryParams.limit,
        offset: queryParams.offset,
      },
    }));

    const fetchNotes = async () => {
      try {
        const queryString = createQueryString(queryParams);
        const response = await fetch(`/api/notes?${queryString}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          let payload: unknown = null;
          try {
            payload = await response.json();
          } catch (jsonError) {
            console.error("[useNotesList] Failed to parse error payload", jsonError);
          }

          const errorMessage = extractFriendlyErrorMessage(response.status, payload);
          throw new Error(errorMessage);
        }

        const data = (await response.json()) as NotesListResponseDTO;

        setViewModel({
          notes: data.notes,
          pagination: data.pagination,
          sort: queryParams.sort,
          isLoading: false,
          isRefetching: false,
          error: null,
        });

        hasLoadedOnceRef.current = true;
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Nie udało się pobrać listy notatek.";

        setViewModel((prev) => ({
          ...prev,
          isLoading: false,
          isRefetching: false,
          error: errorMessage,
        }));
      }
    };

    void fetchNotes();

    return () => {
      controller.abort();
    };
  }, [queryParams, reloadKeyRef.current]);

  const retry = useCallback(async () => {
    reloadKeyRef.current += 1;
    setQueryParams((prev) => ({ ...prev }));
  }, []);

  const setSortHandler = useCallback(async (nextSort: SortParams) => {
    const normalizedSort = normalizeSort(nextSort);

    setQueryParams((prev) => ({
      ...prev,
      sort: normalizedSort,
      offset: 0,
    }));
  }, []);

  const goToOffsetHandler = useCallback(async (nextOffset: number) => {
    const normalizedOffset = normalizeOffset(nextOffset);

    setQueryParams((prev) => ({
      ...prev,
      offset: normalizedOffset,
    }));
  }, []);

  return {
    viewModel,
    retry: retry,
    setSort: setSortHandler,
    goToOffset: goToOffsetHandler,
  };
}


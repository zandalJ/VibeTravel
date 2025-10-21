# API Endpoint Implementation Plan: Update Note

## 1. Przegląd punktu końcowego
- Aktualizuje istniejącą notatkę podróży użytkownika.
- Zapewnia walidację danych biznesowych (zakres dat, budżet, długość wyjazdu).
- Wymaga uwierzytelnionej sesji Supabase i kontroli właścicielskiej.
- Zwraca zaktualizowaną notatkę w postaci `NoteDTO`.

## 2. Szczegóły żądania
- Metoda HTTP: `PUT`
- Struktura URL: `/api/notes/:id` (`:id` = UUID notatki)
- Parametry:
  - Wymagane (URL): `id`
  - Opcjonalne: brak
- Request Body (JSON, `UpdateNoteCommand`):
  - `destination` (string, 1–255 znaków)
  - `start_date` (string ISO 8601 `YYYY-MM-DD`)
  - `end_date` (string ISO 8601 `YYYY-MM-DD`, ≥ `start_date`, różnica ≤ 14 dni)
  - `total_budget` (number > 0, opcjonalny; null jeżeli pominięty)
  - `additional_notes` (string ≤ 10 000 znaków, opcjonalny; null jeżeli pominięty)
- Nagłówki: `Content-Type: application/json`, nagłówki auth Supabase (sesja w cookies/headers)

## 3. Wykorzystywane typy
- `UpdateNoteCommand` i `NoteDTO` z `src/types.ts`
- `updateNoteSchema`, `validateNoteId` z `src/lib/validators/notes.validator.ts`
- `NotesService` z `src/lib/services/notes.service.ts`
- Błędy domenowe: `NotFoundError`, `ForbiddenError`, ew. `ValidationError` (jeśli istnieje) oraz mapowanie przez `createErrorResponse`

## 4. Szczegóły odpowiedzi
- 200 OK: Zwraca pełny `NoteDTO` (bez `user_id`).
- 400 Bad Request: przy błędach walidacji (Zod) lub niepoprawnym UUID (mapowane na `ValidationErrorResponseDTO`).
- 401 Unauthorized: brak aktywnej sesji Supabase.
- 403 Forbidden: użytkownik nie jest właścicielem notatki.
- 404 Not Found: notatka nie istnieje (lub została usunięta).
- 500 Internal Server Error: nieoczekiwane błędy bazy lub serwera.

## 5. Przepływ danych
1. Astro route (`PUT`) pobiera `supabase` z `context.locals` i `user` z sesji.
2. Waliduje `id` (UUID) za pomocą `validateNoteId`.
3. Parsuje body JSON, waliduje przez `updateNoteSchema.parse` → `UpdateNoteCommand`.
4. Sprawdza uwierzytelnienie (`context.locals.user`); w przyszłości usunąć fallbacky do `DEFAULT_USER_ID`.
5. Tworzy `NotesService` i wywołuje `updateNote(validatedNoteId, userId, validatedData)`.
6. Serwis weryfikuje właściciela (`getNoteById`) i wykonuje aktualizację w Supabase.
7. Zwraca zaktualizowany rekord; route opakowuje w `Response` z kodem 200 i JSON.
8. Błędy propagowane są do `createErrorResponse`, które mapuje je na struktury DTO.

## 6. Względy bezpieczeństwa
- Uwierzytelnianie: wymagane `context.locals.user`; w razie braku → 401.
- Autoryzacja: `NotesService.getNoteById` porównuje `user_id`; w razie rozbieżności → `ForbiddenError` (403).
- Brak ujawniania `user_id` w odpowiedzi.
- Walidacja danych wejściowych chroni przed SQL injection (zapytania parametryzowane przez Supabase) i nadużyciami.
- Ograniczać logi do niezbędnego minimum; logować identyfikatory, ale nie dane wrażliwe.

## 7. Obsługa błędów
- Zod `ZodError` → mapowane na 400 z `details`.
- `NotFoundError` → 404 z `code: "NOTE_NOT_FOUND"`.
- `ForbiddenError` → 403.
- Brak sesji (`!context.locals.user`) → 401 (`code: "UNAUTHORIZED"`).
- Błędy Supabase (`PostgrestError`) → 500 z ogólną wiadomością (`code: "INTERNAL_SERVER_ERROR"`).
- Logowanie błędów (console.error) dla diagnozy; można rozszerzyć o wpisy do `generation_logs` jeśli w przyszłości wymagamy śledzenia (obecnie nie dotyczy).

## 8. Rozważania dotyczące wydajności
- Operacja dotyczy pojedynczego rekordu, brak potrzeby optymalizacji.
- Zapytania Supabase są indeksowane po `id`; brak dodatkowych indeksów.
- Upewnić się, że `select().single()` zwraca tylko niezbędne kolumny (obecnie `*` — do rozważenia ograniczenie, jeśli koszt danych wzrośnie).
- Minimalizować wielokrotne zapytania: ewentualne przyszłe usprawnienie to transakcja lub `update ... returning` (już używane).

## 9. Etapy wdrożenia
1. Usuń tymczasowy fallback `DEFAULT_USER_ID`; wymuś 401, gdy `context.locals.user` jest nieobecny.
2. Zweryfikuj, że `createErrorResponse` mapuje `ZodError`, `ForbiddenError`, `NotFoundError` i błędy Supabase na oczekiwane kody — w razie potrzeby zaktualizuj mapowanie kodów (`NOTE_NOT_FOUND`).
3. Zrefaktoryzuj `NotesService` tak, aby używał przekazanego `userId` przy operacjach (usuń `DEFAULT_USER_ID` w `createNote` i innych metodach, jeśli dotyczy).
4. Upewnij się, że `updateNote` zwraca rekord zgodny z `NoteDTO` (bez `user_id`).
5. Dodaj/uzupełnij testy jednostkowe/integracyjne dla: poprawnej aktualizacji, błędów walidacji, braku autoryzacji, notatki spoza właściciela.
6. Zaktualizuj dokumentację API (np. `api-plan.md`) o finalne zachowanie.

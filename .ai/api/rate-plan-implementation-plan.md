# API Endpoint Implementation Plan: Submit Plan Feedback

## 1. Przegląd punktu końcowego
- Cel: pozwolić użytkownikowi ocenić wygenerowany plan podróży (👍/👎) w kontekście jego notatki.
- Typ operacji: modyfikacja istniejącego zasobu `plans` poprzez aktualizację pola `feedback`.
- Kontekst: wymaga weryfikacji właściciela planu; w fazie MVP dopuszcza fallback do testowego użytkownika, gdy brak sesji Supabase.

## 2. Szczegóły żądania
- Metoda HTTP: `POST`
- Struktura URL: `/api/plans/:id/feedback`
- Parametry:
  - Wymagane: `id` (UUID v4 w segmencie ścieżki; identyfikator planu)
  - Opcjonalne: brak
- Request Body (`application/json`):
  - `feedback`: liczba całkowita, wymagane; dozwolone wartości `1` (👍) lub `-1` (👎)
- Nagłówki: `Content-Type: application/json`

## 3. Wykorzystywane typy
- `SubmitFeedbackCommand` (z `src/types.ts`): model request body.
- `FeedbackResponseDTO` (z `src/types.ts`): model poprawnej odpowiedzi.
- `ErrorResponseDTO` / `ValidationErrorResponseDTO` (z `src/types.ts`): struktury błędów.
- Nowy walidator Zod (np. `planFeedbackSchema`) w `src/lib/validators/plan-feedback.validator.ts` oparty o `SubmitFeedbackCommand`.
- Serwis: rozszerzenie `PlansService` o metodę `submitFeedback(planId, userId, value)` zwracającą `FeedbackResponseDTO`.
- Wyjątki domenowe: `NotFoundError`, `ForbiddenError` (już zdefiniowane w `src/lib/errors/plan-generation.errors.ts`).

## 4. Szczegóły odpowiedzi
- `200 OK`
  ```json
  {
    "id": "uuid",
    "feedback": 1,
    "message": "Feedback recorded successfully"
  }
  ```
- `400 Bad Request`: nieprawidłowy JSON, błędne wartości, brak pola; komunikat `VALIDATION_ERROR` z mapą szczegółów.
- `403 Forbidden`: plan istnieje, ale należy do innego użytkownika (uwzględnić fallback usera).
- `404 Not Found`: plan nie istnieje.
- `500 Internal Server Error`: problemy bazodanowe lub inne nieoczekiwane wyjątki (obsłużyć przez `createErrorResponse`).
- `401` pozostaje wyłączony (MVP); komentarz w kodzie.

## 5. Przepływ danych
- Krok 1: Endpoint `POST /api/plans/[id]/feedback.ts` (nowy plik) pobiera `planId` z `context.params.id` i `supabase` + `user` z `context.locals`.
- Krok 2: Fallback user: `context.locals.user?.id || context.locals.session?.user?.id || DEFAULT_USER_ID`.
- Krok 3: Parser JSON z obsługą błędu niepoprawnego body (`try/catch`).
- Krok 4: Walidacja `planFeedbackSchema` (Zod). Błędy → `400`.
- Krok 5: Inicjalizacja `PlansService` z klientem Supabase.
- Krok 6: `PlansService.submitFeedback`:
  1. Pobiera plan + `notes.user_id` (JOIN) po `id`.
  2. Brak planu → `NotFoundError`.
  3. `notes.user_id !== userId` → `ForbiddenError`.
  4. Aktualizuje pole `feedback` w tabeli `plans` (wartość `null` → nowa wartość, lub nadpisanie).
  5. Zwraca `FeedbackResponseDTO` z `message` wg spec.
- Krok 7: Endpoint formuje odpowiedź `200` z JSON i nagłówkiem `Content-Type`.
- Krok 8: Wszystkie wyjątki przechodzą przez `createErrorResponse` (mapuje znane błędy na kody). Walidacja jest obsługiwana lokalnie.

## 6. Względy bezpieczeństwa
- Autoryzacja oparta o własność planu: podwójne sprawdzenie w serwisie.
- Brak wypisywania prywatnych danych w logach (logować tylko identyfikatory + komunikaty).
- Walidacja wejścia: Zod zabezpiecza przed wstrzyknięciem typów i błędami.
- Unikanie SQL injection: korzystamy z Supabase query buildera.
- Upewnić się, że fallback user dostępny tylko w środowisku MVP (oznaczyć komentarzem, TODO do usunięcia).
- Ochrona przed masowym odświeżaniem: brak limitów, ale endpoint jest idempotentny (ostatnie zgłoszenie zastępuje poprzednie).

## 7. Obsługa błędów
- Walidacja JSON / Zod → `400` z `ValidationErrorResponseDTO`.
- `NotFoundError` → mapowanie na `404 PLAN_NOT_FOUND` w `createErrorResponse` (dodać, jeżeli brak).
- `ForbiddenError` → `403 FORBIDDEN`.
- Błędy Supabase (`update`, `select`) → `500`. Logować przez `console.error` w serwisie.
- Niespodziewane wyjątki → `createErrorResponse` → `500 INTERNAL_ERROR`.
- Brak logowania do tabeli błędów (nie dotyczy); jeśli w przyszłości potrzebne, rozszerzyć generator logów.

## 8. Rozważania dotyczące wydajności
- Operacja SELECT + UPDATE na pojedynczym rekordzie; wpływ minimalny.
- Zapewnić indeks na `plans.id` (już istnieje jako PK) i `notes.id`.
- Unikać zbędnych selektów: pobrać plan i właściciela w pojedynczym zapytaniu (`select(..., notes!inner(user_id))`).
- Re-using Supabase client z `context.locals`, bez dodatkowych instancji.

## 9. Etapy wdrożenia
1. **Validator**: utworzyć `src/lib/validators/plan-feedback.validator.ts` z `planFeedbackSchema` + typy pomocnicze (eksport `PlanFeedbackInput`).
2. **Service**: rozszerzyć `PlansService` o metodę `submitFeedback` (select + update + mapowanie DTO); obsłużyć logowanie błędów.
3. **Endpoint**: dodać plik `src/pages/api/plans/[id]/feedback.ts` (POST handler):
   - parse JSON, walidacja Zod, fallback user, wywołanie serwisu, odpowiedzi.
   - użyć `createErrorResponse` w bloku `catch`.
4. **Error mapper**: zaktualizować `src/lib/utils/error-mapper.ts`, aby mapował `NotFoundError` planu na `404 PLAN_NOT_FOUND` oraz `ForbiddenError` na `403 FORBIDDEN` z właściwymi komunikatami.
5. **Typy**: upewnić się, że istniejące DTO (FeedbackResponseDTO) pasują; w razie potrzeby zaktualizować komentarze.
6. **Testy manualne / QA**: sprawdzić przypadki pozytywne (👍, 👎), niepoprawne wartości, brak body, plan innego użytkownika, plan nieistniejący.
7. **Dokumentacja**: dodać wpis do `.ai/api/api-plan.md` lub odpowiedniego dokumentu, jeśli wymagane.
8. **Przyszłe prace (TODO)**: zaznaczyć w kodzie konieczność zastąpienia fallback usera właściwą autentykacją po MVP.


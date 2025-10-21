# API Endpoint Implementation Plan: GET /api/notes

## 1. Przegląd punktu końcowego
- Zwrot listy notatek należących do uwierzytelnionego użytkownika wraz z metadanymi o wygenerowanych planach oraz informacją o paginacji.
- Endpoint służy do prezentacji listy notatek na dashboardzie oraz przygotowuje dane do dalszych operacji (np. szczegóły notatki, generowanie planów).

## 2. Szczegóły żądania
- Metoda HTTP: `GET`
- Struktura URL: `/api/notes`
- Parametry:
  - Wymagane: brak
  - Opcjonalne (zapytanie):
    - `sort` — format `field:direction`; dozwolone pola: `created_at`, `start_date`, `destination`; kierunki `asc`/`desc`; domyślnie `created_at:desc`
    - `limit` — zakres `1-100`, domyślnie `50`
    - `offset` — `>=0`, domyślnie `0`
- Request Body: brak
- Nagłówki istotne: sesja Supabase (lokale Astro `locals.session` lub `locals.supabase`)

## 3. Wykorzystywane typy
- `NotesListQueryParams`, `SortParams`, `NoteListItemDTO`, `NotesListResponseDTO` z `src/types.ts`
- Lokalne typy Zod do walidacji zapytań (nowe)

## 4. Szczegóły odpowiedzi
- Status 200 przy powodzeniu
- Struktura JSON zgodna z `NotesListResponseDTO`:
  - `notes`: tablica `NoteListItemDTO`
  - `pagination`: obiekt z `total`, `limit`, `offset`
- Puste wyniki zwracają `notes: []`, `total: 0`

## 5. Przepływ danych
1. Handler w `src/pages/api/notes.ts` pobiera `locals` (Supabase client + session) i parametry zapytania.
2. Walidacja oraz normalizacja parametrów za pomocą Zod; w razie błędu zwrot 400.
3. Wywołanie nowej funkcji serwisowej (np. `getNotesListForUser`) w `src/lib/services/notes` z argumentami: `supabase`, `userId`, `sort`, `limit`, `offset`.
4. Serwis:
   - Buduje zapytanie do tabeli `notes` z filtrem `user_id` i sortowaniem.
   - Dołącza agregację zliczającą `plan_count` (`plans` powiązane po `note_id`). Skorzystać z Supabase `select` z `plans(count)` lub osobnej kwerendy agregującej.
   - Wykonuje relację `range(offset, offset + limit - 1)` dla paginacji oraz równoległe pobranie `total` (np. `head` zapytanie lub osobna kwerenda `select('id', { count: 'exact', head: true })`).
   - Zwraca dane w formacie DTO (konwersja dat do ISO stringów poprzez Supabase/JS).
5. Handler mapuje dane serwisu na `NotesListResponseDTO` i zwraca JSON.

## 6. Względy bezpieczeństwa
- Wymagaj ważnej sesji Supabase; jeśli `locals.session` lub `locals.supabase` bez użytkownika — zwrot 401.
- Filtruj zapytania po `user_id` aby uniemożliwić dostęp do notatek innych użytkowników.
- Waliduj `sort` by akceptować tylko znane kolumny i metody sortowania, eliminując możliwość SQL injection.
- Ogranicz `limit` (max 100) i `offset` do wartości nieujemnych dla ochrony przed nadużyciami.
- Nie zwracaj informacji o błędach bazodanowych w szczegółach; loguj wewnętrznie.

## 7. Obsługa błędów
- 400 `VALIDATION_ERROR` — nieprawidłowy format `sort`, `limit`, `offset`; zwróć `ValidationErrorResponseDTO`.
- 401 `UNAUTHORIZED` — brak sesji użytkownika.
- 500 `INTERNAL_SERVER_ERROR` — błędy Supabase/nieoczekiwane; zwróć `ErrorResponseDTO` z ogólnym komunikatem, zaloguj szczegóły po stronie serwera.

## 8. Rozważania dotyczące wydajności
- Używaj selektywnych kolumn (`select('id,destination,start_date,end_date,total_budget,additional_notes,created_at,updated_at,plans(count)')`) aby ograniczyć transfer.
- Zapewnij indeksy w bazie na `notes(user_id, created_at)` oraz `plans(note_id)` (powinny istnieć zgodnie ze schematem, ale zweryfikować).
- Rozważ cache warstwy Supabase/HTTP (krótkotrwały) na poziomie przyszłych optymalizacji; obecnie dane użytkownika są dynamiczne, więc skip.
- Paginate z limitem 100, aby ograniczyć koszty.

## 9. Etapy wdrożenia
1. **Analiza istniejącego handlera** — sprawdź aktualny stan `src/pages/api/notes.ts`, zinwentaryzuj wspólne utilsy (np. `withErrorHandling`).
2. **Stwórz schemat walidacji** — przygotuj Zod schema (`notesListQuerySchema`) w nowym module `src/lib/validation/notes.ts` lub lokalnie w handlerze.
3. **Dodaj serwis** — utwórz `src/lib/services/notes/getNotesList.ts` z logiką pobierania i mapowania wyników Supabase na DTO.
4. **Aktualizuj handler** — w `src/pages/api/notes.ts`:
   - Pobierz `supabase` z `locals`.
   - Zweryfikuj sesję (`locals.session?.user.id`).
   - Parsuj parametry poprzez walidator.
   - Wywołaj serwis i zwróć `NotesListResponseDTO`.
   - Obsłuż błędy: `try/catch`, mapowanie do 400/500, logowanie przez `console.error` lub wspólny logger.
5. **Dodaj testy jednostkowe** (jeśli framework testowy istnieje) dla walidatora i serwisu; w przeciwnym razie przygotuj manualne scenariusze testowe.
6. **Ręczna weryfikacja** — lokalne wywołanie endpointu (np. HTTP client) dla różnych kombinacji `sort`, paginacji oraz przypadków błędów.
7. **Dokumentacja** — zaktualizuj `.ai/api-plan.md` lub inne artefakty, jeśli wymagane.


# API Endpoint Implementation Plan: Delete Note

## 1. Przegląd punktu końcowego
- Usuwa notatkę podróżną należącą do uwierzytelnionego użytkownika oraz wszystkie powiązane plany dzięki relacji kaskadowej w bazie Supabase.
- Wymaga aktywnej sesji Supabase i weryfikacji, że `user_id` notatki odpowiada zalogowanemu użytkownikowi.
- Zwraca `204 No Content` przy sukcesie, bez ładunku odpowiedzi.

## 2. Szczegóły żądania
- HTTP: `DELETE`
- URL: `/api/notes/:id`
- Parametry wymagane: `id` (UUID v4 w ścieżce, walidowany przez `validateNoteId`).
- Parametry opcjonalne: brak.
- Nagłówki: sesyjny `Authorization` zarządzany przez Supabase; brak dodatkowych nagłówków niestandardowych.
- Body: brak treści żądania.

## 3. Szczegóły odpowiedzi
- 204: brak body, poprawne usunięcie.
- 400: `ValidationErrorResponseDTO` z kodem `VALIDATION_ERROR` przy niepoprawnym UUID.
- 401: `ErrorResponseDTO` z kodem `UNAUTHORIZED` gdy `context.locals.user` nie istnieje.
- 403: `ErrorResponseDTO` z kodem `FORBIDDEN` gdy notatka należy do innego użytkownika.
- 404: `ErrorResponseDTO` z kodem `NOTE_NOT_FOUND` i metadanymi zasobu.
- 500: `ErrorResponseDTO` z kodem `INTERNAL_ERROR` dla nieoczekiwanych problemów Supabase lub runtime.

## 4. Przepływ danych
- Handler pobiera `id` z `context.params` i waliduje go funkcją `validateNoteId` (`zod`).
- System odczytuje `context.locals.user` oraz `context.locals.supabase`; brak użytkownika skutkuje błędem 401 bez dalszych zapytań.
- Tworzony jest `NotesService` z przekazanym `supabase`; serwis odpowiada za logikę biznesową i komunikację z bazą.
- `NotesService.deleteNote` najpierw wywołuje `getNoteById` (lub równoważną kwerendę) w celu weryfikacji istnienia notatki oraz dopasowania `user_id`.
- Po pozytywnej weryfikacji serwis wykonuje `delete` na tabeli `notes`; mechanizm FK ON DELETE CASCADE usuwa powiązane rekordy `plans`.
- Handler zwraca `Response(null, { status: 204 })`; błędy przekazuje do `createErrorResponse`, który mapuje je na standaryzowane DTO.

## 5. Względy bezpieczeństwa
- Wymuszona autoryzacja: brak fallbackowego `DEFAULT_USER_ID`; operacja dostępna wyłącznie przy obecności `context.locals.user`.
- Autoryzacja zasobów: przed usunięciem należy potwierdzić, że `user_id` notatki odpowiada `context.locals.user.id`.
- Zachowanie minimalnych logów: logować identyfikatory tylko w przestrzeni serwera, unikać podawania `user_id` w odpowiedziach.
- Walidacja wejścia eliminuje ryzyko SQL injection i błędów typów.
- Upewnić się, że polityki RLS Supabase blokują operacje na cudzych danych; serwis powinien stosować dodatkowy warunek `eq("user_id", userId)` jeśli polityki nie są jeszcze aktywne.

## 6. Obsługa błędów
- Zod (`validateNoteId`) → rzutuje `ZodError`; mapper zwróci 400 z detalami pola `id`.
- Brak sesji (`!context.locals.user`) → rzucić nowy `UnauthorizedError` lub standardowy obiekt zgodny z mapperem, aby otrzymać 401.
- `NotesService.getNoteById` rzuca `NotFoundError` (404) lub `ForbiddenError` (403) w zależności od sytuacji właściciela.
- Błędy Supabase podczas `delete` logujemy i opakowujemy w `Error`, co skutkuje 500.
- Sytuacje wyścigu (notatka usunięta przez inny proces) → brak rekordów w delete, zwrócić `NotFoundError`.

## 7. Wydajność
- Operacja usuwa pojedynczy rekord; koszt O(1) bez dodatkowych joinów.
- Ponowne użycie `getNoteById` oznacza dwa zapytania; jeśli stanowi to problem, można wykonać pojedyncze zapytanie `delete` z warunkiem `id` i `user_id`, jednak priorytetem jest klarowność i szczegółowe komunikaty błędów.
- Brak treści odpowiedzi zmniejsza narzut sieciowy.
- Supabase kaskada usuwa plany bez dodatkowych zapytań aplikacji.

## 8. Kroki implementacji
1. Utworzyć (jeśli brak) klasę błędu `UnauthorizedError` w `src/lib/errors/plan-generation.errors.ts`, dodać obsługę 401 w `error-mapper` z kodem `UNAUTHORIZED`.
2. Rozszerzyć `NotesService` o metodę `deleteNote(noteId: string, userId: string)` obejmującą weryfikację właściciela (`getNoteById`) oraz `delete` z Supabase i obsługę błędów/wyścigów.
3. Zaktualizować `src/pages/api/notes/[id].ts`, usuwając `DEFAULT_USER_ID`, i dodać handler `DELETE` korzystający z `validateNoteId`, autoryzacji użytkownika oraz nowej metody serwisowej; przy sukcesie zwrócić `204` bez body.
4. Zapewnić, że `createErrorResponse` otrzymuje wszystkie potencjalne wyjątki: uzupełnić mapowanie dla 401 oraz upewnić się, że `NotFoundError` zwraca kod `NOTE_NOT_FOUND`.
5. Dodać testy jednostkowe/integracyjne dla `NotesService.deleteNote` oraz e2e dla endpointu (przynajmniej przypadki 204, 403, 404, 401).
6. Zweryfikować polityki RLS Supabase i kaskadę ON DELETE między `notes` i `plans`; doprecyzować dokumentację w razie modyfikacji.
7. Uruchomić linty/testy (`pnpm lint`, `pnpm test`), a następnie przeprowadzić manualne QA (np. próba usunięcia cudzego zasobu) przed wdrożeniem.


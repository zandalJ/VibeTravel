# Plan implementacji widoku Panel Główny (Lista Notatek)

## 1. Przegląd
Widok „Panel Główny (Lista Notatek)” prezentuje użytkownikowi listę wszystkich jego notatek podróżniczych wraz z kluczowymi informacjami (cel podróży, daty, liczba wygenerowanych planów). Umożliwia szybkie przejście do tworzenia nowej notatki oraz nawigację do szczegółów istniejących notatek. Widok wspiera stany: ładowanie, pusty, błąd oraz sukces.

## 2. Routing widoku
- Ścieżka: `/dashboard`
- Ochrona: ścieżka docelowo chroniona (w MVP dopuszcza dostęp z fallbackiem użytkownika anonimowego, spójnie z API `/api/notes`).
- Integracja z layoutem: użycie `src/layouts/Layout.astro` (nagłówek/navbar wspólny w całej aplikacji).

## 3. Struktura komponentów
```
/src/pages/dashboard.astro
└── <NotesDashboardView client:load>
    ├── <DashboardHeader />
    │   └── <Button href="/notes/new">Dodaj nową notatkę</Button>
    ├── (conditional) <NotesListSkeleton />              // stan ładowania
    ├── (conditional) <NotesEmptyState />                // stan pusty
    ├── (conditional) <NotesErrorState onRetry=... />    // stan błędu
    ├── (conditional) <NotesList notes=...>
    │       └── <NoteCard ... /> × N                     // stan sukcesu
    └── (optional) <PaginationControls ... />            // stronicowanie
```
Pliki (nowe):
- `src/components/notes/NotesDashboardView.tsx` – kontener widoku
- `src/components/notes/NotesList.tsx` – lista kart w siatce
- `src/components/notes/NoteCard.tsx` – pojedyncza karta notatki (link)
- `src/components/notes/NotesListSkeleton.tsx` – placeholdery ładowania
- `src/components/notes/NotesEmptyState.tsx` – komunikat „empty” z CTA
- `src/components/notes/NotesErrorState.tsx` – komunikat błędu z Retry
- `src/components/notes/PaginationControls.tsx` (opcjonalnie)
- `src/components/hooks/useNotesList.ts` – hook do pobierania listy
- `src/pages/dashboard.astro` – strona Astro osadzająca widok React

## 4. Szczegóły komponentów
### NotesDashboardView
- Opis: Główny komponent-kontener widoku. Odpowiada za pobieranie danych (`GET /api/notes`), zarządzanie stanami (ładowanie/błąd/pusty/sukces), sortowanie i paginację. Orkiestruje render stanów i deleguje UI do komponentów prezentacyjnych.
- Główne elementy:
  - `DashboardHeader` z przyciskiem „Dodaj nową notatkę” (link do `/notes/new`).
  - Warunkowe renderowanie: `NotesListSkeleton`, `NotesEmptyState`, `NotesErrorState`, `NotesList`, `PaginationControls`.
- Obsługiwane interakcje:
  - `onRetry` (ponowne pobranie), zmiana strony (`onPageChange`), zmiana sortowania (opcjonalnie rozwijane menu).
- Walidacja/warunki:
  - Pilnowanie dozwolonych wartości sortowania i limitów (zgodnie z API: `field ∈ {created_at, start_date, destination}`, `direction ∈ {asc, desc}`, `limit ≤ 100`, `offset ≥ 0`).
- Typy: `NotesListViewModel`, `NoteListItemDTO`, `NotesListResponseDTO`, `SortParams`.
- Propsy: brak (komponent strony). 

### DashboardHeader
- Opis: Pasek nagłówka widoku z tytułem i CTA do tworzenia notatki.
- Główne elementy: nagłówek H1, przycisk (`<a href="/notes/new">`).
- Interakcje: klik „Dodaj nową notatkę” → nawigacja do `/notes/new`.
- Walidacja: brak.
- Typy: brak własnych, statyczny komponent.
- Propsy: opcjonalnie `className`.

### NotesList
- Opis: Siatka kart notatek.
- Główne elementy: kontener `<ul>` (a11y), elementy `<li>` z `NoteCard`.
- Interakcje: brak (interakcje w `NoteCard`).
- Walidacja: render tylko z poprawnym `notes[]`.
- Typy: `NoteListItemDTO[]`.
- Propsy: `{ notes: NoteListItemDTO[] }`.

### NoteCard
- Opis: Karta prezentująca pojedyńczą notatkę w formie linku. Zawiera cel podróży, zakres dat i badge z `plan_count`.
- Główne elementy: `Card` z Shadcn/ui, wewnątrz `<a href="/notes/{id}" aria-label="Przejdź do notatki {destination}" role="link">`.
- Interakcje: klik w kartę → `/notes/:id`.
- Walidacja: ostrożność przy formatowaniu dat (nieprawidłowe daty → wyświetlenie „—”).
- Typy: `Pick<NoteListItemDTO, "id" | "destination" | "start_date" | "end_date" | "plan_count">`.
- Propsy: `{ note: NoteListItemDTO }`.

### NotesListSkeleton
- Opis: Placeholdery kart w siatce na czas ładowania.
- Główne elementy: kilka „kart-szkieletów” z klasami tailwind.
- Interakcje: brak.
- Walidacja: brak.
- Typy: brak.
- Propsy: `{ count?: number }` (domyślnie 6–8).

### NotesEmptyState
- Opis: Widok pustki z komunikatem i CTA „Stwórz pierwszą notatkę”.
- Główne elementy: ikona/emoji, tekst, `<a href="/notes/new">`.
- Interakcje: klik w CTA → `/notes/new`.
- Walidacja: brak.
- Typy: brak.
- Propsy: opcjonalnie `onCreateFirst` (jeśli zamiast linka chcemy callback).

### NotesErrorState
- Opis: Komunikat błędu z przyciskiem „Spróbuj ponownie”.
- Główne elementy: tekst błędu (dla developerów ukryty w konsoli), przycisk Retry.
- Interakcje: `onRetry()` wywołuje ponowne pobranie danych.
- Walidacja: brak.
- Typy: brak.
- Propsy: `{ onRetry: () => void, message?: string }`.

### PaginationControls (opcjonalnie w MVP)
- Opis: Sterowanie stronicowaniem listy.
- Główne elementy: „Poprzednia”, „Następna”, numer strony.
- Interakcje: `onPageChange(newOffset)`.
- Walidacja: wyłączanie przycisków przy braku następnej/poprzedniej strony.
- Typy: z `NotesListResponseDTO.pagination`.
- Propsy: `{ total: number; limit: number; offset: number; onChange: (offset: number) => void }`.

## 5. Typy
Wykorzystanie istniejących typów z `src/types.ts`:
- `NoteListItemDTO` – element listy notatek (z `plan_count`).
- `NotesListResponseDTO` – odpowiedź API listy (`notes`, `pagination`).
- `SortParams` – `{ field: "created_at" | "start_date" | "destination"; direction: "asc" | "desc" }`.
- `NotesListQueryParams` – parametry zapytania.

Nowe typy (frontend – view i hook):
- `NotesListViewModel`:
  - `notes: NoteListItemDTO[]`
  - `pagination: { total: number; limit: number; offset: number }`
  - `sort: SortParams`
  - `isLoading: boolean`
  - `isRefetching: boolean` (gdy odświeżamy bez pełnego skeletonu)
  - `error: string | null`
- `UseNotesListParams`:
  - `limit?: number` (domyślnie 50, max 100)
  - `offset?: number` (domyślnie 0)
  - `sort?: SortParams` (domyślnie `created_at:desc`)
- `UseNotesListReturn`:
  - `viewModel: NotesListViewModel`
  - `retry: () => Promise<void>`
  - `setSort: (sort: SortParams) => Promise<void>`
  - `goToOffset: (offset: number) => Promise<void>`

## 6. Zarządzanie stanem
- Stosujemy dedykowany hook `useNotesList` do izolacji logiki pobierania i zarządzania stanem.
- Hook utrzymuje `viewModel` oraz udostępnia akcje: `retry`, `setSort`, `goToOffset`.
- Flow:
  1. Inicjalizacja: `isLoading=true` → `fetch(/api/notes?sort=...&limit=...&offset=...)`.
  2. Sukces: `notes`, `pagination`, reset błędu, `isLoading=false`.
  3. Błąd: `error` (string z przyjaznym komunikatem), `isLoading=false`.
- Dodatkowo `isRefetching` dla lekkich odświeżeń (np. zmiana sortowania) – pozwala uniknąć migotania skeletonów.
- Wyliczenia pochodne: `isEmpty = !isLoading && !error && viewModel.notes.length === 0`.

## 7. Integracja API
- Endpoint: `GET /api/notes`
- Query params zgodne z `NotesListQueryParams` i `SortParams`:
  - `sort`: `"created_at:desc"` (domyślnie) lub `"start_date:asc"`, `"destination:asc"`, itp.
  - `limit`: `1..100` (domyślnie 50)
  - `offset`: `>= 0` (domyślnie 0)
- Odpowiedź 200 OK: `NotesListResponseDTO`:
  - `notes: NoteListItemDTO[]`
  - `pagination: { total, limit, offset }`
- Obsługa błędów:
  - 400 `VALIDATION_ERROR`: wyświetlenie komunikatu „Nieprawidłowe parametry filtrowania/sortowania”.
  - 500 `INTERNAL_ERROR`: komunikat ogólny „Wystąpił błąd po stronie serwera”.
- Implementacja fetch (typowana): parsowanie JSON do interfejsów z `src/types.ts`.

## 8. Interakcje użytkownika
- Klik „Dodaj nową notatkę” → przejście do `/notes/new`.
- Klik w `NoteCard` → przejście do `/notes/:id` (element linku lub rola `link` + `Enter` z klawiatury).
- Klik „Spróbuj ponownie” w stanie błędu → ponowne pobranie (`retry`).
- Paginacja (jeśli włączona): „Następna/Poprzednia” → `goToOffset(...)`.
- (Opcjonalnie) Zmiana sortowania: aktualizacja `sort` → odświeżenie listy.

## 9. Warunki i walidacja
- Walidacja parametrów UI zanim trafią do API:
  - `limit` nie większy niż 100; dolny limit 1.
  - `offset` nieujemny.
  - `sort.field` tylko z dozwolonego zbioru; `sort.direction` tylko `asc|desc`.
- Formatowanie dat:
  - Daty ISO z API formatowane przez `Intl.DateTimeFormat` (lokalizacja `pl-PL`), np. `01.12.2025 – 07.12.2025`.
  - Gdy brak/niepoprawne daty → wyświetl `—`.
- A11y:
  - Karty są linkami (`<a>` lub element z `role="link"` i obsługą klawiatury).
  - Tekst alternatywny/`aria-label` z destynacją.

## 10. Obsługa błędów
- Sieć nieosiągalna / timeout: stan błędu z przyciskiem „Spróbuj ponownie”.
- 400 `VALIDATION_ERROR`: przyjazny komunikat i reset UI do stabilnego stanu; umożliw Retry (z domyślnymi parametrami).
- 500 `INTERNAL_ERROR`: komunikat ogólny, możliwość Retry.
- Pusta lista (200 z `total=0`): `NotesEmptyState` z CTA do `/notes/new`.
- Degradacja: gdy części pól brakuje, karta renderuje bezpieczne wartości zastępcze.

## 11. Kroki implementacji
1. Utwórz hook `src/components/hooks/useNotesList.ts`:
   - Zaimplementuj pobieranie `GET /api/notes` z obsługą `limit`, `offset`, `sort`.
   - Zaimplementuj stany: `isLoading`, `isRefetching`, `error` i `NotesListViewModel`.
   - Eksportuj akcje: `retry`, `setSort`, `goToOffset`.
2. Dodaj komponent `NotesDashboardView.tsx`:
   - Użyj hooka, wyrenderuj `DashboardHeader` + warunkowe stany (`Skeleton`/`Empty`/`Error`/`List`).
   - (Opcjonalnie) dodaj prosty selektor sortowania lub pozostaw domyślne `created_at:desc`.
3. Zaimplementuj prezentacyjne komponenty: `NotesList`, `NoteCard`, `NotesListSkeleton`, `NotesEmptyState`, `NotesErrorState` (+ `PaginationControls` jeśli potrzebne).
   - Zastosuj komponenty z `src/components/ui` (Shadcn/ui) oraz Tailwind 4.
   - Dopilnuj dostępności (linki, role, focus styles).
4. Dodaj stronę `src/pages/dashboard.astro`:
   - Osadź `<NotesDashboardView client:load />` w `Layout.astro`.
   - Ustaw tytuł strony (np. `Twoje notatki`).
5. Testy manualne scenariuszy:
   - Ładowanie (skeleton), Pusta lista, Błąd (odłącz sieć), Sukces z listą, Nawigacja do `/notes/:id`, CTA do `/notes/new`.
   - (Jeśli paginacja) sprawdź `total`, granice stron, offset.
6. A11y i UX:
   - Sprawdź tab-nawigację, focus ringi, `aria-label` na kartach.
7. Porządek i lint:
   - Uruchom linter, popraw ostrzeżenia, dopasuj style do istniejącego kodu.

---

Zgodność z PRD i historyjkami:
- US-004 (empty state + CTA) – zapewnia `NotesEmptyState` z linkiem do `/notes/new`.
- US-006 (lista notatek + kluczowe informacje + nawigacja) – karty pokazują cel i daty; klik prowadzi do `/notes/:id`.

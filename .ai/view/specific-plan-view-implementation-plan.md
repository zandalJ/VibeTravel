# Plan implementacji widoku Wygenerowany Plan

## 1. Przegląd
Widok "Wygenerowany Plan" prezentuje szczegóły pojedynczego planu podróży wygenerowanego przez AI. Umożliwia czytelne wyświetlenie treści w formacie Markdown, przekazanie opinii (👍/👎), skopiowanie treści do schowka oraz szybki powrót do szczegółów notatki, do której plan należy. Widok wspiera stany: ładowanie, błąd oraz sukces.

## 2. Routing widoku
- Ścieżka: `/plans/:id`
- Ochrona: ścieżka docelowo chroniona (w MVP dostęp z fallbackiem użytkownika testowego; spójnie z backendem `/api/plans/:id`).
- Integracja z layoutem: użycie `src/layouts/Layout.astro` (navbar, wspólna nawigacja).

## 3. Struktura komponentów
```
/src/pages/plans/[id].astro
└── <GeneratedPlanView client:load planId={id}>
    ├── <PlanHeader />
    │   ├── Informacje o notatce (destynacja, daty)
    │   └── Link powrotny do /notes/{note_id}
    ├── (conditional) <PlanContentSkeleton />           // stan ładowania
    ├── (conditional) <PlanErrorState onRetry=... />    // stan błędu
    ├── (conditional) <PlanContent />                   // sukces
    │   ├── <MarkdownRenderer content=plan.content />
    │   ├── <CostDisclaimer />                          // komunikat o szacunkowych kosztach
    │   ├── <ActionsBar>
    │   │   ├── <CopyToClipboardButton />
    │   │   └── <FeedbackButtons />                     // 👍/👎 → POST /api/plans/:id/feedback
    │   └── (opcjonalnie) <PlanMeta />                  // prompt_version, data utworzenia
    └── <Toaster />                                     // potwierdzenia/komunikaty
```
Pliki (nowe):
- `src/pages/plans/[id].astro` – strona Astro osadzająca widok React.
- `src/components/notes/GeneratedPlanView.tsx` – kontener widoku (pobranie danych, zarządzanie stanem, render stanów).
- `src/components/notes/PlanHeader.tsx` – nagłówek z informacjami o notatce i linkiem powrotnym.
- `src/components/notes/PlanContent.tsx` – sekcja z treścią planu, przyciskami akcji i adnotacjami.
- `src/components/notes/PlanContentSkeleton.tsx` – skeleton dla stanu ładowania.
- `src/components/notes/PlanErrorState.tsx` – prezentacja błędu z możliwością Retry.
- `src/components/notes/FeedbackButtons.tsx` – przyciski 👍/👎 z obsługą POST feedback.
- `src/components/notes/CopyToClipboardButton.tsx` – kopiowanie zawartości.
- `src/components/notes/MarkdownRenderer.tsx` – render treści Markdown (można użyć `react-markdown` + dopasowane style).
- `src/components/notes/CostDisclaimer.tsx` – komunikat o szacunkowych kosztach.
- (opcjonalnie) `src/components/notes/PlanMeta.tsx` – metadane planu.
- Hook: `src/components/hooks/useGeneratedPlan.ts` – logika pobierania planu i obsługi akcji feedback/kopiowanie.

## 4. Szczegóły komponentów
### GeneratedPlanView
- Opis: Główny komponent-kontener widoku. Odpowiada za pobranie danych planu `GET /api/plans/:id`, zarządzanie stanem (`isLoading`, `error`, `data`) oraz orkiestrację UI stanów; deleguje render do komponentów prezentacyjnych.
- Główne elementy: `PlanHeader`, warunkowe renderowanie `PlanContentSkeleton`/`PlanErrorState`/`PlanContent`, `Toaster` z `shadcn/ui`.
- Obsługiwane interakcje: ponowne pobranie danych (`onRetry`), akcje feedbacku i kopiowania (delegowane).
- Walidacja: weryfikacja `planId` (UUID) na poziomie strony/komponentu – jeśli nieprawidłowy → stan błędu z komunikatem o niepoprawnym identyfikatorze.
- Typy: `PlanDTO` (z `src/types.ts`), `GeneratedPlanViewModel` (nowy typ opisany niżej), `ErrorResponseDTO`.
- Propsy: `{ planId: string }`.

### PlanHeader
- Opis: Nagłówek widoku wyświetlający kontekst notatki (destynacja, zakres dat) oraz link powrotny do `/notes/{note_id}`.
- Główne elementy: `h1` (np. destynacja), `p` (formatowane daty), `<a href="/notes/{note_id}">← Powrót do notatki</a>`.
- Interakcje: klik w link powrotny.
- Walidacja: bezpośrednia – renderuje bezpieczne wartości nawet przy brakach (fallback `—`).
- Typy: `Pick<PlanDTO["note"], "destination" | "start_date" | "end_date"> & { note_id: string }`.
- Propsy: `{ note: PlanDTO["note"], noteId: string }`.

### PlanContent
- Opis: Prezentuje treść planu (Markdown) oraz akcje.
- Główne elementy: `MarkdownRenderer`, `CostDisclaimer`, `ActionsBar` (z `CopyToClipboardButton`, `FeedbackButtons`), opcjonalnie `PlanMeta`.
- Interakcje: `onCopy`, `onFeedback(1|-1)`; wyświetla toasty po operacjach.
- Walidacja: długość treści do 10 000 znaków (informacyjne ograniczenie z PRD – UI nie tnie, ale można ostrzec przy wyjątkowo długim wejściu np. licznik znaków/ostrożne style overflow).
- Typy: `PlanDTO`.
- Propsy: `{ plan: PlanDTO; onCopy: (content: string) => Promise<void>; onFeedback: (value: 1 | -1) => Promise<void>; }`.

### PlanContentSkeleton
- Opis: Skeleton loader dla stanu ładowania.
- Główne elementy: placeholdery bloków tekstu (Tailwind), karta z tytułem.
- Interakcje: brak.
- Walidacja: brak.
- Typy: brak.
- Propsy: opcjonalnie `{ lines?: number }`.

### PlanErrorState
- Opis: Widok błędu na całą szerokość z przyciskiem „Spróbuj ponownie”.
- Główne elementy: `Card` z tytułem i opisem błędu, `Button` Retry.
- Interakcje: `onRetry()`.
- Walidacja: brak.
- Typy: brak.
- Propsy: `{ message?: string; onRetry: () => void }`.

### MarkdownRenderer
- Opis: Render treści Markdown z bezpiecznym mapowaniem elementów (nagłówki, listy, tabele, code blocks). Stylowanie zgodne z Tailwind i trybem dark.
- Główne elementy: wykorzystanie `react-markdown` z wtyczkami (opcjonalnie) i klasami `prose`.
- Interakcje: brak.
- Walidacja: sanityzacja/bezpieczne renderowanie HTML (nie umożliwia wstrzyknięcia niebezpiecznego HTML; jeśli dopuszczamy HTML – sanitization!). Domyślnie bez `remark-gfm` z `allowDangerousHtml=false`.
- Typy: `{ content: string }`.
- Propsy: `{ content: string }`.

### CopyToClipboardButton
- Opis: Przycisk kopiowania całości treści planu do schowka. Po sukcesie wywołuje toast.
- Główne elementy: `Button` z ikoną `Copy`.
- Interakcje: `onClick` → używa `navigator.clipboard.writeText(content)`; po sukcesie: toast „Skopiowano!”; po błędzie: toast z komunikatem.
- Walidacja: sprawdzenie dostępności API schowka (fallback: zaznaczenie tekstu i `document.execCommand('copy')` – opcjonalne).
- Typy: `{ content: string }`.
- Propsy: `{ content: string }`.

### FeedbackButtons
- Opis: Dwa przyciski (👍/👎) do wysyłania opinii o planie.
- Główne elementy: dwa `Button`/`IconButton` z wariantami (outline/solid) sygnalizującymi wybór.
- Interakcje: `onVote(1)` lub `onVote(-1)` → `POST /api/plans/:id/feedback`; po sukcesie: wizualne zaznaczenie aktywnego przycisku oraz toast; przy ponownym kliknięciu tej samej opcji – bez zmian (idempotencja po stronie serwisu; w UI blokujemy podwójne wysyłki podczas trwania requestu).
- Walidacja: `feedback ∈ {1, -1}`; blokada przy trwającym żądaniu.
- Typy: `{ planId: string; current?: 1 | -1 | null }`.
- Propsy: `{ planId: string; currentFeedback: 1 | -1 | null; onChange?: (value: 1 | -1) => void }`.

### CostDisclaimer
- Opis: Tekstowy komunikat pod treścią planu: "Przedstawione koszty mają charakter szacunkowy i mogą się różnić w zależności od sezonu, dostępności i preferencji." (dokładne brzmienie wg copy).
- Główne elementy: `p` z klasą `text-sm text-muted-foreground`.
- Interakcje: brak.
- Walidacja: brak.
- Typy: brak.
- Propsy: opcjonalnie `className`.

### PlanMeta (opcjonalnie)
- Opis: Niewielka sekcja z metadanymi planu (wersja promptu, data utworzenia).
- Główne elementy: lista definicji `dl`/`dt`/`dd`.
- Interakcje: brak.
- Walidacja: brak.
- Typy: `Pick<PlanDTO, "prompt_version" | "created_at">`.
- Propsy: `{ promptVersion: string; createdAt: string }`.

## 5. Typy
- Wykorzystanie istniejących typów z `src/types.ts`:
  - `PlanDTO` – pełne dane planu wraz z osadzonymi danymi notatki.
  - `SubmitFeedbackCommand` – `{ feedback: 1 | -1 }`.
  - `FeedbackResponseDTO` – odpowiedź po `POST /api/plans/:id/feedback`.
  - `ErrorResponseDTO` – standardowa struktura błędu.
- Nowe typy (frontend):
  - `GeneratedPlanViewModel`:
    - `plan: PlanDTO | null`
    - `isLoading: boolean`
    - `error: string | null`
    - `isSubmittingFeedback: boolean`
    - `currentFeedback: 1 | -1 | null` // z `plan.feedback`
  - `UseGeneratedPlanParams`:
    - `planId: string`
  - `UseGeneratedPlanReturn`:
    - `viewModel: GeneratedPlanViewModel`
    - `retry: () => Promise<void>`
    - `submitFeedback: (value: 1 | -1) => Promise<void>`
    - `copy: () => Promise<void>`

## 6. Zarządzanie stanem
- Dedykowany hook `useGeneratedPlan(planId)` enkapsuluje logikę pobierania i akcji:
  - Inicjalne pobranie: `GET /api/plans/:id` → ustawia `plan`, `currentFeedback = plan.feedback ?? null`, `isLoading=false`.
  - `retry()` ponawia pobranie po błędzie.
  - `submitFeedback(value)`:
    - Ustaw `isSubmittingFeedback=true`.
    - Wyślij `POST /api/plans/:id/feedback` z `{ feedback: value }`.
    - Po sukcesie: zaktualizuj `currentFeedback` i pokaż toast potwierdzający.
    - Po błędzie: toast z komunikatem; nie zmieniaj `currentFeedback`.
    - Zawsze na końcu: `isSubmittingFeedback=false`.
  - `copy()`:
    - Skopiuj `plan.content` do schowka.
    - Toast: „Skopiowano!”.
- UI stany pochodne: `hasPlan = !!plan`, `canVote = !isSubmittingFeedback && hasPlan`.

## 7. Integracja API
- Pobranie planu:
  - `GET /api/plans/:id`
  - Odpowiedź 200: `PlanDTO` (z polami: `id`, `note_id`, `content`, `prompt_version`, `feedback`, `created_at`, `note: { destination, start_date, end_date }`).
  - Błędy:
    - `400 VALIDATION_ERROR` (np. zły UUID) → stan błędu, komunikat „Nieprawidłowy identyfikator planu”.
    - `403 FORBIDDEN` → komunikat „Brak uprawnień do tego planu”.
    - `404 PLAN_NOT_FOUND` → komunikat „Plan nie został znaleziony”.
    - (MVP) 401 nie jest zwracane (fallback użytkownika testowego).
- Wysłanie opinii:
  - `POST /api/plans/:id/feedback` z ciałem `{ feedback: 1 | -1 }`.
  - Odpowiedź 200: `FeedbackResponseDTO` z komunikatem sukcesu; aktualizujemy `currentFeedback` w UI.
  - Błędy: `400 VALIDATION_ERROR`, `403 FORBIDDEN`, `404 PLAN_NOT_FOUND`.

## 8. Interakcje użytkownika
- Wejście na `/plans/:id` → skeleton → po sukcesie treść Markdown + pasek akcji.
- Klik „Kopiuj do schowka” → treść planu w schowku, toast „Skopiowano!”.
- Klik „👍” lub „👎” → wysyłka feedbacku, toast potwierdzający, wizualne zaznaczenie aktywnej opcji.
- Klik „← Powrót do notatki” → navigacja do `/notes/{note_id}`.
- Retry po błędzie → ponowne pobranie.

## 9. Warunki i walidacja
- Walidacja identyfikatora planu (UUID) – w razie oczywistych błędów po stronie klienta można pokazać natychmiast komunikat bez wywołania API; nadrzędnie i tak waliduje backend.
- Długość treści ≤ 10 000 znaków (z PRD) – UI nie ogranicza, ale komponent `MarkdownRenderer` powinien być wydajny (lazy render dla długich treści, style `prose` z zawijaniem; opcjonalnie code-splitting).
- Przycisk feedback zablokowany podczas trwającej wysyłki.
- Przy braku `plan.note` lub polach dat – render bezpiecznych wartości (`—`).
- A11y: 
  - region `main`, nagłówki semantyczne, focus styles,
  - przyciski z etykietami `aria-label` („Oceń pozytywnie”, „Oceń negatywnie”, „Kopiuj plan”),
  - treść Markdown w kontenerze z klasą `prose` i odpowiednim kontrastem.

## 10. Obsługa błędów
- Sieć/500: karta błędu z przyciskiem Retry.
- 400 `VALIDATION_ERROR`: komunikat „Nieprawidłowy identyfikator planu”.
- 403 `FORBIDDEN`: komunikat „Nie masz uprawnień do tego planu”.
- 404 `PLAN_NOT_FOUND`: komunikat „Plan nie został znaleziony”.
- Błąd kopiowania schowka: toast „Nie udało się skopiować. Spróbuj ponownie.”
- Błąd feedbacku: toast z treścią z `error.message` lub ogólny fallback.

## 11. Kroki implementacji
1. Utwórz stronę `src/pages/plans/[id].astro` osadzającą `<GeneratedPlanView client:load planId={id} />` w `Layout.astro` (analogicznie do `notes/[id].astro`).
2. Dodaj hook `src/components/hooks/useGeneratedPlan.ts` implementujący: pobieranie `GET /api/plans/:id`, stany `isLoading/error`, akcje `retry`, `submitFeedback`, `copy`.
3. Stwórz komponent kontenera `GeneratedPlanView.tsx` korzystający z hooka; wyrenderuj `PlanHeader`, warunkowe: `PlanContentSkeleton`/`PlanErrorState`/`PlanContent`; podłącz `Toaster`.
4. Zaimplementuj `PlanHeader.tsx` (destynacja, daty, link powrotny `/notes/{note_id}`) z poprawnym formatowaniem dat `pl-PL` i fallbackami.
5. Zaimplementuj `MarkdownRenderer.tsx` z `react-markdown` (bez niebezpiecznego HTML), stylowanie `prose` i wsparcie list, nagłówków, tabel; rozważ code-splitting/lazy.
6. Dodaj `PlanContent.tsx` łączący `MarkdownRenderer`, `CostDisclaimer`, `CopyToClipboardButton`, `FeedbackButtons`; przekaż wymagane prop-y i obsługę zdarzeń.
7. Dodaj `FeedbackButtons.tsx` realizujący POST do `/api/plans/:id/feedback`; zablokuj na czas wysyłki; podświetl aktywną ocenę.
8. Dodaj `CopyToClipboardButton.tsx` z użyciem `navigator.clipboard.writeText` i toastami.
9. Dodaj `PlanContentSkeleton.tsx` i `PlanErrorState.tsx` (spójne z istniejącymi skeletonami/stylami w projekcie).
10. Testy manualne: scenariusze sukces/błąd (400/403/404), długie treści Markdown, kopiowanie, feedback (również ponowny klik), dostępność (klawiatura, aria-labels), dark mode.
11. Lint/typy: sprawdź TypeScript i linter; upewnij się, że użyte typy (`PlanDTO`, `FeedbackResponseDTO`) są poprawnie importowane z `src/types.ts`.
12. Opcjonalnie: `PlanMeta.tsx` z wersją promptu i datą utworzenia; cache-control na poziomie fetchu (szanuj `Cache-Control` z API).

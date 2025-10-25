```
# Plan implementacji widoku Szczegóły Notatki

## 1. Przegląd
Widok "Szczegóły Notatki" jest centralnym miejscem do zarządzania pojedynczą notatką podróżniczą. Jego głównym celem jest wyświetlenie wszystkich zapisanych informacji o podróży, umożliwienie użytkownikowi generowania spersonalizowanych planów podróży przy użyciu AI oraz przeglądanie historii wcześniej wygenerowanych wersji. Widok ten stanowi kluczowy element pętli interakcji użytkownika z główną funkcjonalnością aplikacji VibeTravel.

## 2. Routing widoku
Widok będzie dostępny pod dynamiczną ścieżką URL, która zawiera identyfikator konkretnej notatki:
* **Ścieżka**: `/notes/:id`
* **Przykład**: `/notes/a1b2c3d4-e5f6-7890-1234-56789abcdef0`

## 3. Struktura komponentów
Komponenty zostaną zorganizowane w logiczną hierarchię, gdzie komponent strony zarządza stanem i przekazuje dane do komponentów prezentacyjnych.

```

/src/pages/notes/[id].astro
└── \<NoteDetailsView client:load noteId={id}\>
├── \<NoteDetailsCard /\>
│   ├── Dane notatki (Cel, Daty, Budżet, Notatki)
│   └── Przyciski akcji ("Edytuj", "Usuń")
├── \<PlanGenerationControl /\>
│   ├── Przycisk "Generuj Plan"
│   └── Licznik pozostałych generacji
├── \<PlanHistoryList /\>
│   └── \<PlanHistoryItem /\> (mapowane)
│       ├── Link do historycznego planu
│       └── Data wygenerowania
└── \<ConfirmationDialog /\> (modal)
├── Komunikat potwierdzający usunięcie
└── Przyciski "Potwierdź", "Anuluj"

````

---

## 4. Szczegóły komponentów
### NoteDetailsView
- **Opis komponentu**: Główny komponent-kontener dla widoku `/notes/:id`. Odpowiedzialny za pobieranie danych z API, zarządzanie całym stanem widoku (dane notatki, historia planów, stany ładowania i błędów) oraz koordynację akcji użytkownika.
- **Główne elementy**: Wykorzystuje `NoteDetailsCard`, `PlanGenerationControl`, `PlanHistoryList` i `ConfirmationDialog` do zbudowania kompletnego interfejsu. Renderuje komunikaty o błędach lub wskaźniki ładowania na poziomie całej strony.
- **Obsługiwane interakcje**:
    - Pobieranie danych notatki i historii planów przy pierwszym załadowaniu.
    - Wywołanie generowania nowego planu.
    - Otwarcie i zamknięcie modala potwierdzającego usunięcie.
    - Wywołanie usunięcia notatki.
- **Obsługiwana walidacja**: Brak bezpośredniej walidacji; deleguje ją do komponentów podrzędnych.
- **Typy**: `NoteDetailsViewModel`, `NoteDTO`, `PlanListItemDTO`.
- **Propsy**: `noteId: string`.

### NoteDetailsCard
- **Opis komponentu**: Komponent prezentacyjny wyświetlający szczegółowe informacje o notatce. Zawiera również przyciski do edycji i usuwania.
- **Główne elementy**: Elementy `div`, `h2`, `p` do wyświetlania danych. Komponent `Button` z `shadcn/ui` dla akcji "Edytuj" i "Usuń". Przycisk "Edytuj" będzie linkiem nawigującym do `/notes/:id/edit`.
- **Obsługiwane interakcje**:
    - `onClick` na przycisku "Usuń" (wywołuje funkcję `onDeleteClick` z propsów).
    - Nawigacja do strony edycji po kliknięciu "Edytuj".
- **Obsługiwana walidacja**: Brak.
- **Typy**: `NoteDTO`.
- **Propsy**:
    - `note: NoteDTO`
    - `onDeleteClick: () => void`

### PlanGenerationControl
- **Opis komponentu**: Interaktywny komponent zawierający przycisk do generowania planu oraz informację o pozostałej liczbie generacji w bieżącym miesiącu.
- **Główne elementy**: Komponent `Button` z `shadcn/ui`, element `p` do wyświetlania licznika.
- **Obsługiwane interakcje**:
    - `onClick` na przycisku "Generuj Plan" (wywołuje funkcję `onGeneratePlan` z propsów).
- **Obsługiwana walidacja**: Przycisk "Generuj Plan" jest nieaktywny (`disabled`), gdy:
    - Trwa proces generowania (`isGenerating`).
    - Liczba pozostałych generacji wynosi 0 (`remainingGenerations === 0`).
    - Profil użytkownika jest niekompletny (`isProfileComplete === false`).
- **Typy**: Brak specyficznych typów.
- **Propsy**:
    - `remainingGenerations: number | null`
    - `isGenerating: boolean`
    - `isProfileComplete: boolean`
    - `onGeneratePlan: () => void`

### PlanHistoryList
- **Opis komponentu**: Komponent prezentacyjny, który renderuje listę historycznych planów wygenerowanych dla danej notatki.
- **Główne elementy**: Element `ul` lub `div` jako kontener. Mapuje tablicę planów na komponenty `PlanHistoryItem`. Wyświetla stan pusty ("Brak wygenerowanych planów"), jeśli lista jest pusta.
- **Obsługiwane interakcje**: Brak.
- **Obsługiwana walidacja**: Brak.
- **Typy**: `PlanListItemDTO[]`.
- **Propsy**: `plans: PlanListItemDTO[]`.

### ConfirmationDialog
- **Opis komponentu**: Modal (okno dialogowe) używany do uzyskania od użytkownika potwierdzenia nieodwracalnej akcji, takiej jak usunięcie notatki. Zbudowany w oparciu o komponent `AlertDialog` z `shadcn/ui`.
- **Główne elementy**: `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogCancel`, `AlertDialogAction`.
- **Obsługiwane interakcje**:
    - `onClick` na przycisku `AlertDialogAction` ("Potwierdź") wywołuje funkcję `onConfirm` z propsów.
    - `onClick` na przycisku `AlertDialogCancel` ("Anuluj") lub zamknięcie modala wywołuje `onCancel`.
- **Obsługiwana walidacja**: Brak.
- **Typy**: Brak specyficznych typów.
- **Propsy**:
    - `isOpen: boolean`
    - `onConfirm: () => void`
    - `onCancel: () => void`
    - `title: string`
    - `description: string`

---

## 5. Typy
Do implementacji widoku, oprócz istniejących DTO, potrzebny będzie nowy typ `ViewModel` do zarządzania stanem UI.

```typescript
import type { NoteDTO, PlanListItemDTO } from "./api.types";

/**
 * Agreguje wszystkie dane i stany UI potrzebne dla widoku NoteDetailsView.
 */
export interface NoteDetailsViewModel {
  /** Dane aktualnie wyświetlanej notatki. */
  note: NoteDTO | null;
  /** Lista historycznych planów dla tej notatki. */
  plans: PlanListItemDTO[];
  /** Informacja, czy profil użytkownika jest kompletny. */
  isProfileComplete: boolean;
  /** Liczba pozostałych generacji planów w tym miesiącu. */
  remainingGenerations: number | null;
  /** Stan ładowania głównych danych (notatka, historia). */
  isLoading: boolean;
  /** Stan ładowania podczas generowania nowego planu. */
  isGeneratingPlan: boolean;
  /** Stan ładowania podczas usuwania notatki. */
  isDeletingNote: boolean;
  /** Ogólny komunikat o błędzie dla widoku. */
  error: string | null;
  /** Określa, czy modal potwierdzenia usunięcia jest otwarty. */
  isDeleteDialogOpen: boolean;
}
````

-----

## 6\. Zarządzanie stanem

Stan widoku będzie zarządzany lokalnie w komponencie `NoteDetailsView` przy użyciu customowego hooka `useNoteDetails`. Takie podejście enkapsuluje logikę pobierania danych, obsługi akcji i zarządzania stanami (ładowanie, błędy) w jednym, reużywalnym module.

### Custom Hook: `useNoteDetails(noteId: string)`

  - **Cel**: Abstrahuje całą logikę biznesową widoku od komponentu UI.
  - **Wewnętrzny stan**: Używa `useState` lub `useReducer` do zarządzania obiektem `NoteDetailsViewModel`.
  - **Zwracane wartości**:
      - `state: NoteDetailsViewModel`: Aktualny stan widoku.
      - `actions`: Obiekt zawierający funkcje do interakcji:
          - `generatePlan: () => Promise<void>`
          - `deleteNote: () => Promise<void>`
          - `openDeleteDialog: () => void`
          - `closeDeleteDialog: () => void`
  - **Logika**:
      - `useEffect` do pobrania `note` i `plans` przy inicjalizacji.
      - Funkcje `async` do obsługi wywołań API (generowanie, usuwanie), które odpowiednio aktualizują stan `isLoading*`, `data` i `error`.

-----

## 7\. Integracja API

Widok będzie komunikował się z trzema endpointami API. Wszystkie operacje będą wykonywane asynchronicznie.

1.  **Pobieranie szczegółów notatki**

      - **Endpoint**: `GET /api/notes/:id`
      - **Akcja**: Wywoływane przy pierwszym załadowaniu widoku.
      - **Typ odpowiedzi (sukces)**: `NoteDTO`
      - **Obsługa**: Wynik zapisywany w `state.note`.

2.  **Pobieranie historii planów**

      - **Endpoint**: `GET /api/notes/:noteId/plans`
      - **Akcja**: Wywoływane przy pierwszym załadowaniu oraz po pomyślnym wygenerowaniu nowego planu.
      - **Typ odpowiedzi (sukces)**: `PlansListResponseDTO`
      - **Obsługa**: Wynik (`response.plans`) zapisywany w `state.plans`.

3.  **Generowanie nowego planu**

      - **Endpoint**: `POST /api/notes/:noteId/generate-plan`
      - **Akcja**: Wywoływane po kliknięciu przycisku "Generuj Plan".
      - **Typ odpowiedzi (sukces)**: `GeneratePlanResponseDTO`
      - **Obsługa**: Po sukcesie, `state.remainingGenerations` jest aktualizowane, a historia planów jest odświeżana.

4.  **Usuwanie notatki** (Endpoint zakładany na podstawie User Story US-008)

      - **Endpoint**: `DELETE /api/notes/:id`
      - **Akcja**: Wywoływane po potwierdzeniu w modalu.
      - **Typ odpowiedzi (sukces)**: `204 No Content` lub podobny.
      - **Obsługa**: Po sukcesie, użytkownik jest przekierowywany na listę notatek (`/notes`).

-----

## 8\. Interakcje użytkownika

  - **Ładowanie widoku**: Użytkownik przechodzi na `/notes/:id`. Widzi ogólny wskaźnik ładowania (np. skeleton loader). Po załadowaniu danych wyświetlają się szczegóły notatki i historia planów.
  - **Generowanie planu**: Użytkownik klika przycisk "Generuj Plan". Przycisk staje się nieaktywny i wyświetla wskaźnik ładowania. Po zakończeniu operacji:
      - **Sukces**: Pojawia się komunikat "toast" (np. "Plan wygenerowany\!"), licznik generacji maleje, a nowa pozycja pojawia się na szczycie listy historii.
      - **Błąd**: Pojawia się toast z odpowiednim komunikatem błędu. Przycisk wraca do stanu aktywnego.
  - **Usuwanie notatki**:
    1.  Użytkownik klika przycisk "Usuń".
    2.  Otwiera się modal z prośbą o potwierdzenie.
    3.  Użytkownik klika "Potwierdź". Przycisk w modalu wyświetla wskaźnik ładowania.
    4.  Po pomyślnym usunięciu użytkownik jest przekierowywany na stronę `/notes`.
    5.  Jeśli użytkownik kliknie "Anuluj", modal jest zamykany bez żadnej akcji.
  - **Edycja notatki**: Użytkownik klika przycisk "Edytuj", co powoduje natychmiastowe przejście na stronę `/notes/:id/edit`.

-----

## 9\. Warunki i walidacja

Główna walidacja po stronie klienta dotyczy możliwości generowania planu i jest realizowana w komponencie `PlanGenerationControl`:

  - **Warunek 1: Limit generacji**: Przycisk "Generuj Plan" jest nieaktywny, jeśli `state.remainingGenerations` wynosi `0`.
  - **Warunek 2: Kompletność profilu**: Przycisk jest nieaktywny, jeśli `state.isProfileComplete` jest `false`. Należy wyświetlić tooltip lub komunikat zachęcający do uzupełnienia profilu.
  - **Warunek 3: Trwająca operacja**: Przycisk jest nieaktywny, gdy `state.isGeneratingPlan` jest `true`, aby zapobiec wielokrotnym wywołaniom.

-----

## 10\. Obsługa błędów

Błędy będą komunikowane użytkownikowi w sposób kontekstowy, głównie za pomocą powiadomień "toast".

  - **Błąd pobierania danych (404/500)**: Zamiast treści widoku, wyświetlany jest komunikat błędu na całą stronę, np. "Nie znaleziono notatki" lub "Wystąpił błąd serwera", z przyciskiem powrotu.
  - **Błąd generowania planu**:
      - **`400 INCOMPLETE_PROFILE`**: Toast z komunikatem: "Uzupełnij swój profil, aby móc generować plany."
      - **`429 GENERATION_LIMIT_EXCEEDED`**: Toast: "Osiągnięto miesięczny limit generacji planów." Przycisk zostaje zablokowany.
      - **`500 AI_GENERATION_FAILED`**: Toast: "Generowanie planu nie powiodło się. Spróbuj ponownie za chwilę."
  - **Błąd usuwania notatki**: Toast z komunikatem: "Nie udało się usunąć notatki. Spróbuj ponownie." Modal pozostaje otwarty, a przycisk potwierdzenia staje się ponownie aktywny.

-----

## 11\. Kroki implementacji

1.  **Struktura plików**: Stwórz plik strony `src/pages/notes/[id].astro` oraz pliki dla komponentów React: `NoteDetailsView.tsx`, `NoteDetailsCard.tsx`, `PlanGenerationControl.tsx`, `PlanHistoryList.tsx`.
2.  **Definicje typów**: Zdefiniuj interfejs `NoteDetailsViewModel` w dedykowanym pliku z typami.
3.  **Komponenty UI (statyczne)**: Zaimplementuj komponenty w wersji statycznej, przyjmujące dane przez propsy. Użyj komponentów z biblioteki `shadcn/ui` (`Button`, `Card`, `AlertDialog`).
4.  **Custom Hook `useNoteDetails`**:
      - Zaimplementuj szkielet hooka z początkowym stanem.
      - Dodaj logikę pobierania danych notatki i historii planów w `useEffect` z obsługą stanu ładowania i błędów.
5.  **Integracja `NoteDetailsView`**: Połącz hook `useNoteDetails` z komponentem `NoteDetailsView`. Przekaż dane i akcje z hooka do podrzędnych komponentów prezentacyjnych.
6.  **Implementacja akcji generowania**: Zaimplementuj funkcję `generatePlan` w hooku, włączając w to wywołanie API, obsługę stanów `isGeneratingPlan` oraz odświeżanie listy historii po sukcesie.
7.  **Implementacja akcji usuwania**:
      - Zaimplementuj logikę otwierania/zamykania modala w hooku.
      - Zaimplementuj funkcję `deleteNote` w hooku, która wykonuje wywołanie API i obsługuje przekierowanie po sukcesie.
8.  **Obsługa błędów i przypadków brzegowych**: Zaimplementuj wyświetlanie komunikatów "toast" dla różnych scenariuszy błędów API. Dodaj obsługę pustego stanu dla listy historii.
9.  **Stylowanie i dostępność**: Dopracuj wygląd widoku za pomocą Tailwind CSS. Upewnij się, że wszystkie interaktywne elementy są dostępne z klawiatury i mają odpowiednie atrybuty ARIA.
10. **Testowanie manualne**: Przetestuj wszystkie opisane interakcje użytkownika, w tym scenariusze błędów (można je symulować, modyfikując tymczasowo kod lub używając narzędzi deweloperskich przeglądarki).


```
```
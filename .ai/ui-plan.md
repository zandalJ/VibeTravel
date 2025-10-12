# Architektura UI dla VibeTravel

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika VibeTravel opiera się na podejściu zorientowanym na komponenty, wykorzystując Astro z interaktywnymi "wyspami" w React. Celem jest stworzenie responsywnej, dostępnej i intuicyjnej aplikacji mobilnej (mobile-first), która prowadzi użytkownika przez proces od rejestracji, przez zdefiniowanie preferencji, aż po tworzenie notatek i generowanie planów podróży.

Zarządzanie stanem jest podzielone:
* **Stan globalny klienta**: Przechowywany w React Context, zawiera dane zalogowanego użytkownika, jego profil oraz limity generacji.
* **Stan serwera**: Zarządzany przez TanStack Query (React Query), odpowiada za pobieranie, buforowanie i mutacje danych z API, w tym obsługę stanów ładowania, błędów i pustych danych.

Kluczowe decyzje architektoniczne, takie jak użycie blokujących modali dla operacji CRUD i globalnego systemu powiadomień "Toast", zapewniają spójne i przewidywalne doświadczenie użytkownika, minimalizując złożoność w wersji MVP. Nawigacja jest prosta i scentralizowana w stałym górnym pasku.

***

## 2. Lista widoków

### Widok: Rejestracja
* **Ścieżka widoku**: `/register`
* **Główny cel**: Umożliwienie nowym użytkownikom założenia konta w aplikacji.
* **Kluczowe informacje do wyświetlenia**: Formularz z polami na e-mail i hasło, link do strony logowania.
* **Kluczowe komponenty widoku**:
    * Komponent **AuthLayout** (wspólny dla logowania/rejestracji).
    * Formularz rejestracji z walidacją (`react-hook-form` + `Zod`).
    * Przycisk "Zarejestruj się".
    * Link nawigacyjny do `/login`.
* **UX, dostępność i względy bezpieczeństwa**:
    * **UX**: Jasne komunikaty o błędach walidacji (np. "Hasło jest za krótkie"). Po pomyślnej rejestracji, użytkownik jest automatycznie przekierowywany do widoku konfiguracji profilu (`/profile/setup`).
    * **Dostępność**: Poprawne etykiety (`<label>`) dla pól formularza, obsługa nawigacji klawiaturą.
    * **Bezpieczeństwo**: Jest to ścieżka publiczna.

### Widok: Logowanie
* **Ścieżka widoku**: `/login`
* **Główny cel**: Umożliwienie istniejącym użytkownikom zalogowania się na swoje konto.
* **Kluczowe informacje do wyświetlenia**: Formularz z polami na e-mail i hasło, link do strony rejestracji.
* **Kluczowe komponenty widoku**:
    * Komponent **AuthLayout**.
    * Formularz logowania z walidacją.
    * Przycisk "Zaloguj się".
    * Link nawigacyjny do `/register`.
* **UX, dostępność i względy bezpieczeństwa**:
    * **UX**: Generyczny komunikat o błędzie "Nieprawidłowy e-mail lub hasło" wyświetlany za pomocą powiadomienia Toast. Po pomyślnym logowaniu, użytkownik jest przekierowywany do panelu głównego (`/dashboard`).
    * **Dostępność**: Poprawne etykiety dla pól, zarządzanie focusem.
    * **Bezpieczeństwo**: Jest to ścieżka publiczna.

### Widok: Konfiguracja / Edycja Profilu
* **Ścieżka widoku**: `/profile/setup` (konfiguracja początkowa), `/profile` (edycja)
* **Główny cel**: Umożliwienie użytkownikowi zdefiniowania lub aktualizacji swoich preferencji podróżniczych.
* **Kluczowe informacje do wyświetlenia**: Formularz z polami: budżet dzienny, zainteresowania (tagi + pole "inne"), styl podróży, typowy czas trwania podróży.
* **Kluczowe komponenty widoku**:
    * Główny layout aplikacji z **Navbar**.
    * Komponent **ProfileForm** (współdzielony dla setupu i edycji).
    * Pola formularza (input, select, chmura tagów).
    * Przycisk "Zapisz".
    * Przycisk "Pomiń" (tylko w widoku `/profile/setup`).
* **UX, dostępność i względy bezpieczeństwa**:
    * **UX**: Dane pobierane z API (`GET /api/profile`) i wstawiane do formularza. Zapis obsługiwany przez `PUT /api/profile`. Komunikaty o sukcesie/błędzie przez Toast.
    * **Dostępność**: Wszystkie pola formularza muszą być dostępne z klawiatury i poprawnie opisane.
    * **Bezpieczeństwo**: Ścieżka chroniona, wymaga aktywnej sesji użytkownika.

### Widok: Panel Główny (Lista Notatek)
* **Ścieżka widoku**: `/dashboard`
* **Główny cel**: Wyświetlenie listy wszystkich notatek podróżniczych użytkownika i umożliwienie nawigacji do tworzenia nowej notatki.
* **Kluczowe informacje do wyświetlenia**: Lista notatek, każda z celem podróży, datami i liczbą wygenerowanych planów.
* **Kluczowe komponenty widoku**:
    * Główny layout aplikacji z **Navbar**.
    * Przycisk "Dodaj nową notatkę" (przenosi do `/notes/new`).
    * Komponent **NotesList** obsługujący stany:
        * **Loading**: Komponenty **Skeleton** w kształcie kart notatek.
        * **Empty State**: Komunikat "Nie masz jeszcze żadnych notatek" z przyciskiem "Stwórz pierwszą notatkę".
        * **Error State**: Komunikat o błędzie pobierania z przyciskiem "Spróbuj ponownie".
        * **Success**: Lista komponentów **NoteCard**.
* **UX, dostępność i względy bezpieczeństwa**:
    * **UX**: Dane pobierane z `GET /api/notes`. Kliknięcie w kartę notatki przenosi do jej szczegółów (`/notes/:id`).
    * **Dostępność**: Karty notatek powinny być elementami `<a>` lub mieć rolę `link`, aby były nawigowalne klawiaturą.
    * **Bezpieczeństwo**: Ścieżka chroniona.

### Widok: Tworzenie / Edycja Notatki
* **Ścieżka widoku**: `/notes/new` (tworzenie), `/notes/:id/edit` (edycja)
* **Główny cel**: Umożliwienie użytkownikowi stworzenia nowej lub edycji istniejącej notatki podróżniczej.
* **Kluczowe informacje do wyświetlenia**: Formularz z polami: cel, daty (od-do), budżet całkowity, notatki dodatkowe.
* **Kluczowe komponenty widoku**:
    * Główny layout aplikacji z **Navbar**.
    * Komponent **NoteForm** (współdzielony).
    * Przycisk "Zapisz" / "Zaktualizuj".
* **UX, dostępność i względy bezpieczeństwa**:
    * **UX**: Walidacja po stronie klienta (np. cel jest wymagany, data końcowa nie może być wcześniejsza niż początkowa). W trybie edycji formularz jest wypełniany danymi z `GET /api/notes/:id`. Zapis przez `POST /api/notes` lub `PUT /api/notes/:id`.
    * **Dostępność**: Poprawne etykiety i obsługa walidacji dla czytników ekranu.
    * **Bezpieczeństwo**: Ścieżka chroniona.

### Widok: Szczegóły Notatki
* **Ścieżka widoku**: `/notes/:id`
* **Główny cel**: Wyświetlenie wszystkich informacji o konkretnej notatce oraz umożliwienie generowania planów i przeglądania ich historii.
* **Kluczowe informacje do wyświetlenia**:
    * Dane notatki (cel, daty, budżet, treść).
    * Licznik pozostałych generacji planów.
    * Chronologiczna lista linków do wygenerowanych planów.
* **Kluczowe komponenty widoku**:
    * Główny layout aplikacji z **Navbar**.
    * Sekcja **NoteDetails** z danymi notatki.
    * Przyciski: "Edytuj" (link do `/notes/:id/edit`), "Usuń" (otwiera **ConfirmationDialog**).
    * Przycisk "Generuj Plan" (wysyła `POST /api/notes/:noteId/generate-plan`).
        * Przycisk jest nieaktywny, jeśli profil jest niekompletny lub limit generacji wynosi 0.
    * Komponent **PlanHistoryList** (pobiera dane z `GET /api/notes/:noteId/plans`).
* **UX, dostępność i względy bezpieczeństwa**:
    * **UX**: Generowanie planu jest operacją asynchroniczną, sygnalizowaną wskaźnikiem ładowania. Po udanej generacji lista historii jest automatycznie odświeżana. Usunięcie wymaga potwierdzenia w oknie modalnym.
    * **Dostępność**: Przyciski akcji są poprawnie oznaczone.
    * **Bezpieczeństwo**: Ścieżka chroniona. Sprawdzenie po stronie klienta, czy użytkownik jest właścicielem notatki (choć główna weryfikacja jest w API).

### Widok: Wygenerowany Plan
* **Ścieżka widoku**: `/plans/:id`
* **Główny cel**: Wyświetlenie treści wygenerowanego przez AI planu podróży.
* **Kluczowe informacje do wyświetlenia**:
    * Treść planu w formacie Markdown.
    * Komunikat o szacunkowym charakterze kosztów.
    * Informacje o notatce, do której plan należy (cel, daty).
* **Kluczowe komponenty widoku**:
    * Główny layout aplikacji z **Navbar**.
    * Komponent **MarkdownRenderer** do wyświetlania treści planu.
    * Przycisk "Kopiuj do schowka".
    * Komponent **FeedbackButtons** (ikony 👍/👎 do wysyłania `POST /api/plans/:id/feedback`).
    * Link powrotny do widoku szczegółów notatki (`/notes/:noteId`).
* **UX, dostępność i względy bezpieczeństwa**:
    * **UX**: Dane pobierane z `GET /api/plans/:id`. Po skopiowaniu treści lub oddaniu głosu wyświetlane jest potwierdzenie (Toast).
    * **Dostępność**: Treść planu powinna być czytelna dla czytników ekranu.
    * **Bezpieczeństwo**: Ścieżka chroniona.

***

## 3. Mapa podróży użytkownika

Mapa przedstawia typowy przepływ nowego użytkownika przez aplikację ("happy path"):

1.  **Rejestracja i Konfiguracja**:
    * Użytkownik trafia na `/login`, klika link i przechodzi do `/register`.
    * Wypełnia formularz rejestracji i po sukcesie jest przekierowywany do `/profile/setup`.
    * Wypełnia swoje preferencje podróżnicze i zapisuje profil.
    * Zostaje przekierowany do pustego panelu głównego `/dashboard`.

2.  **Tworzenie Pierwszej Notatki i Generowanie Planu**:
    * W widoku `/dashboard` klika przycisk "Stwórz pierwszą notatkę".
    * Przechodzi do `/notes/new`, wypełnia formularz (np. cel: "Tokio", daty, budżet) i zapisuje notatkę.
    * Jest przekierowywany do widoku szczegółów nowej notatki `/notes/:id`.
    * Klika przycisk "Generuj Plan". Widzi wskaźnik ładowania.
    * Po chwili w sekcji "Historia Planów" pojawia się link do nowo wygenerowanego planu.

3.  **Przeglądanie i Ocena Planu**:
    * Użytkownik klika w link do planu w historii.
    * Przechodzi do widoku `/plans/:id`, gdzie czyta plan wycieczki w formacie Markdown.
    * Klika przycisk "Kopiuj do schowka", aby zapisać plan na później.
    * Klika ikonę 👍, aby ocenić plan.
    * Korzysta z linku powrotnego, aby wrócić do szczegółów notatki `/notes/:id`.

***

## 4. Układ i struktura nawigacji

Struktura nawigacyjna aplikacji jest prosta i spójna, oparta na jednym, globalnym elemencie.

* **Nawigacja Globalna (`Navbar`)**:
    * Jest to stały, górny pasek widoczny we wszystkich widokach chronionych (po zalogowaniu).
    * Po lewej stronie znajduje się tekstowe logo **"VibeTravel"**, które jest linkiem do panelu głównego (`/dashboard`).
    * Po prawej stronie znajduje się **ikona menu (hamburger)**, która po kliknięciu rozwija menu z dwiema opcjami:
        1.  **Profil** (link do `/profile`)
        2.  **Wyloguj** (kończy sesję użytkownika i przekierowuje do `/login`).

* **Nawigacja Kontekstowa**:
    * Realizowana jest poprzez przyciski i linki wewnątrz poszczególnych widoków.
    * Przykłady: przycisk "Dodaj nową notatkę" w `/dashboard`, przycisk "Edytuj" w `/notes/:id`, linki do historycznych planów.

* **Ochrona Ścieżek**:
    * Wszystkie ścieżki poza `/login` i `/register` są chronione.
    * Główny komponent layoutu aplikacji sprawdza istnienie aktywnej sesji użytkownika. W przypadku jej braku, użytkownik jest automatycznie przekierowyany na stronę logowania `/login`.

***

## 5. Kluczowe komponenty

Poniżej znajduje się lista kluczowych, reużywalnych komponentów UI, które stanowią fundament aplikacji.

* **Navbar**: Globalny pasek nawigacyjny z logo i menu użytkownika.
* **ProfileForm**: Formularz używany zarówno do pierwszej konfiguracji, jak i późniejszej edycji profilu użytkownika.
* **NoteForm**: Formularz do tworzenia i edycji notatek podróżniczych, zawierający walidację pól.
* **NoteCard**: Komponent-karta wyświetlający podsumowanie pojedynczej notatki (cel, daty, liczba planów) na liście w panelu głównym.
* **PlanHistoryList**: Lista wyświetlająca linki do wszystkich historycznych wersji planów wygenerowanych dla danej notatki.
* **MarkdownRenderer**: Komponent odpowiedzialny za bezpieczne renderowanie treści planu (w formacie Markdown) w widoku planu.
* **ConfirmationDialog (AlertDialog)**: Modalne okno dialogowe z Shadcn/ui, używane do potwierdzania krytycznych akcji, takich jak usuwanie notatki.
* **Toast**: Globalny system powiadomień (z Shadcn/ui) do informowania użytkownika o wyniku operacji (np. "Notatka zapisana pomyślnie", "Wystąpił błąd").
* **Skeleton**: Komponenty-zapełniacze używane do sygnalizowania stanu ładowania danych, np. na liście notatek.
* **FeedbackButtons**: Grupa przycisków (👍/👎) umożliwiająca użytkownikowi ocenę wygenerowanego planu.
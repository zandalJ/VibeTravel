```markdown
# Plan implementacji widoku Tworzenie / Edycja Notatki

## 1. Przegląd
Celem tego widoku jest dostarczenie użytkownikowi interfejsu do tworzenia nowej notatki podróżniczej lub edycji już istniejącej. Widok będzie renderował formularz z polami wymaganymi do zdefiniowania podstawowych parametrów podróży, takich jak cel, daty i budżet. Komponent formularza będzie współdzielony dla obu akcji (tworzenia i edycji), a jego tryb działania będzie zależał od ścieżki URL.

## 2. Routing widoku
Widok będzie dostępny pod następującymi ścieżkami:
- **Tworzenie nowej notatki**: `/notes/new`
- **Edycja istniejącej notatki**: `/notes/:id/edit`, gdzie `:id` to unikalny identyfikator notatki.

## 3. Struktura komponentów
Struktura będzie opierać się na stronie Astro, która renderuje interaktywny komponent React.

```

/src/pages/notes/
├── new.astro
└── [id]/
└── edit.astro
/src/components/notes/
└── NoteForm.tsx

````
- **`new.astro` / `edit.astro`**: Strony Astro odpowiedzialne za obsługę routingu. W trybie edycji (`edit.astro`) strona będzie odpowiedzialna za pobranie danych notatki po stronie serwera i przekazanie ich jako `props` do komponentu `NoteForm`. Obie strony będą renderować komponent `NoteForm` z odpowiednimi `props`.
- **`NoteForm.tsx`**: Główny, kliencki komponent React, który zawiera całą logikę formularza, walidację, zarządzanie stanem i komunikację z API. Będzie renderowany z dyrektywą `client:load`.

## 4. Szczegóły komponentów
### `NoteForm.tsx`
- **Opis komponentu**: Reużywalny komponent formularza do tworzenia i edycji notatek. Wykorzystuje `react-hook-form` do zarządzania stanem formularza oraz `Zod` do walidacji po stronie klienta.
- **Główne elementy**: Komponent będzie zbudowany z gotowych, dostępnych komponentów `shadcn/ui`:
    - `Form` (wrapper z `react-hook-form`)
    - `FormField` z `FormControl`, `FormLabel`, `FormMessage` dla każdego pola
    - `Input` dla pola "Cel" (`destination`) i "Budżet" (`total_budget`)
    - `DatePicker` (z `shadcn/ui` lub podobny) dla pól "Data od" (`start_date`) i "Data do" (`end_date`)
    - `Textarea` dla pola "Notatki dodatkowe" (`additional_notes`)
    - `Button` do wysłania formularza z dynamicznym tekstem ("Zapisz" lub "Zaktualizuj") i obsługą stanu ładowania.
- **Obsługiwane interakcje**:
    - Wprowadzanie danych w pola formularza.
    - Wybór dat z kalendarza.
    - Wysłanie formularza przyciskiem "Zapisz" / "Zaktualizuj".
- **Obsługiwana walidacja**: Walidacja po stronie klienta, zgodna z wymaganiami API:
    - **Cel (`destination`)**: Wymagany, maksymalnie 255 znaków.
    - **Data początkowa (`start_date`)**: Wymagana, poprawny format daty.
    - **Data końcowa (`end_date`)**: Wymagana, poprawny format daty. Musi być późniejsza lub równa dacie początkowej.
    - **Czas trwania podróży**: Różnica między `end_date` a `start_date` nie może przekraczać 14 dni.
    - **Budżet (`total_budget`)**: Opcjonalny, ale jeśli podany, musi być liczbą większą od 0.
- **Typy**: `NoteDTO`, `CreateNoteCommand`, `UpdateNoteCommand`, `NoteFormViewModel`, `NoteFormProps`.
- **Propsy**:
    ```typescript
    interface NoteFormProps {
      isEditMode: boolean;
      initialData?: NoteDTO; // Dane do wypełnienia formularza w trybie edycji
    }
    ```

## 5. Typy
Do implementacji widoku wykorzystane zostaną istniejące typy DTO oraz zdefiniowane zostaną nowe typy dla komponentu i jego stanu.

- **`CreateNoteCommand` / `UpdateNoteCommand`**: Typy te będą używane do zdefiniowania schematu walidacji Zod oraz jako typ danych przesyłanych w ciele żądania `POST` / `PUT` do API.
- **`NoteDTO`**: Typ danych otrzymywanych z API (`GET /api/notes/:id`), używany do wypełnienia formularza w trybie edycji (`initialData`).
- **`NoteFormViewModel` (nowy typ)**: Definiuje kształt danych zarządzanych przez `react-hook-form`. Jego struktura będzie identyczna jak `CreateNoteCommand`.
    ```typescript
    // src/types/notes.types.ts
    import { z } from 'zod';
    import { createNoteSchema } from '../lib/validators/notes.validator';

    export type NoteFormViewModel = z.infer<typeof createNoteSchema>;
    ```
- **`NoteFormProps` (nowy typ)**: Opisuje propsy przyjmowane przez komponent `NoteForm.tsx`, jak zdefiniowano w sekcji 4.

## 6. Zarządzanie stanem
Stan formularza będzie zarządzany przez bibliotekę **`react-hook-form`** z resolverem **`Zod`** (`@hookform/resolvers/zod`). Takie podejście upraszcza obsługę wartości pól, błędów walidacji i stanu przesyłania.

Dodatkowo, zostanie utworzony **custom hook `useNoteForm`**, który będzie zawierał logikę biznesową:
- Inicjalizację `react-hook-form` z domyślnymi wartościami lub `initialData`.
- Funkcję `onSubmit`, która rozróżnia tryb `isEditMode` i wywołuje odpowiednią metodę API (`POST` lub `PUT`).
- Zarządzanie stanem ładowania (`isSubmitting`) i obsługę błędów API.
- Przekierowanie użytkownika po pomyślnym zapisie (np. za pomocą `Astro.redirect` lub `window.location.href`).

## 7. Integracja API
Komponent `NoteForm` będzie komunikował się z następującymi endpointami API:

- **Pobieranie danych do edycji**:
    - **Endpoint**: `GET /api/notes/:id`
    - **Wywołanie**: Po stronie serwera w pliku `edit.astro`.
    - **Odpowiedź**: `NoteDTO` przekazywane jako `initialData` do `NoteForm`.
- **Tworzenie nowej notatki**:
    - **Endpoint**: `POST /api/notes`
    - **Wywołanie**: Wewnątrz hooka `useNoteForm` po walidacji i wysłaniu formularza w trybie tworzenia.
    - **Typ żądania**: `CreateNoteCommand`
    - **Typ odpowiedzi (Success)**: `NoteDTO`
- **Aktualizacja istniejącej notatki**:
    - **Endpoint**: `PUT /api/notes/:id`
    - **Wywołanie**: Wewnątrz hooka `useNoteForm` po walidacji i wysłaniu formularza w trybie edycji.
    - **Typ żądania**: `UpdateNoteCommand`
    - **Typ odpowiedzi (Success)**: `NoteDTO`

## 8. Interakcje użytkownika
1.  **Wypełnianie formularza**: Użytkownik wprowadza dane w poszczególne pola. Walidacja odbywa się na bieżąco (np. przy utracie fokusu) lub przy próbie wysłania.
2.  **Wysłanie formularza**:
    - Użytkownik klika przycisk "Zapisz" / "Zaktualizuj".
    - Przycisk przechodzi w stan `disabled` i wyświetla wskaźnik ładowania.
    - Aplikacja wysyła żądanie do API.
3.  **Sukces**:
    - Po otrzymaniu odpowiedzi `201 Created` lub `200 OK`, użytkownik jest przekierowywany na stronę szczegółów notatki (`/notes/:id`) lub listę notatek (`/notes`).
4.  **Błąd**:
    - W przypadku błędu walidacji lub błędu serwera, pod formularzem lub nad nim wyświetlany jest ogólny komunikat o błędzie. Pola, których dotyczy błąd walidacji, są podświetlone wraz z odpowiednim komunikatem. Przycisk wraca do stanu aktywnego.

## 9. Warunki i walidacja
Warunki walidacyjne będą zaimplementowane po stronie klienta przy użyciu schemy `Zod`, która odzwierciedla reguły zdefiniowane w API.
- **`destination`**: Komponent `Input`. Weryfikacja: `min(1)`, `max(255)`.
- **`start_date`, `end_date`**: Komponent `DatePicker`. Weryfikacja `refine` w Zod:
    1.  `end_date` musi być późniejsza lub równa `start_date`.
    2.  Różnica dni między datami nie może przekroczyć 14.
- **`total_budget`**: Komponent `Input type="number"`. Weryfikacja: `positive()`.

Stan interfejsu będzie reagował na walidację:
- Niepoprawne pola będą miały czerwoną ramkę, a pod nimi pojawi się komunikat błędu.
- Przycisk "Zapisz" będzie aktywny tylko, jeśli formularz jest "brudny" (`isDirty`) i nie ma błędów, lub będzie weryfikował poprawność przy kliknięciu.

## 10. Obsługa błędów
- **Błędy walidacji klienta**: Obsługiwane przez `react-hook-form` i `Zod`. Komunikaty wyświetlane są przy odpowiednich polach.
- **Błąd walidacji serwera (`400 Bad Request`)**: Jeśli API zwróci błąd walidacji, ogólny komunikat zostanie wyświetlony nad formularzem.
- **Błąd autoryzacji (`401 Unauthorized` / `403 Forbidden`)**: Powinien być obsługiwany globalnie przez wrapper klienta API, który przekierowuje na stronę logowania.
- **Nie znaleziono zasobu (`404 Not Found` w trybie edycji)**: Strona `edit.astro` powinna zwrócić stronę błędu 404.
- **Błąd serwera (`500 Internal Server Error`)**: Wyświetlenie ogólnego komunikatu o błędzie, np. "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później."

## 11. Kroki implementacji
1.  **Struktura plików**: Utworzenie plików `new.astro` i `[id]/edit.astro` w katalogu `/src/pages/notes/`.
2.  **Komponent `NoteForm`**: Stworzenie pliku `/src/components/notes/NoteForm.tsx` z podstawową strukturą JSX, wykorzystując komponenty `Form`, `Input`, `DatePicker`, `Textarea` i `Button` z `shadcn/ui`.
3.  **Schema Walidacji**: Zdefiniowanie schemy Zod (`createNoteSchema`) w pliku `/src/lib/validators/notes.validator.ts`, która obejmuje wszystkie reguły walidacji.
4.  **Zarządzanie stanem**: Zintegrowanie `react-hook-form` z komponentem `NoteForm`, używając stworzonej schemy Zod jako resolvera.
5.  **Logika `edit.astro`**: Implementacja logiki `fetch` po stronie serwera w `edit.astro` w celu pobrania danych notatki i przekazania ich do `NoteForm` jako `props`.
6.  **Implementacja `useNoteForm`**: Stworzenie customowego hooka, który będzie zawierał logikę wysyłania formularza (rozróżnienie `POST` vs `PUT`), obsługę stanu ładowania i błędów API.
7.  **Integracja z API**: Zaimplementowanie funkcji klienta API do wysyłania żądań `POST` i `PUT` do `/api/notes`.
8.  **Obsługa przekierowań**: Dodanie logiki przekierowania użytkownika po pomyślnym zakończeniu operacji.
9.  **Obsługa błędów**: Implementacja wyświetlania komunikatów o błędach (zarówno walidacyjnych, jak i serwerowych) w interfejsie użytkownika.
10. **Stylowanie i finalizacja**: Dopracowanie stylów i responsywności formularza przy użyciu Tailwind CSS.
````
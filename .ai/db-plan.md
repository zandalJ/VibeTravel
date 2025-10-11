## Schemat Bazy Danych: VibeTravel

Poniżej znajduje się opis tabel, ich kolumn oraz relacji w bazie danych projektu.

---

### 1. Tabele

### **Tabela: `users`**

This table is managed by Supabase Auth

* **`id`**: UUID - unikalny identyfikator użytkownika (klucz główny)
* **`email`**: VARCHAR(255) - adres email użytkownika (unikalny, wymagany)
* **`encrypted_password`**: VARCHAR NOT NULL
* **`created_at`**: TIMESTAMPZ NOT NULL DEFAULT now()
* **`confirmed_at`**: TIMESTAMPZ

---

### **Tabela: `profiles`**

* **`id`**: Unikalny identyfikator profilu (UUID, **klucz główny**). Jednocześnie klucz obcy wskazujący na `auth.users(id)` z kaskadowym usuwaniem (ON DELETE CASCADE). Relacja jeden-do-jednego.
* **`interests`**: Zainteresowania użytkownika z predefiniowanych tagów (typ TEXT[], tablica tekstowa, domyślnie pusta tablica '{}').
* **`other_interests`**: Dodatkowe zainteresowania wpisane ręcznie przez użytkownika (typ TEXT, może być NULL).
* **`daily_budget`**: Dzienny budżet użytkownika (typ NUMERIC(10,2), walidowany przez CHECK (daily_budget > 0), może być NULL).
* **`travel_style`**: Styl podróży (typ ENUM: 'budget', 'backpacking', 'comfort', 'luxury', 'adventure', 'cultural', 'relaxation', 'family', 'solo'). Pole wymagane (NOT NULL).
* **`typical_trip_duration`**: Typowy czas trwania podróży w dniach (typ INTEGER, walidowany przez CHECK (typical_trip_duration > 0), może być NULL).
* **`generation_count`**: Licznik wykorzystanych generacji planów w bieżącym miesiącu (typ INTEGER, domyślnie 0, NOT NULL).
* **`generation_limit_reset_at`**: Data i czas resetu limitu generacji (typ TIMESTAMP WITH TIME ZONE, domyślnie (CURRENT_DATE + INTERVAL '1 month')::date, NOT NULL).
* **`created_at`**: Data i czas utworzenia profilu (typ TIMESTAMP WITH TIME ZONE, automatycznie NOW(), NOT NULL).
* **`updated_at`**: Data i czas ostatniej modyfikacji profilu (typ TIMESTAMP WITH TIME ZONE, aktualizowane automatycznie przez trigger, NOT NULL).

**Definicja kompletności profilu:** Profil uznawany za "w pełni wypełniony" gdy: `travel_style IS NOT NULL AND daily_budget IS NOT NULL AND (array_length(interests, 1) > 0 OR other_interests IS NOT NULL)`.

---

### **Tabela: `notes`**

* **`id`**: Unikalny identyfikator notatki (UUID, generowany automatycznie, **klucz główny**).
* **`user_id`**: Identyfikator użytkownika (UUID, NOT NULL), który stworzył notatkę. Klucz obcy wskazujący na `auth.users(id)` z kaskadowym usuwaniem (ON DELETE CASCADE).
* **`destination`**: Cel podróży (typ VARCHAR(255), pole wymagane NOT NULL).
* **`start_date`**: Data rozpoczęcia podróży (typ DATE, pole wymagane NOT NULL).
* **`end_date`**: Data zakończenia podróży (typ DATE, pole wymagane NOT NULL).
* **`total_budget`**: Całkowity budżet na wyjazd (typ NUMERIC(10,2), walidowany przez CHECK (total_budget > 0), może być NULL).
* **`additional_notes`**: Dodatkowe notatki od użytkownika (typ TEXT, może być NULL, zalecany limit ~10,000 znaków w walidacji aplikacji).
* **`created_at`**: Data i czas utworzenia notatki (typ TIMESTAMP WITH TIME ZONE, automatycznie NOW(), NOT NULL).
* **`updated_at`**: Data i czas ostatniej modyfikacji notatki (typ TIMESTAMP WITH TIME ZONE, aktualizowane automatycznie przez trigger, NOT NULL).

**Ograniczenia:**
* `CHECK (end_date >= start_date)` - data końca nie wcześniejsza niż data startu
* `CHECK (end_date - start_date <= 14)` - maksymalny czas trwania podróży to 14 dni

---

### **Tabela: `plans`**

* **`id`**: Unikalny identyfikator planu (UUID, generowany automatycznie, **klucz główny**).
* **`note_id`**: Identyfikator notatki (UUID, NOT NULL), dla której plan został wygenerowany. Klucz obcy wskazujący na `notes(id)` z kaskadowym usuwaniem (ON DELETE CASCADE).
* **`prompt_text`**: Pełna treść promptu wysłanego do API AI (typ TEXT, pole wymagane NOT NULL). Kluczowe dla debugowania i analizy jakości planów.
* **`prompt_version`**: Wersja struktury promptu (typ VARCHAR(10), domyślnie 'v1'). Umożliwia grupowanie planów według wersji promptu.
* **`content`**: Treść planu zwrócona przez AI (typ TEXT, pole wymagane NOT NULL, format Markdown, zalecany limit ~10,000 znaków w walidacji aplikacji).
* **`feedback`**: Ocena planu przez użytkownika (typ SMALLINT, walidowany przez CHECK (feedback IN (-1, 1)), domyślnie NULL). Wartości: 1 = 👍, -1 = 👎, NULL = brak oceny.
* **`created_at`**: Data i czas wygenerowania planu (typ TIMESTAMP WITH TIME ZONE, automatycznie NOW(), NOT NULL).

**Uwaga:** Tabela NIE zawiera kolumny `user_id` - dostęp do użytkownika odbywa się przez JOIN z tabelą `notes`.

---

### **Tabela: `generation_logs`**

* **`id`**: Unikalny identyfikator logu (UUID, generowany automatycznie, **klucz główny**).
* **`user_id`**: Identyfikator użytkownika (UUID, NOT NULL), który próbował wygenerować plan. Klucz obcy wskazujący na `auth.users(id)` z kaskadowym usuwaniem (ON DELETE CASCADE).
* **`note_id`**: Identyfikator notatki (UUID, NOT NULL) powiązanej z próbą generacji. Klucz obcy wskazujący na `notes(id)` z kaskadowym usuwaniem (ON DELETE CASCADE).
* **`plan_id`**: Identyfikator wygenerowanego planu (UUID, może być NULL), jeśli operacja się powiodła. Klucz obcy wskazujący na `plans(id)` z akcją ON DELETE SET NULL.
* **`status`**: Status generacji (typ VARCHAR(20), NOT NULL, walidowany przez CHECK (status IN ('in_progress', 'success', 'failed'))).
* **`error_message`**: Szczegółowy komunikat błędu (typ TEXT, może być NULL), wypełniony tylko gdy status = 'failed'.
* **`error_code`**: Kod kategorii błędu (typ VARCHAR(50), może być NULL), np. 'rate_limit', 'timeout', 'invalid_response'.
* **`prompt_tokens`**: Liczba tokenów zużytych w promptcie (typ INTEGER, może być NULL). Do monitorowania kosztów API.
* **`completion_tokens`**: Liczba tokenów w odpowiedzi AI (typ INTEGER, może być NULL). Do monitorowania kosztów API.
* **`created_at`**: Data i czas utworzenia logu (typ TIMESTAMP WITH TIME ZONE, automatycznie NOW(), NOT NULL).

---

### 2. Główne założenia i reguły

* **Relacje i integralność danych**: Usunięcie użytkownika powoduje automatyczne usunięcie jego profilu, notatek, planów i logów. Podobnie, usunięcie notatki usuwa wszystkie powiązane z nią plany i logi.
* **Bezpieczeństwo**: Każdy użytkownik ma dostęp wyłącznie do swoich własnych danych (profili, notatek, planów i logów).
* **Automatyzacja**: Pola `created_at` i `updated_at` są zarządzane przez bazę danych, co zapewnia ich poprawność.
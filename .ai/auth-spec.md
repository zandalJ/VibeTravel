Specyfikacja techniczna: Moduł rejestracji, logowania i odzyskiwania hasła (Auth)

Cel
—
Zapewnienie kompletnego modułu autentykacji użytkowników zgodnie z wymaganiami z PRD oraz stackiem technologicznym (Astro 5, React 19, TypeScript 5, Tailwind 4, shadcn/ui, Supabase). Usuwamy anonimowy fallback; wszystkie akcje domenowe (notatki, plany, profil) wymagają zalogowanej sesji.


### 1. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

#### 1.1. Tryby UI: auth vs non-auth
- **niezalogowany**: w nawigacji widoczne są linki „Zaloguj się / Zarejestruj”. Próby wykonania akcji domenowych są blokowane (UI/API).
- **zalogowany (auth)**: pełny dostęp do `dashboard`, `notes/*`, `plans/*` zgodnie z uprawnieniami.

Flaga środowiskowa: `VITE_AUTH_ENFORCED` (boolean). Steruje wyłącznie zachowaniem SSR dla stron (np. czy bez sesji przekierować `/dashboard`→`/auth/login`). Niezależnie od wartości flagi, wszystkie akcje domenowe wymagają sesji (brak fallbacku anonimowego).

Brak fallbacku: `DEFAULT_USER_ID` może istnieć jako zseedowane konto testowe, dostępne wyłącznie po zalogowaniu (nigdy automatycznie).

#### 1.2. Layouty i nawigacja
- `src/layouts/Layout.astro`
  - Rozszerzenie o górny pasek nawigacji z kontekstowym stanem użytkownika:
    - non-auth: „Zaloguj się” (`/auth/login`), „Zarejestruj” (`/auth/register`).
    - auth: skrót do `dashboard`, avatar/initials, menu użytkownika: „Profil” (placeholder do integracji), „Wyloguj”.
  - Pasek nawigacji jako oddzielny komponent np. `src/components/auth/AppHeader.tsx` (React, `client:load`), aby móc reagować na stan sesji bez pełnego SSR przeładowania.
- `src/layouts/AuthLayout.astro`
  - Minimalny layout dedykowany dla stron auth (proste tło, logo, karta formularza). Używany przez `/auth/*`.

#### 1.3. Strony Astro (routing) i komponenty React (formularze)
- Strony (Astro):
  - `src/pages/auth/login.astro`
    - SSR: jeżeli użytkownik ma sesję → przekierowanie do `/dashboard`.
    - Renderuje `<LoginForm client:load />`.
  - `src/pages/auth/register.astro`
    - SSR: jeżeli jest sesja → przekierowanie do `/dashboard`.
    - Renderuje `<RegisterForm client:load />`.
  - `src/pages/auth/reset.astro`
    - Renderuje `<ResetPasswordForm client:load />`.
  - `src/pages/auth/update-password.astro`
    - SSR: pobiera `code` z URL (Supabase password reset). Strona wyświetla `<UpdatePasswordForm client:load />`. Formularz po montażu wymienia `code` na sesję i umożliwia ustawienie nowego hasła.

- Komponenty React (w `src/components/auth/`):
  - `LoginForm.tsx`
    - Pola: email, hasło; link „Nie pamiętasz hasła?” → `/auth/reset`.
    - Na sukces: włącza synchronizację sesji SSR (patrz 3.3) i redirect: `/dashboard` lub (jeżeli to pierwsze logowanie i profil niekompletny) `/profile`.
  - `RegisterForm.tsx`
    - Pola: email, hasło, potwierdzenie hasła.
    - Po rejestracji: AUTOMATYCZNA SESJA (zgodnie z PRD – w zamkniętych testach wyłączamy e-mail confirmations) i redirect jw.
  - `ResetPasswordForm.tsx`
    - Pole: email. Po sukcesie: neutralny komunikat („Jeśli adres istnieje, wysłaliśmy wiadomość z instrukcjami”). Bez ujawniania, czy e-mail jest zarejestrowany.
  - `UpdatePasswordForm.tsx`
    - Pola: nowe hasło, potwierdzenie. Po wymianie `code`→sesja i zmianie hasła: redirect do `/dashboard`.
  - `SessionSync.tsx`
    - Niewidoczny komponent montowany w `Layout.astro` lub `AppHeader.tsx`. Nasłuchuje `onAuthStateChange` i wywołuje `/api/auth/session` w celu synchronizacji cookies dla SSR (szczegóły w 3.3).

Wszystkie formularze korzystają ze shadcn/ui (`button`, `input`, `form`) i Tailwind 4. Obsługa stanów: disabled podczas zapisu, loading spinnery, focus/aria.

#### 1.4. Rozdział odpowiedzialności (Astro vs React)
- **Strony Astro**: routing, SSR-owe przekierowania (na podstawie sesji z cookies), kontenery dla formularzy, konfiguracja meta/tytułów, ładowanie layoutów. Nie wywołują bezpośrednio logiki auth.
- **Komponenty React**: interaktywność, walidacja po stronie klienta (Zod), komunikacja z Supabase (przez `supabaseBrowserClient`) oraz synchronizacja z backendem przez `/api/auth/session`.

#### 1.5. Walidacja i komunikaty błędów
- Zod schematy w `src/lib/validators/auth.validator.ts`:
  - `loginSchema`: email (RFC 5322), hasło (min. 8 znaków).
  - `registerSchema`: email, hasło (min. 8, z literą i cyfrą), confirmPassword (musi pasować).
  - `resetPasswordSchema`: email.
  - `updatePasswordSchema`: hasło + confirmPassword.
- Błędy po stronie klienta: pod polami + toast w przypadku błędu globalnego (komponent `src/components/ui/sonner.tsx`).
- Błędy serwera mapowane do przyjaznych komunikatów (np. „Nieprawidłowe dane logowania”). Brak ujawniania szczegółów bezpieczeństwa.

#### 1.6. Scenariusze (najważniejsze)
- Rejestracja (US-001): po sukcesie natychmiastowa sesja; pierwszy login (US-002) → redirect do `/profile` (placeholder, integracja później); możliwość pominięcia i przejście na `/dashboard`.
- Logowanie (US-001): sukces → `/dashboard` lub `/profile` jeśli profil niekompletny.
- Błędne logowanie: komunikat inline + toast; brak ujawniania czy konto istnieje.
- Reset hasła (US-001 rozszerzenie): wysyłka maila; strona `/auth/update-password` obsługuje link z maila.
- Dostęp do stron wymagających sesji (gdy `VITE_AUTH_ENFORCED=true`): bez sesji → redirect do `/auth/login`.

Bez sesji: akcje domenowe są niedostępne (UI: disabled/CTA; API: 401/403), niezależnie od środowiska.


### 2. LOGIKA BACKENDOWA

#### 2.1. Struktura endpointów API
- Katalog: `src/pages/api/auth/`
  - `session.ts` (POST)
    - Cel: sync sesji między przeglądarką a SSR (cookies) przy zdarzeniach `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `PASSWORD_RECOVERY`.
    - Wejście: `{ event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'PASSWORD_RECOVERY', session?: AuthSessionPayload }`.
    - Działanie: używa serwerowego klienta Supabase (cookies z `Astro.cookies`) do ustawienia/wyczyszczenia sesji. Odpowiedź: 204.
  - `logout.ts` (POST)
    - Cel: serwerowe „sign-out” (czyści cookies SSR). Odpowiedź: 204.

Uwaga: Nie dodajemy `/api/auth/login` i `/api/auth/register`, ponieważ logowanie/rejestracja odbywa się przez Supabase po stronie klienta. Endpoints powyżej służą wyłącznie do synchronizacji sesji dla SSR.

#### 2.2. Modele danych (DTO) i kontrakty
- `src/types.ts` (rozszerzenia):
  - `AuthEvent = 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'PASSWORD_RECOVERY'`.
  - `AuthSessionPayload` (wycinek danych sesji wymagany do `setSession` po stronie serwera: access_token, refresh_token, expires_at, user.id, email).
  - Reuse: `ErrorResponseDTO` (istniejący), `ValidationErrorResponseDTO`.

#### 2.3. Mechanizm walidacji danych wejściowych (API)
- Zod w `src/lib/validators/auth.validator.ts`:
  - `authEventSchema` – whitelist dozwolonych wartości `event`.
  - `authSessionPayloadSchema` – minimalny zestaw pól sesji potrzebny do ustawienia cookies.
  - W `session.ts`: walidacja body, 400 na błędne dane.

#### 2.4. Obsługa wyjątków
- Spójna z istniejącym mechanizmem: `src/lib/utils/error-mapper.ts`.
- Logowanie błędów serwerowych (bez PII). Zwracamy ogólne komunikaty. Statusy: 400 (walidacja), 401/403 (autoryzacja – w przyszłości), 500 (nieoczekiwane błędy).

#### 2.5. Aktualizacja SSR (zgodnie z `astro.config.mjs` output: server)
- Middleware: `src/middleware/index.ts` – aktualizacja do per-request Supabase Server Client:
  - Zamiast pojedynczego `supabaseClient` (global), tworzony jest klient serwerowy z `@supabase/ssr` (`createServerClient`) na podstawie `Astro.cookies` dla każdego żądania.
  - W `context.locals` udostępniamy: `supabase` (klient serwerowy), `session` (wynik `await supabase.auth.getSession()`), `user` (skrócony profil z sesji: id, email).
  - Gdy brak cookies, `context.locals.user` może być `undefined`; warstwy API dla akcji domenowych zwracają 401/403 (brak fallbacku anonimowego).
  - Gdy `session` istnieje, zawsze używamy `context.locals.user.id`.
- Strony wymagające sesji (gdy `VITE_AUTH_ENFORCED=true`):
  - `src/pages/dashboard.astro`, `src/pages/notes/*`, `src/pages/plans/*` – na wejściu sprawdzają `context.locals.session`; jeśli brak, redirect do `/auth/login`.
  - Nagłówki cache: prywatne (`Cache-Control: private`) dla stron sesyjnych.


### 3. SYSTEM AUTENTYKACJI (Supabase + Astro)

#### 3.1. Klienci Supabase
- `src/db/supabase.client.ts` (przeglądarka):
  - Dodanie `createBrowserClient` (lub pozostawienie `createClient` z `persistSession: true`) i eksportu `supabaseBrowserClient` do użycia w komponentach React.
  - Rejestracja `onAuthStateChange` w `SessionSync.tsx` – wywołanie `/api/auth/session` z eventem i (jeśli dostępna) sesją.
- `src/db/supabase.server.ts` (nowy):
  - Fabryka per-request: `createSupabaseServerClient(context)` owijająca `createServerClient` z `@supabase/ssr` i operująca na `Astro.cookies`.
  - Używana w middleware i (opcjonalnie) w stronach SSR.

#### 3.2. Rejestracja, logowanie, wylogowanie
- Rejestracja: `supabase.auth.signUp({ email, password })` w `RegisterForm`.
  - W testach zamkniętych: wyłączone potwierdzanie mailowe (automatyczna sesja, zgodnie z PRD). W PROD – opcjonalnie włączyć potwierdzanie i zmodyfikować komunikaty UI.
- Logowanie: `supabase.auth.signInWithPassword({ email, password })` w `LoginForm`.
- Wylogowanie: przycisk w menu użytkownika wywołuje `POST /api/auth/logout` (czyści cookies SSR) oraz `supabase.auth.signOut()` po stronie klienta.

#### 3.3. Odzyskiwanie konta (reset hasła)
- `ResetPasswordForm`: `supabase.auth.resetPasswordForEmail(email, { redirectTo: <APP_URL>/auth/update-password })`.
- `UpdatePasswordForm` na `/auth/update-password`:
  - Po załadowaniu: `supabase.auth.exchangeCodeForSession(code)`.
  - Następnie: `supabase.auth.updateUser({ password: newPassword })`.
  - Po sukcesie: synchronizacja cookies (`/api/auth/session`) i redirect do `/dashboard`.

#### 3.4. Integracja z danymi domenowymi (Profile, Notes, Plans)
- Pierwsze logowanie: sprawdzenie w tle (po stronie klienta lub serwera) czy istnieje `profiles` dla `user.id` i czy jest kompletne (`ProfileDTO.is_complete`).
  - Jeżeli brak lub niekompletne → redirect do `/profile` (widok profilu do wdrożenia w osobnym zadaniu).
- Endpoints istniejące (`/api/notes`, `/api/plans/*`) wymagają sesji; bez sesji zwracają 401/403. Nie używamy fallbacku `DEFAULT_USER_ID` dla żadnych akcji domenowych.

- Scope danych: wszystkie zapytania i operacje domenowe wykonywane są w kontekście `user.id`. Brak sesji → brak dostępu do akcji domenowych.
- Limity generacji (US-009/US-010): liczone i egzekwowane per `user.id`. Brak sesji → generacja niedostępna.

#### 3.5. RLS i bezpieczeństwo (Supabase)
- Docelowe polityki RLS (produkcyjnie):
  - `notes`: INSERT/SELECT/UPDATE/DELETE gdy `user_id = auth.uid()`.
  - `plans`: SELECT gdy `plans.note_id` należy do notatki `user_id = auth.uid()`.
  - `profiles`: INSERT/SELECT/UPDATE gdy `id = auth.uid()`.
- Etapowanie:
  - DEV: polityki mogą być wyłączone; mimo to wszystkie akcje domenowe wymagają sesji (brak fallbacku). Zseedowane `DEFAULT_USER_ID` służy wyłącznie jako konto testowe dostępne po zalogowaniu.
  - PROD: włączenie RLS + endpointy oparte na `context.locals.user`.
- Cookie i sesje:
  - Cookies Supabase ustawiane wyłącznie jako `Secure`, `HttpOnly`, `SameSite=Lax`.
  - Brak ujawniania szczegółów błędów mechanizmów auth w UI/API.

#### 3.6. Konfiguracja środowiskowa
- Wymagane zmienne: `SUPABASE_URL`, `SUPABASE_KEY` (anon key), `PUBLIC_APP_URL` (do linków resetu hasła), `VITE_AUTH_ENFORCED`.
- Opcjonalnie: `SUPABASE_EMAIL_CONFIRM` (włączenie/wyłączenie potwierdzeń email na różnych środowiskach).


Załączniki: Struktura plików i modułów do dodania/aktualizacji
—
- `src/layouts/AuthLayout.astro` (nowy)
- `src/components/auth/AppHeader.tsx` (nowy)
- `src/components/auth/SessionSync.tsx` (nowy)
- `src/components/auth/LoginForm.tsx` (nowy)
- `src/components/auth/RegisterForm.tsx` (nowy)
- `src/components/auth/ResetPasswordForm.tsx` (nowy)
- `src/components/auth/UpdatePasswordForm.tsx` (nowy)
- `src/lib/validators/auth.validator.ts` (nowy – Zod schematy)
- `src/db/supabase.server.ts` (nowy – fabryka klienta SSR)
- `src/pages/auth/login.astro` (nowy)
- `src/pages/auth/register.astro` (nowy)
- `src/pages/auth/reset.astro` (nowy)
- `src/pages/auth/update-password.astro` (nowy)
- `src/pages/api/auth/session.ts` (nowy – POST)
- `src/pages/api/auth/logout.ts` (nowy – POST)
- `src/middleware/index.ts` (aktualizacja – per-request server client + `locals.session`, `locals.user`)
- `src/types.ts` (rozszerzenie o typy auth DTO)
- `src/pages/profile.astro` (nowy – placeholder; właściwy formularz profilu w osobnym zadaniu)


Przepływy nawigacji i przekierowań
—
- Użytkownik niezalogowany → odwiedza `/dashboard` (gdy `VITE_AUTH_ENFORCED=true`) → redirect do `/auth/login`.
- Użytkownik rejestruje się → automatyczna sesja → jeśli profil niekompletny → `/profile`, w przeciwnym razie `/dashboard`.
- Użytkownik klika „Nie pamiętasz hasła?” → `/auth/reset` → email → link → `/auth/update-password` → nowe hasło → `/dashboard`.
- Użytkownik zalogowany wchodzi na `/auth/login` lub `/auth/register` → redirect do `/dashboard`.


Dostępność i UX
—
- Formularze: etykiety, `aria-invalid`, komunikaty błędów powiązane z polami (`aria-describedby`).
- Focus management: po błędzie ustawienie focusu na pierwszym niepoprawnym polu.
- Teksty neutralne bezpieczeństwa: reset hasła nie potwierdza istnienia adresu.


Ryzyka i mitigacje
—
- Różnica stanów między klientem a SSR: rozwiązane przez `SessionSync.tsx` i endpoint `/api/auth/session`.
- Brak RLS w DEV: etapowanie bez fallbacku; sesja wymagana do akcji w każdym środowisku.
- Zmiany w middleware: brak fallbacku; gdy brak sesji, zwracamy 401/403 lub redirect (dla stron objętych `VITE_AUTH_ENFORCED`).


Kryteria akceptacji (powiązanie z PRD)
—
- US-001: rejestracja i logowanie – spełnione (strony, formularze, autologowanie po rejestracji w testach).
- US-002: pierwsze logowanie → przekierowanie do profilu – przewidziane (hook po logowaniu; profil w osobnym zadaniu).
- US-003: edycja profilu – poza zakresem tego zadania; dodany placeholder `/profile` zapewnia spójny redirect. Właściwa edycja i zapis preferencji będą realizowane oddzielnie.
- Limit generacji planów (US-009/US-010) – bez zmian w tym zadaniu; autoryzacja/konto będą podstawą do egzekwowania limitów w kolejnych iteracjach.



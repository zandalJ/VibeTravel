# API Endpoint Implementation Plan: Get Specific Note Details

## 1. Przegląd punktu końcowego

Endpoint `GET /api/notes/:id` służy do pobierania szczegółowych informacji o konkretnej notatce podróżnej na podstawie jej unikalnego identyfikatora (UUID). Jest to operacja odczytu (read) wymagająca uwierzytelnienia użytkownika oraz weryfikacji, że użytkownik jest właścicielem żądanej notatki.

**Główne cele:**
- Umożliwienie użytkownikom przeglądania szczegółów swoich notatek podróżnych
- Zapewnienie bezpieczeństwa poprzez weryfikację autoryzacji (użytkownik może odczytać tylko własne notatki)
- Zwrócenie pełnych danych notatki zgodnie z DTO zdefiniowanym w `src/types.ts`

**Kontekst biznesowy:**
Endpoint jest kluczowy dla funkcjonalności wyświetlania szczegółów notatki na frontend'zie, np. na stronie edycji notatki lub podczas przeglądania historii planów podróży powiązanych z daną notatką.

## 2. Szczegóły żądania

### Metoda HTTP
`GET`

### Struktura URL
`/api/notes/:id`

Gdzie `:id` to UUID notatki (np. `550e8400-e29b-41d4-a716-446655440000`)

### Parametry

#### Wymagane parametry URL:
- **`id`** (string, UUID): Unikalny identyfikator notatki
  - Format: UUID v4 (np. `550e8400-e29b-41d4-a716-446655440000`)
  - Walidacja: Musi być poprawnym formatem UUID
  - Błąd: Zwraca 400 Bad Request jeśli format jest nieprawidłowy

#### Opcjonalne parametry:
Brak

### Headers
- **`Authorization`**: Wymagany header z tokenem sesji Supabase (automatycznie zarządzany przez Supabase client w `context.locals.supabase`)
- **`Content-Type`**: Nie dotyczy (GET nie ma body)

### Request Body
Brak (metoda GET)

### Przykładowe żądanie
```http
GET /api/notes/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: vibetravel.com
Authorization: Bearer <supabase-session-token>
```

## 3. Wykorzystywane typy

### DTOs (Data Transfer Objects)

#### NoteDTO
**Lokalizacja:** `src/types.ts` (linie 51-60)

Reprezentuje pełne dane notatki zwracane przez endpoint.

```typescript
export interface NoteDTO {
  id: string;                      // UUID notatki
  destination: string;             // Cel podróży (max 255 znaków)
  start_date: string;              // Data rozpoczęcia (ISO 8601)
  end_date: string;                // Data zakończenia (ISO 8601)
  total_budget?: number | null;    // Budżet całkowity (opcjonalny)
  additional_notes?: string | null; // Dodatkowe notatki (opcjonalne, max 10k znaków)
  created_at: string;              // Data utworzenia (timestamp z timezone)
  updated_at: string;              // Data ostatniej modyfikacji (timestamp z timezone)
}
```

#### ErrorResponseDTO
**Lokalizacja:** `src/types.ts` (linie 179-183)

Standardowa struktura odpowiedzi błędu.

```typescript
export interface ErrorResponseDTO {
  error: string;                           // Komunikat czytelny dla człowieka
  code: string;                           // Kod błędu do obsługi programistycznej
  details?: Record<string, unknown>;      // Dodatkowe szczegóły (opcjonalne)
}
```

#### ValidationErrorResponseDTO
**Lokalizacja:** `src/types.ts` (linie 189-192)

Struktura dla błędów walidacji.

```typescript
export interface ValidationErrorResponseDTO extends ErrorResponseDTO {
  code: "VALIDATION_ERROR";
  details: Record<string, string>;  // Mapowanie: nazwa pola -> komunikat błędu
}
```

### Command Models

Ten endpoint nie wykorzystuje Command Models, ponieważ jest operacją odczytu (GET) bez body.

### Database Types

Z tabeli `notes` (zgodnie z `.ai/db-plan.md`):
- Wszystkie pola zgodne z `NoteDTO`
- Dodatkowo `user_id` (UUID) - używany do weryfikacji autoryzacji, ale NIE zwracany w response

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

**Status Code:** `200 OK`

**Headers:**
```http
Content-Type: application/json
```

**Body (NoteDTO):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "destination": "Barcelona, Spain",
  "start_date": "2025-12-01",
  "end_date": "2025-12-07",
  "total_budget": 1000.00,
  "additional_notes": "Want to see Sagrada Familia and Gothic Quarter",
  "created_at": "2025-10-11T10:30:00Z",
  "updated_at": "2025-10-11T10:30:00Z"
}
```

### Błąd walidacji (400 Bad Request)

**Scenariusz:** Nieprawidłowy format UUID w parametrze `:id`

**Body:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "id": "Invalid UUID format"
  }
}
```

### Brak autoryzacji (401 Unauthorized)

**Scenariusz:** Użytkownik nie jest zalogowany (brak sesji Supabase)

**Body:**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

### Brak dostępu (403 Forbidden)

**Scenariusz:** Użytkownik jest zalogowany, ale notatka należy do innego użytkownika

**Body:**
```json
{
  "error": "You don't have permission to access this note",
  "code": "FORBIDDEN"
}
```

### Nie znaleziono (404 Not Found)

**Scenariusz:** Notatka o podanym ID nie istnieje w bazie danych

**Body:**
```json
{
  "error": "Note not found",
  "code": "NOT_FOUND"
}
```

### Błąd serwera (500 Internal Server Error)

**Scenariusz:** Nieoczekiwany błąd (np. problem z bazą danych)

**Body:**
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "details": {
    "message": "An unexpected error occurred. Please try again later."
  }
}
```

## 5. Przepływ danych

### Diagram przepływu

```
Client Request (GET /api/notes/:id)
    ↓
[1] Astro API Route Handler
    ↓
[2] Extract & Validate noteId from URL params
    ├─ Invalid UUID? → Return 400 Bad Request
    └─ Valid UUID ✓
        ↓
[3] Authentication Check (Supabase Auth)
    ├─ No session? → Return 401 Unauthorized
    └─ Session exists ✓
        ↓
[4] NotesService.getNoteById(noteId, userId)
    ↓
[5] Database Query (Supabase)
    SELECT * FROM notes WHERE id = :noteId
    ├─ No result? → Return 404 Not Found
    └─ Result found ✓
        ↓
[6] Authorization Check
    note.user_id === authenticated_user.id?
    ├─ No match? → Return 403 Forbidden
    └─ Match ✓
        ↓
[7] Transform to NoteDTO (exclude user_id)
    ↓
[8] Return 200 OK with NoteDTO
    ↓
Client receives note data
```

### Szczegółowy opis kroków

#### [1] Astro API Route Handler
- Plik: `src/pages/api/notes/[id].ts` (nowy plik do utworzenia)
- Metoda: `export const GET: APIRoute`
- Konfiguracja: `export const prerender = false` (SSR required)
- Dostęp do kontekstu: `context.params`, `context.locals.supabase`

#### [2] Extract & Validate noteId
- Pobranie parametru: `const { id } = context.params`
- Walidacja UUID: Wykorzystaj istniejący validator z `src/lib/validators/plan-generation.validator.ts` (funkcja `validateNoteId`) lub stwórz nowy validator w `src/lib/validators/notes.validator.ts`
- W przypadku błędu: throw `ValidationError` lub Zod error

#### [3] Authentication Check
- Pobierz użytkownika: `const { data: { user }, error } = await context.locals.supabase.auth.getUser()`
- Sprawdź błąd autoryzacji lub brak użytkownika
- W przypadku błędu: return 401 Unauthorized z odpowiednim ErrorResponseDTO

#### [4] NotesService.getNoteById()
- Rozszerz istniejący `NotesService` w `src/lib/services/notes.service.ts`
- Nowa metoda: `async getNoteById(noteId: string, userId: string): Promise<NoteDTO>`
- Parametry:
  - `noteId`: UUID notatki do pobrania
  - `userId`: UUID zalogowanego użytkownika (do weryfikacji właściciela)

#### [5] Database Query
- Query: `this.supabase.from("notes").select("*").eq("id", noteId).single()`
- Obsługa błędów Supabase:
  - `error.code === 'PGRST116'` → Note not found (404)
  - Inne błędy → Internal server error (500)

#### [6] Authorization Check
- Porównaj `note.user_id` z `userId`
- Jeśli niezgodność: throw `ForbiddenError` (można utworzyć w `src/lib/errors/notes.errors.ts` lub wykorzystać z `plan-generation.errors.ts`)

#### [7] Transform to NoteDTO
- Usuń pole `user_id` z obiektu przed zwróceniem
- Upewnij się, że typy date są w formacie ISO 8601 string
- Opcjonalnie: można stworzyć helper function `mapNoteToDTO(dbNote): NoteDTO`

#### [8] Return Response
- Status: 200
- Headers: `Content-Type: application/json`
- Body: Zserializowany JSON z NoteDTO

### Interakcje z zewnętrznymi usługami

1. **Supabase Auth**: Weryfikacja sesji użytkownika
2. **Supabase Database**: Odczyt danych z tabeli `notes`
3. Brak interakcji z AI (nie dotyczy tego endpointa)

## 6. Względy bezpieczeństwa

### Uwierzytelnianie (Authentication)

**Mechanizm:** Supabase Auth via session token

**Implementacja:**
1. Wykorzystaj `context.locals.supabase.auth.getUser()` do pobrania zalogowanego użytkownika
2. Sprawdź czy `user` nie jest null i czy brak `error`
3. Jeśli brak użytkownika lub błąd autoryzacji:
   ```typescript
   return new Response(JSON.stringify({
     error: "Authentication required",
     code: "UNAUTHORIZED"
   }), {
     status: 401,
     headers: { "Content-Type": "application/json" }
   });
   ```

**Uwagi:**
- Token sesji jest automatycznie zarządzany przez Supabase client
- Middleware Astro może automatycznie obsługiwać odświeżanie tokenów (jeśli skonfigurowane)

### Autoryzacja (Authorization)

**Mechanizm:** Weryfikacja właściciela notatki (owner-based access control)

**Implementacja:**
1. Po pobraniu notatki z bazy danych, porównaj `note.user_id` z `user.id`
2. Jeśli niezgodność:
   ```typescript
   throw new ForbiddenError("You don't have permission to access this note");
   ```
3. Error mapper przekształci to w 403 response

**Kolejność sprawdzeń (ważne dla bezpieczeństwa informacji):**
Zgodnie ze specyfikacją API, endpoint zwraca:
- 404 Not Found - jeśli notatka nie istnieje
- 403 Forbidden - jeśli użytkownik nie ma dostępu

**Implementacja sekwencji:**
1. Najpierw sprawdź czy notatka istnieje (404)
2. Potem sprawdź czy użytkownik jest właścicielem (403)

Takie podejście zapobiega ujawnieniu informacji o istnieniu notatek innych użytkowników.

### Walidacja danych wejściowych

**UUID Validation:**
- Wykorzystaj Zod schema lub regex do walidacji formatu UUID
- Przykład z Zod:
  ```typescript
  const noteIdSchema = z.string().uuid("Invalid UUID format");
  ```
- Alternatywnie: wykorzystaj istniejącą funkcję `validateNoteId` z `src/lib/validators/plan-generation.validator.ts`

**Zapobieganie SQL Injection:**
- Supabase automatycznie sanitizuje parametry w zapytaniach
- Nie buduj raw SQL queries, używaj metod `.eq()`, `.select()` itp.

### Row Level Security (RLS)

**Rekomendacja:** Rozważ skonfigurowanie RLS policies w Supabase dla tabeli `notes`:

```sql
-- Policy: Users can only read their own notes
CREATE POLICY "Users can read own notes"
ON notes FOR SELECT
USING (auth.uid() = user_id);
```

**Zalety:**
- Automatyczna ochrona na poziomie bazy danych
- Dodatkowa warstwa bezpieczeństwa (defense in depth)
- Uproszczenie kodu (nie trzeba ręcznie sprawdzać `user_id`)

**Implementacja z RLS:**
Jeśli RLS jest włączone, query automatycznie zwróci tylko notatki użytkownika. Jeśli notatka nie istnieje lub należy do innego użytkownika, Supabase zwróci pusty wynik. W takim przypadku można zwrócić 404 zamiast rozróżniać 404 vs 403.

**Bez RLS (aktualna implementacja):**
Należy ręcznie sprawdzać `note.user_id === user.id` w kodzie aplikacji.

### Rate Limiting

**Rekomendacja dla produkcji:**
- Skonfiguruj rate limiting na poziomie API gateway lub reverse proxy (np. Nginx)
- Limit: np. 100 żądań/minutę per użytkownik dla GET endpoints
- Dla MVP: opcjonalne

### Logowanie bezpieczeństwa

**Co logować:**
- Nieautoryzowane próby dostępu (401, 403)
- Nieprawidłowe formaty UUID (potencjalne próby ataków)
- Błędy wewnętrzne (500)

**Co NIE logować:**
- Prawidłowe żądania użytkowników (szum w logach)
- Dane wrażliwe (tokeny, hasła)

**Przykład:**
```typescript
if (note.user_id !== user.id) {
  console.warn(`[GET /api/notes/:id] Unauthorized access attempt: user ${user.id} tried to access note ${noteId} owned by ${note.user_id}`);
  throw new ForbiddenError("You don't have permission to access this note");
}
```

## 7. Obsługa błędów

### Macierz błędów

| Scenariusz | Typ błędu | Status Code | Error Code | Komunikat | Szczegóły |
|------------|-----------|-------------|------------|-----------|-----------|
| Nieprawidłowy format UUID | Validation | 400 | `VALIDATION_ERROR` | "Validation failed" | `{ "id": "Invalid UUID format" }` |
| Brak sesji użytkownika | Authentication | 401 | `UNAUTHORIZED` | "Authentication required" | - |
| Sesja wygasła | Authentication | 401 | `UNAUTHORIZED` | "Authentication required" | - |
| Użytkownik nie jest właścicielem | Authorization | 403 | `FORBIDDEN` | "You don't have permission to access this note" | - |
| Notatka nie istnieje | Not Found | 404 | `NOT_FOUND` | "Note not found" | `{ "resourceType": "note", "resourceId": "<id>" }` |
| Błąd połączenia z bazą | Server | 500 | `INTERNAL_ERROR` | "Internal server error" | `{ "message": "An unexpected error occurred..." }` |
| Nieoczekiwany błąd | Server | 500 | `INTERNAL_ERROR` | "Internal server error" | `{ "message": "An unexpected error occurred..." }` |

### Implementacja obsługi błędów

#### Wykorzystanie istniejącego Error Mappera

Plik: `src/lib/utils/error-mapper.ts`

Endpoint powinien wykorzystywać funkcję `createErrorResponse(error)`, która automatycznie mapuje błędy na odpowiednie response:

```typescript
export const GET: APIRoute = async (context) => {
  try {
    // ... logika endpointa
  } catch (error) {
    console.error("[GET /api/notes/:id] Error occurred:", error);
    return createErrorResponse(error);
  }
};
```

#### Definiowanie custom errors

**Lokalizacja:** `src/lib/errors/notes.errors.ts` (nowy plik) lub wykorzystaj istniejące z `src/lib/errors/plan-generation.errors.ts`

**Przykładowe klasy błędów:**

```typescript
export class NotFoundError extends Error {
  constructor(
    message: string,
    public resourceType: string,
    public resourceId: string
  ) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public reason: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}
```

**Uwaga:** Te klasy już istnieją w `src/lib/errors/plan-generation.errors.ts`, można je wykorzystać ponownie.

#### Walidacja z Zod

Dla walidacji UUID, wykorzystaj Zod i pozwól aby error mapper obsłużył `z.ZodError`:

```typescript
import { z } from "zod";

const noteIdSchema = z.string().uuid("Invalid UUID format");

// W endpoint handler:
try {
  const validatedNoteId = noteIdSchema.parse(noteId);
  // ...
} catch (error) {
  // error-mapper automatycznie obsłuży z.ZodError
  return createErrorResponse(error);
}
```

#### Logowanie błędów

**Strategia logowania:**

1. **Development:**
   - Log wszystkich błędów z pełnym stack trace
   - `console.error("[GET /api/notes/:id]", error, error.stack)`

2. **Production:**
   - Log tylko błędów 500 (nieoczekiwanych)
   - Użyj zewnętrznego serwisu (np. Sentry, LogRocket)
   - NIE loguj błędów 400/401/403/404 (oczekiwane błędy użytkownika)

**Implementacja:**

```typescript
catch (error) {
  // Log only unexpected errors (500s)
  if (!(error instanceof ValidationError) &&
      !(error instanceof NotFoundError) &&
      !(error instanceof ForbiddenError)) {
    console.error("[GET /api/notes/:id] Unexpected error:", error);

    // Production: send to error tracking service
    if (import.meta.env.PROD) {
      // Sentry.captureException(error);
    }
  }

  return createErrorResponse(error);
}
```

### Testy obsługi błędów

Endpoint powinien być testowany dla wszystkich scenariuszy błędów:

1. Test: Nieprawidłowy UUID → 400
2. Test: Brak autoryzacji → 401
3. Test: Dostęp do cudzej notatki → 403
4. Test: Nieistniejąca notatka → 404
5. Test: Błąd bazy danych → 500

## 8. Rozważania dotyczące wydajności

### Potencjalne wąskie gardła

1. **Database Query Performance:**
   - Query: `SELECT * FROM notes WHERE id = :id`
   - Potencjalne opóźnienie: ~10-50ms (zależnie od lokalizacji bazy)
   - Mitigacja: Upewnij się, że kolumna `id` jest zaindeksowana (domyślnie UUID primary key jest indeksowany)

2. **Authentication Check:**
   - `supabase.auth.getUser()` wykonuje call do Supabase Auth API
   - Potencjalne opóźnienie: ~50-100ms
   - Mitigacja: Middleware Astro może cachować informacje o użytkowniku w `context.locals`

3. **Network Latency:**
   - Round trip do Supabase (Auth + Database)
   - Potencjalne opóźnienie: ~100-200ms łącznie
   - Mitigacja: Hosting aplikacji w tym samym regionie co Supabase

### Strategie optymalizacji

#### 1. Caching (dla przyszłości)

**User session caching:**
- Wykorzystaj middleware Astro do cachowania informacji o użytkowniku
- Zapisz `user.id` w `context.locals.user` po pierwszym sprawdzeniu
- Uniknij wielokrotnych wywołań `getUser()` w tym samym request

**Note caching (opcjonalne dla MVP):**
- Rozważ Redis lub in-memory cache dla często odczytywanych notatek
- TTL: 5-10 minut
- Invalidacja: Po update/delete notatki

#### 2. Database Indexing

Upewnij się, że następujące indeksy istnieją:
- `notes.id` (primary key) - domyślnie zaindeksowany
- `notes.user_id` - indeks dla szybkiego filtrowania po właścicielu
- Composite index: `(user_id, id)` - dla optymalizacji query z oboma warunkami

**SQL dla composite index:**
```sql
CREATE INDEX idx_notes_user_id_id ON notes(user_id, id);
```

#### 3. Query Optimization

**Optymalizacja SELECT:**
- Zamiast `SELECT *`, wybierz tylko potrzebne kolumny:
  ```typescript
  .select("id, destination, start_date, end_date, total_budget, additional_notes, created_at, updated_at")
  ```
- Uniknij pobierania `user_id` jeśli nie jest zwracany w response (jednak potrzebny do weryfikacji autoryzacji)

**Single query approach:**
```typescript
// Zamiast 2 query (existence check + ownership check)
// Wykonaj 1 query z warunkiem user_id
const { data, error } = await this.supabase
  .from("notes")
  .select("*")
  .eq("id", noteId)
  .eq("user_id", userId)  // Combined condition
  .single();

// Jeśli brak wyniku: mogło być 404 lub 403
// Wymaga dodatkowej query aby rozróżnić:
if (!data) {
  // Check if note exists at all
  const { data: noteExists } = await this.supabase
    .from("notes")
    .select("id")
    .eq("id", noteId)
    .single();

  if (!noteExists) throw new NotFoundError("Note not found", "note", noteId);
  else throw new ForbiddenError("You don't have permission to access this note");
}
```

**Kompromis:** Podejście single query wymaga dodatkowej query w przypadku 404/403. Dla większości przypadków (success path), jest szybsze.

#### 4. Response Size Optimization

- Endpoint zwraca stosunkowo małą ilość danych (~500 bytes JSON)
- Rozważ kompresję gzip na poziomie serwera (Astro/Node.js)
- Opcjonalnie: HTTP/2 server push (dla przyszłości)

#### 5. Monitoring

**Metryki do śledzenia:**
- Response time (p50, p95, p99)
- Database query duration
- Error rate (grouped by status code)
- Request rate (per user)

**Narzędzia:**
- APM: New Relic, DataDog, lub własne logowanie
- Database monitoring: Supabase dashboard
- Alerts: Response time > 500ms, error rate > 5%

### Benchmarki (oczekiwane)

| Scenariusz | Target Response Time | Akceptowalne |
|------------|---------------------|--------------|
| Success path (200) | < 100ms | < 200ms |
| Not found (404) | < 100ms | < 200ms |
| Forbidden (403) | < 150ms | < 300ms |
| Validation error (400) | < 50ms | < 100ms |
| Auth error (401) | < 100ms | < 200ms |

## 9. Kroki implementacji

### Krok 1: Przygotowanie środowiska

**1.1. Utworzenie struktury plików:**

```bash
# Endpoint file
touch src/pages/api/notes/[id].ts

# Errors (jeśli nie istnieją)
touch src/lib/errors/notes.errors.ts

# Validators extension (opcjonalne)
# Jeśli validateNoteId już istnieje w plan-generation.validator.ts, pomiń ten krok
```

**1.2. Upewnienie się, że RLS nie blokuje zapytań:**

Sprawdź w Supabase Dashboard > Authentication > Policies czy tabela `notes` ma odpowiednie policies. Jeśli nie, możesz implementować autoryzację w kodzie aplikacji (opisane w dalszych krokach).

### Krok 2: Implementacja walidacji noteId

**Opcja A: Wykorzystaj istniejący validator**

Plik: `src/lib/validators/plan-generation.validator.ts`

Sprawdź czy funkcja `validateNoteId` istnieje. Jeśli tak, import i użyj:

```typescript
import { validateNoteId } from "../../../lib/validators/plan-generation.validator";
```

**Opcja B: Utwórz nowy validator w notes.validator.ts**

```typescript
// src/lib/validators/notes.validator.ts
import { z } from "zod";

/**
 * Validates that a string is a valid UUID format
 */
export const noteIdSchema = z.string().uuid("Invalid UUID format");

/**
 * Validates and returns a note ID
 * @throws z.ZodError if invalid
 */
export function validateNoteId(noteId: string | undefined): string {
  if (!noteId) {
    throw new z.ZodError([{
      code: "custom",
      path: ["id"],
      message: "Note ID is required"
    }]);
  }

  return noteIdSchema.parse(noteId);
}
```

### Krok 3: Rozszerzenie NotesService

**Plik:** `src/lib/services/notes.service.ts`

Dodaj metodę `getNoteById`:

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateNoteCommand, NoteDTO } from "../../types";
import { NotFoundError, ForbiddenError } from "../errors/notes.errors"; // lub plan-generation.errors

export class NotesService {
  constructor(private supabase: SupabaseClient) {}

  // ... existing createNote method ...

  /**
   * Retrieves a specific note by ID with authorization check
   *
   * @param noteId - UUID of the note to retrieve
   * @param userId - UUID of the authenticated user
   * @returns Promise resolving to NoteDTO
   * @throws NotFoundError if note doesn't exist
   * @throws ForbiddenError if user doesn't own the note
   * @throws Error for database errors
   */
  async getNoteById(noteId: string, userId: string): Promise<NoteDTO> {
    // Step 1: Query note from database
    const { data, error } = await this.supabase
      .from("notes")
      .select("*")
      .eq("id", noteId)
      .single();

    // Step 2: Handle database errors
    if (error) {
      // Check if error is "not found"
      if (error.code === "PGRST116") {
        throw new NotFoundError(
          "Note not found",
          "note",
          noteId
        );
      }

      // Other database errors
      console.error("[NotesService.getNoteById] Database error:", error);
      throw new Error(`Failed to retrieve note: ${error.message}`);
    }

    // Step 3: Verify note exists (redundant if error handling above is correct, but safe)
    if (!data) {
      throw new NotFoundError(
        "Note not found",
        "note",
        noteId
      );
    }

    // Step 4: Authorization check - verify ownership
    if (data.user_id !== userId) {
      throw new ForbiddenError(
        "You don't have permission to access this note"
      );
    }

    // Step 5: Transform to NoteDTO (exclude user_id)
    const noteDTO: NoteDTO = {
      id: data.id,
      destination: data.destination,
      start_date: data.start_date,
      end_date: data.end_date,
      total_budget: data.total_budget,
      additional_notes: data.additional_notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return noteDTO;
  }
}
```

### Krok 4: Utworzenie/weryfikacja klas błędów

**Plik:** `src/lib/errors/notes.errors.ts` (lub wykorzystaj istniejące z `plan-generation.errors.ts`)

Sprawdź czy następujące klasy błędów istnieją. Jeśli tak, import z odpowiedniego pliku:

```typescript
/**
 * Error thrown when a requested resource is not found
 */
export class NotFoundError extends Error {
  constructor(
    message: string,
    public resourceType: string,
    public resourceId: string
  ) {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Error thrown when user doesn't have permission to access a resource
 */
export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}
```

**Uwaga:** Jeśli te klasy już istnieją w `src/lib/errors/plan-generation.errors.ts`, po prostu zaimportuj je stamtąd:

```typescript
import { NotFoundError, ForbiddenError } from "../errors/plan-generation.errors";
```

### Krok 5: Implementacja API endpoint handler

**Plik:** `src/pages/api/notes/[id].ts`

```typescript
import type { APIRoute } from "astro";
import { NotesService } from "../../../lib/services/notes.service";
import { validateNoteId } from "../../../lib/validators/notes.validator"; // lub plan-generation.validator
import { createErrorResponse } from "../../../lib/utils/error-mapper";

export const prerender = false;

/**
 * GET /api/notes/:id
 * Retrieves a specific note with authorization check
 *
 * URL Parameters:
 * - id: UUID of the note to retrieve
 *
 * Response: 200 OK with NoteDTO
 *
 * Error responses:
 * - 400 Bad Request: Invalid UUID format
 * - 401 Unauthorized: No valid session
 * - 403 Forbidden: User doesn't own the note
 * - 404 Not Found: Note doesn't exist
 * - 500 Internal Server Error: Database or unexpected errors
 */
export const GET: APIRoute = async (context) => {
  try {
    // Step 1: Extract and validate noteId from URL params
    const { id } = context.params;
    console.log("[GET /api/notes/:id] Received noteId:", id);

    const validatedNoteId = validateNoteId(id);
    console.log("[GET /api/notes/:id] Validated noteId:", validatedNoteId);

    // Step 2: Authentication check - get current user
    const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      console.warn("[GET /api/notes/:id] Authentication failed:", authError?.message);
      return new Response(
        JSON.stringify({
          error: "Authentication required",
          code: "UNAUTHORIZED",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("[GET /api/notes/:id] Authenticated user:", user.id);

    // Step 3: Initialize notes service
    const notesService = new NotesService(context.locals.supabase);

    // Step 4: Retrieve note with authorization check
    console.log("[GET /api/notes/:id] Fetching note...");
    const note = await notesService.getNoteById(validatedNoteId, user.id);
    console.log("[GET /api/notes/:id] Note retrieved successfully:", note.id);

    // Step 5: Return success response
    return new Response(JSON.stringify(note), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Step 6: Handle all errors with error mapper
    console.error("[GET /api/notes/:id] Error occurred:", error);

    if (error instanceof Error) {
      console.error("[GET /api/notes/:id] Error stack:", error.stack);
    }

    return createErrorResponse(error);
  }
};
```

### Krok 6: Weryfikacja error-mapper

**Plik:** `src/lib/utils/error-mapper.ts`

Upewnij się, że `mapErrorToResponse` obsługuje wszystkie potrzebne typy błędów:

- ✅ `z.ZodError` - już obsługiwany (linia 39-54)
- ✅ `ValidationError` - już obsługiwany (linia 57-68)
- ✅ `NotFoundError` - już obsługiwany (linia 71-83)
- ✅ `ForbiddenError` - już obsługiwany (linia 86-94)

**Akcja:** Brak zmian potrzebnych. Istniejący error mapper jest wystarczający.

### Krok 7: Testowanie endpoint'u

**7.1. Testy manualne (curl/Postman):**

```bash
# Test 1: Valid request (success path)
curl -X GET "http://localhost:4321/api/notes/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <your-supabase-token>"

# Expected: 200 OK with NoteDTO

# Test 2: Invalid UUID
curl -X GET "http://localhost:4321/api/notes/invalid-uuid" \
  -H "Authorization: Bearer <your-supabase-token>"

# Expected: 400 Bad Request

# Test 3: No authentication
curl -X GET "http://localhost:4321/api/notes/550e8400-e29b-41d4-a716-446655440000"

# Expected: 401 Unauthorized

# Test 4: Note doesn't exist
curl -X GET "http://localhost:4321/api/notes/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer <your-supabase-token>"

# Expected: 404 Not Found

# Test 5: Note belongs to another user
# (Requires creating note with different user_id)
curl -X GET "http://localhost:4321/api/notes/<other-user-note-id>" \
  -H "Authorization: Bearer <your-supabase-token>"

# Expected: 403 Forbidden
```

**7.2. Testy jednostkowe (opcjonalne dla MVP):**

Lokalizacja: `src/lib/services/__tests__/notes.service.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { NotesService } from "../notes.service";
import { NotFoundError, ForbiddenError } from "../../errors/notes.errors";

describe("NotesService.getNoteById", () => {
  // Mock Supabase client
  // ...

  it("should return note for authorized user", async () => {
    // Arrange
    const noteId = "test-note-id";
    const userId = "test-user-id";
    // Mock supabase response

    // Act
    const result = await notesService.getNoteById(noteId, userId);

    // Assert
    expect(result.id).toBe(noteId);
  });

  it("should throw NotFoundError if note doesn't exist", async () => {
    // Arrange & Act & Assert
    await expect(
      notesService.getNoteById("non-existent-id", "user-id")
    ).rejects.toThrow(NotFoundError);
  });

  it("should throw ForbiddenError if user doesn't own note", async () => {
    // Arrange & Act & Assert
    await expect(
      notesService.getNoteById("note-id", "wrong-user-id")
    ).rejects.toThrow(ForbiddenError);
  });
});
```

### Krok 8: Dokumentacja i cleanup

**8.1. Aktualizacja dokumentacji API:**

Jeśli istnieje plik dokumentacji API (np. `.ai/api-spec.md`), dodaj opis tego endpointu.

**8.2. Usunięcie console.log w produkcji:**

Przed deployment do produkcji, rozważ usunięcie lub zmianę poziomu logowania `console.log` statements na bardziej odpowiednie (np. debug level w strukturyzowanym loggerze).

**8.3. Code review checklist:**

- [ ] Walidacja UUID działa poprawnie
- [ ] Authentication check zwraca 401 dla niezalogowanych
- [ ] Authorization check zwraca 403 dla nieautoryzowanych
- [ ] NotFoundError zwraca 404 dla nieistniejących notatek
- [ ] Error responses mają poprawną strukturę (zgodnie z DTO)
- [ ] Brak wycieków danych (user_id nie jest zwracany w response)
- [ ] Kód jest zgodny z guidelines z `.cursor/rules/`
- [ ] Testy manualne przechodzą dla wszystkich scenariuszy
- [ ] Performance jest akceptowalne (< 200ms response time)

### Krok 9: Deployment

**9.1. Pre-deployment checks:**

- [ ] Sprawdź czy environment variables s�� poprawnie skonfigurowane (Supabase URL, keys)
- [ ] Upewnij się, że middleware Astro prawidłowo inicjalizuje `context.locals.supabase`
- [ ] Sprawdź czy database migrations są zaktualizowane (jeśli były jakieś zmiany w schemacie)

**9.2. Deployment process:**

Zgodnie z tech stack (DigitalOcean + Docker):

```bash
# Build Docker image
docker build -t vibetravel-api .

# Push to container registry
docker push <registry>/vibetravel-api:latest

# Deploy to DigitalOcean
# (Według skonfigurowanego CI/CD pipeline)
```

**9.3. Post-deployment verification:**

```bash
# Smoke test w produkcji
curl -X GET "https://vibetravel.com/api/notes/<test-note-id>" \
  -H "Authorization: Bearer <test-user-token>"

# Expected: 200 OK
```

**9.4. Monitoring:**

- Sprawdź logi w pierwszych 24h po deployment
- Monitoruj error rate i response times w Supabase Dashboard lub APM tool
- Ustawienie alertów dla error rate > 5% lub response time > 500ms

---

## Podsumowanie

Ten plan implementacji dostarcza kompletny przewodnik dla zespołu developerskiego do wdrożenia endpointu `GET /api/notes/:id`. Kluczowe aspekty:

1. **Bezpieczeństwo**: Wielowarstwowa weryfikacja (authentication + authorization)
2. **Walidacja**: Zod schema dla UUID validation
3. **Błędy**: Wykorzystanie istniejącego error mappera dla spójnych responses
4. **Performance**: Optymalizacja query z composite index
5. **Kod**: Zgodność z guidelines i reużycie istniejących komponentów (NotesService, error classes)

Implementacja powinna zająć 2-4 godziny dla doświadczonego developera, włączając testy manualne.
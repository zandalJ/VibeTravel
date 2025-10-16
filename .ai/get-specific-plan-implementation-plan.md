# API Endpoint Implementation Plan: Get Specific Plan

## 1. Przegląd punktu końcowego

Endpoint `GET /api/plans/:id` służy do pobierania szczegółowych informacji o konkretnym planie podróży. Zwraca pełne dane planu wraz z podstawowymi informacjami o powiązanej notatce (destination, start_date, end_date).

**Główne cechy:**
- Operacja tylko do odczytu (GET)
- Wymaga uwierzytelnienia przez Supabase session
- Weryfikuje autoryzację poprzez sprawdzenie, czy użytkownik jest właścicielem notatki powiązanej z planem
- Zwraca zagnieżdżoną strukturę danych (plan + note details)
- Nie zapisuje logów do `generation_logs` (tylko operacja read)

**Przypadki użycia:**
- Wyświetlenie szczegółów konkretnego planu na dedykowanej stronie
- Podgląd planu z listy historii planów
- Udostępnianie linku do konkretnego planu

---

## 2. Szczegóły żądania

### Metoda HTTP
`GET`

### Struktura URL
```
/api/plans/:id
```

### Parametry

**Path Parameters:**
- **`id`** (wymagany) - UUID planu do pobrania
  - Format: UUID v4 (np. `550e8400-e29b-41d4-a716-446655440000`)
  - Walidacja: musi być prawidłowym formatem UUID
  - Przykład: `/api/plans/550e8400-e29b-41d4-a716-446655440000`

**Query Parameters:**
- Brak

**Request Headers:**
- `Cookie: sb-access-token` (wymagany) - token sesji Supabase
- `Cookie: sb-refresh-token` (wymagany) - refresh token Supabase

**Request Body:**
- Brak (metoda GET)

---

## 3. Wykorzystywane typy

### DTOs z `types.ts`

**PlanDTO** - zwracany w odpowiedzi 200:
```typescript
export interface PlanDTO extends PlanListItemDTO {
  note: {
    destination: string;
    start_date: string;
    end_date: string;
  };
}
```

**PlanListItemDTO** - rozszerzany przez PlanDTO:
```typescript
export interface PlanListItemDTO {
  id: string;
  note_id: string;
  content: string;
  prompt_version: string;
  feedback: number | null;
  created_at: string;
}
```

**ErrorResponseDTO** - zwracany przy błędach:
```typescript
export interface ErrorResponseDTO {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}
```

### Typy bazy danych

Wykorzystywane tabele:
- **`plans`** - główna tabela z danymi planu
- **`notes`** - tabela notatek (JOIN dla destination, dates, user_id)

---

## 4. Szczegóły odpowiedzi

### Sukces - 200 OK

**Content-Type:** `application/json`

**Body:**
```json
{
  "id": "uuid",
  "note_id": "uuid",
  "content": "# Barcelona 7-Day Itinerary\n\n## Day 1: Arrival and Gothic Quarter...",
  "prompt_version": "v1",
  "feedback": 1,
  "created_at": "2025-10-11T11:00:00Z",
  "note": {
    "destination": "Barcelona, Spain",
    "start_date": "2025-12-01",
    "end_date": "2025-12-07"
  }
}
```

**Struktura:**
- `id` - UUID planu
- `note_id` - UUID powiązanej notatki
- `content` - treść planu w formacie Markdown
- `prompt_version` - wersja promptu użyta do wygenerowania (np. "v1")
- `feedback` - ocena użytkownika: 1 (👍), -1 (👎), lub null (brak oceny)
- `created_at` - timestamp utworzenia w formacie ISO 8601
- `note` - zagnieżdżony obiekt z informacjami o notatce:
  - `destination` - cel podróży
  - `start_date` - data rozpoczęcia (format ISO 8601 date)
  - `end_date` - data zakończenia (format ISO 8601 date)

---

### Błąd - 401 Unauthorized

Użytkownik nie jest zalogowany lub token sesji jest nieprawidłowy/wygasły.

**Content-Type:** `application/json`

**Body:**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**Kiedy występuje:**
- Brak cookie `sb-access-token`
- Token wygasł
- Token jest nieprawidłowy
- Middleware Supabase nie zweryfikował sesji

---

### Błąd - 403 Forbidden

Użytkownik jest zalogowany, ale próbuje uzyskać dostęp do planu, którego nie jest właścicielem.

**Content-Type:** `application/json`

**Body:**
```json
{
  "error": "You don't have permission to access this plan",
  "code": "FORBIDDEN"
}
```

**Kiedy występuje:**
- Plan istnieje, ale należy do innego użytkownika
- `notes.user_id` ≠ `authenticated_user_id`

---

### Błąd - 404 Not Found

Plan o podanym ID nie istnieje w bazie danych.

**Content-Type:** `application/json`

**Body:**
```json
{
  "error": "Plan not found",
  "code": "PLAN_NOT_FOUND"
}
```

**Kiedy występuje:**
- Plan o podanym UUID nie istnieje
- Plan został usunięty
- UUID ma prawidłowy format, ale nie ma takiego rekordu

**Uwaga:** Nie ujawniamy, czy plan istnieje, ale należy do innego użytkownika (security by obscurity).

---

### Błąd - 400 Bad Request

Nieprawidłowy format parametru `id`.

**Content-Type:** `application/json`

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

**Kiedy występuje:**
- Parametr `id` nie jest prawidłowym UUID
- Przykłady nieprawidłowych: `"abc"`, `"123"`, `"not-a-uuid"`

---

### Błąd - 500 Internal Server Error

Nieoczekiwany błąd serwera (błąd bazy danych, błąd aplikacji).

**Content-Type:** `application/json`

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

**Kiedy występuje:**
- Błąd połączenia z bazą danych
- Nieoczekiwany wyjątek w kodzie aplikacji
- Timeout bazy danych

---

## 5. Przepływ danych

### Diagram przepływu

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ GET /api/plans/:id
       │ Cookie: sb-access-token
       ▼
┌─────────────────────────────┐
│   Astro Middleware          │
│   (Session Validation)      │
└──────┬──────────────────────┘
       │ context.locals.supabase
       │ context.locals.user
       ▼
┌─────────────────────────────┐
│   GET Handler               │
│   /api/plans/[id].ts        │
└──────┬──────────────────────┘
       │ 1. Check authentication
       │ 2. Extract & validate id param
       │ 3. Call PlansService
       ▼
┌─────────────────────────────┐
│   PlansService              │
│   .getPlanById(id, userId)  │
└──────┬──────────────────────┘
       │ 4. Query database with JOIN
       ▼
┌─────────────────────────────┐
│   Supabase Client           │
│   SELECT plans JOIN notes   │
└──────┬──────────────────────┘
       │ 5. Return plan + note data
       ▼
┌─────────────────────────────┐
│   PlansService              │
│   - Verify plan exists      │
│   - Verify user ownership   │
│   - Transform to PlanDTO    │
└──────┬──────────────────────┘
       │ 6. Return PlanDTO
       ▼
┌─────────────────────────────┐
│   GET Handler               │
│   - Create JSON response    │
└──────┬──────────────────────┘
       │ 7. Response 200 + PlanDTO
       ▼
┌─────────────┐
│   Client    │
└─────────────┘
```

### Szczegółowy opis kroków

**Krok 1: Middleware - Weryfikacja sesji**
- Astro middleware weryfikuje token sesji Supabase
- Jeśli token jest nieprawidłowy → 401 Unauthorized
- Dodaje `supabase` i `user` do `context.locals`

**Krok 2: Endpoint Handler - Walidacja parametrów**
- Wyciągnięcie `id` z `context.params.id`
- Walidacja formatu UUID (regex lub biblioteka)
- Jeśli nieprawidłowy format → 400 Bad Request

**Krok 3: Wywołanie Service**
- Utworzenie instancji `PlansService(context.locals.supabase)`
- Wywołanie `getPlanById(id, context.locals.user.id)`

**Krok 4: Query do bazy danych**
- Supabase query z JOINem:
  ```typescript
  await supabase
    .from('plans')
    .select(`
      id,
      note_id,
      content,
      prompt_version,
      feedback,
      created_at,
      notes!inner(
        destination,
        start_date,
        end_date,
        user_id
      )
    `)
    .eq('id', planId)
    .single();
  ```

**Krok 5: Weryfikacja i autoryzacja w Service**
- Sprawdzenie, czy plan istnieje (error.code === 'PGRST116' → NotFoundError)
- Sprawdzenie, czy `notes.user_id === userId` (jeśli nie → ForbiddenError)
- Transformacja danych do `PlanDTO`

**Krok 6: Zwrócenie wyniku**
- Service zwraca `PlanDTO` z zagnieżdżonym obiektem `note`
- Handler opakowuje w JSON response

**Krok 7: Obsługa błędów**
- Wszystkie błędy są przechwytywane przez try-catch
- Error mapper (`createErrorResponse`) przekształca błędy na standardowe odpowiedzi
- Nieoczekiwane błędy → 500 Internal Server Error

---

## 6. Względy bezpieczeństwa

### Uwierzytelnianie (Authentication)

**Mechanizm:**
- Sesja Supabase oparta na JWT
- Token przechowywany w cookie `sb-access-token`
- Automatyczna weryfikacja w middleware Astro

**Implementacja:**
```typescript
// Middleware automatycznie weryfikuje sesję
if (!context.locals.user) {
  return new Response(JSON.stringify({
    error: "Authentication required",
    code: "UNAUTHORIZED"
  }), {
    status: 401,
    headers: { "Content-Type": "application/json" }
  });
}
```

**Zagrożenia:**
- Token hijacking → Używamy httpOnly cookies
- Token expiration → Supabase automatycznie odświeża tokeny
- CSRF → Supabase SDK obsługuje CSRF protection

---

### Autoryzacja (Authorization)

**Zasada:**
- Użytkownik może pobrać tylko plany powiązane z jego notatkami
- Weryfikacja poprzez `notes.user_id === authenticated_user_id`

**Implementacja:**
```typescript
// W PlansService.getPlanById()
if (data.notes.user_id !== userId) {
  throw new ForbiddenError("You don't have permission to access this plan");
}
```

**Ważne decyzje bezpieczeństwa:**
1. **Not Found vs Forbidden:** Zwracamy 404 zamiast 403 dla planów innych użytkowników, aby nie ujawniać informacji o istnieniu zasobu
2. **Early returns:** Sprawdzamy autoryzację przed jakąkolwiek operacją odczytu dodatkowych danych

---

### Walidacja danych wejściowych

**Walidacja UUID:**
```typescript
// Regex dla UUID v4
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!UUID_REGEX.test(id)) {
  return createErrorResponse({
    error: "Invalid UUID format",
    code: "VALIDATION_ERROR",
    details: { id: "Must be a valid UUID" }
  });
}
```

**Dlaczego walidacja UUID jest ważna:**
- Zapobiega nieoczekiwanym błędom bazy danych
- Chroni przed injection attacks (choć Supabase SDK jest bezpieczny)
- Zapewnia lepszą obsługę błędów (400 zamiast 500)

---

### Ochrona przed SQL Injection

**Mechanizm:**
- Używamy Supabase SDK, który automatycznie parametryzuje zapytania
- Nie konstruujemy surowych zapytań SQL

**Bezpieczne:**
```typescript
await supabase.from('plans').select('*').eq('id', planId)
```

**NIE UŻYWAMY:**
```typescript
// ❌ NIGDY nie rób tego:
await supabase.raw(`SELECT * FROM plans WHERE id = '${planId}'`)
```

---

### Rate Limiting

**Uwagi:**
- Ten endpoint NIE wymaga rate limiting na poziomie aplikacji
- Jest to operacja read-only bez kosztów AI
- Rate limiting można dodać na poziomie infrastructure (nginx, cloudflare)

**Opcjonalnie:**
- Limit 100 requestów/minutę per użytkownika
- Implementacja przez middleware lub zewnętrzny serwis

---

### Logging i Auditing

**Co logować:**
- Nieoczekiwane błędy bazy danych (console.error)
- Próby dostępu do planów innych użytkowników (opcjonalnie)
- Internal server errors (500)

**Co NIE logować:**
- Treść planów (prywatność użytkownika)
- Tokeny sesji
- Szczegółowe błędy (w response do klienta)

**Implementacja:**
```typescript
console.error('[PlansService.getPlanById] Database error:', {
  planId,
  userId,
  error: error.message
});
```

---

## 7. Obsługa błędów

### Macierz błędów

| Kod HTTP | Error Code | Scenariusz | Komunikat użytkownika | Akcja developera |
|----------|------------|------------|----------------------|------------------|
| 401 | UNAUTHORIZED | Brak/nieprawidłowy token | "Authentication required" | Redirect do logowania |
| 403 | FORBIDDEN | Plan należy do innego użytkownika | "You don't have permission to access this plan" | Wyświetl komunikat błędu |
| 404 | PLAN_NOT_FOUND | Plan nie istnieje | "Plan not found" | Wyświetl 404 page |
| 400 | VALIDATION_ERROR | Nieprawidłowy UUID | "Invalid UUID format" | Walidacja po stronie klienta |
| 500 | INTERNAL_ERROR | Błąd bazy/aplikacji | "An unexpected error occurred. Please try again later." | Alert do monitoringu |

---

### Strategia obsługi błędów w Service

**Rzucane błędy:**

1. **NotFoundError** - gdy plan nie istnieje
```typescript
if (error?.code === 'PGRST116') {
  throw new NotFoundError('plan', planId);
}
```

2. **ForbiddenError** - gdy użytkownik nie jest właścicielem
```typescript
if (data.notes.user_id !== userId) {
  throw new ForbiddenError("You don't have permission to access this plan");
}
```

3. **Generic Error** - błędy bazy danych
```typescript
console.error('[PlansService.getPlanById] Database error:', error);
throw new Error(`Failed to fetch plan: ${error.message}`);
```

---

### Obsługa błędów w Endpoint Handler

**Struktura try-catch:**

```typescript
export async function GET(context: APIContext): Promise<Response> {
  try {
    // 1. Authentication check
    if (!context.locals.user) {
      return new Response(JSON.stringify({
        error: "Authentication required",
        code: "UNAUTHORIZED"
      }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    // 2. Extract and validate id
    const id = context.params.id;
    if (!isValidUUID(id)) {
      return new Response(JSON.stringify({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details: { id: "Invalid UUID format" }
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // 3. Call service
    const service = new PlansService(context.locals.supabase);
    const plan = await service.getPlanById(id, context.locals.user.id);

    // 4. Return success response
    return new Response(JSON.stringify(plan), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    // 5. Map errors to responses
    return createErrorResponse(error);
  }
}
```

---

### Error Mapper

Wykorzystujemy istniejący `error-mapper.ts`:

```typescript
import { createErrorResponse } from '@/lib/utils/error-mapper';

// W catch block:
return createErrorResponse(error);
```

**Funkcja `createErrorResponse`:**
- Automatycznie rozpoznaje typ błędu
- Mapuje na odpowiedni kod HTTP
- Generuje strukturę ErrorResponseDTO
- Loguje nieoczekiwane błędy

**Obsługiwane typy błędów:**
- `NotFoundError` → 404
- `ForbiddenError` → 403
- `ValidationError` → 400
- `Error` (generic) → 500

---

### Debugging i monitoring

**Logi dla developerów:**

```typescript
// W PlansService:
console.error('[PlansService.getPlanById] Database error:', {
  planId,
  userId,
  error: error.message,
  timestamp: new Date().toISOString()
});
```

**Metryki do monitorowania:**
- Liczba requestów 404 (może wskazywać na złe linki)
- Liczba requestów 403 (próby nieautoryzowanego dostępu)
- Liczba requestów 500 (błędy aplikacji wymagające natychmiastowej uwagi)
- Średni czas odpowiedzi (performance monitoring)

---

## 8. Rozważania dotyczące wydajności

### Optymalizacje query

**JOIN vs Multiple Queries:**
- ✅ **Używamy:** Single query z JOIN
- ❌ **Unikamy:** Osobne query dla planu i notatki

**Query optymalizacja:**
```typescript
// Optymalne - jedna query z JOINem
await supabase
  .from('plans')
  .select(`
    id, note_id, content, prompt_version, feedback, created_at,
    notes!inner(destination, start_date, end_date, user_id)
  `)
  .eq('id', planId)
  .single();

// ❌ Nieoptymalne - dwie query
const plan = await supabase.from('plans').select('*').eq('id', planId).single();
const note = await supabase.from('notes').select('*').eq('id', plan.note_id).single();
```

**Korzyści single query:**
- Mniejsza latencja (1 roundtrip zamiast 2)
- Lepsza atomowość (plan i note w jednej transakcji)
- Mniejsze obciążenie bazy danych

---

### Indeksy bazy danych

**Wymagane indeksy:**

1. **Primary Key Index** (domyślnie istnieje):
   ```sql
   CREATE INDEX plans_pkey ON plans(id);
   ```

2. **Foreign Key Index** (zalecany):
   ```sql
   CREATE INDEX plans_note_id_idx ON plans(note_id);
   ```

**Dlaczego:**
- `plans.id` - używany w WHERE clause (primary lookup)
- `plans.note_id` - używany w JOIN condition

**Weryfikacja:**
```sql
EXPLAIN ANALYZE 
SELECT plans.*, notes.destination, notes.start_date, notes.end_date, notes.user_id
FROM plans
INNER JOIN notes ON plans.note_id = notes.id
WHERE plans.id = 'some-uuid';
```

Oczekiwany wynik: `Index Scan using plans_pkey`

---

### Caching

**Możliwości cachingu:**

1. **HTTP Cache Headers** (zalecane):
   ```typescript
   return new Response(JSON.stringify(plan), {
     status: 200,
     headers: {
       "Content-Type": "application/json",
       "Cache-Control": "private, max-age=300" // 5 minutes
     }
   });
   ```

2. **Edge Caching** (opcjonalnie):
   - Cloudflare Workers cache
   - CDN cache (jeśli używamy CDN)

3. **Application-level cache** (nie zalecane):
   - Redis/Memcached zbyt skomplikowany dla MVP
   - Dane planów rzadko się zmieniają, ale użytkownicy mogą dodawać feedback

**Decyzja:** Używamy HTTP Cache-Control z krótkim TTL (5 minut)

---

### Potencjalne wąskie gardła

**1. Duża treść planu (content field):**
- Plan może mieć ~10,000 znaków (markdown)
- **Rozwiązanie:** Używamy gzip compression w middleware

**2. Wolne query bazy danych:**
- **Rozwiązanie:** Odpowiednie indeksy (patrz wyżej)
- **Monitoring:** Query execution time < 50ms

**3. Timeout przy wolnym połączeniu:**
- **Rozwiązanie:** Supabase ma built-in timeout (10s)
- **Fallback:** 500 error z odpowiednim komunikatem

---

### Benchmarki wydajności

**Oczekiwane czasy odpowiedzi:**
- P50 (median): < 100ms
- P95: < 200ms
- P99: < 500ms

**Cel:**
- Obsługa 100 requestów/sekundę na plan
- < 1% error rate

**Narzędzia do testowania:**
- `k6` lub `artillery` dla load testing
- `autocannon` dla quick benchmarks

**Przykładowy test:**
```bash
k6 run --vus 10 --duration 30s load-test.js
```

---

## 9. Etapy wdrożenia

### Krok 1: Rozszerzenie PlansService

**Plik:** `src/lib/services/plans.service.ts`

**Zadanie:** Dodać metodę `getPlanById()`

**Implementacja:**

```typescript
/**
 * Retrieves a specific plan by ID with authorization check
 * 
 * @param planId - UUID of the plan to fetch
 * @param userId - UUID of the authenticated user
 * @returns Promise resolving to PlanDTO with nested note information
 * @throws NotFoundError if plan doesn't exist
 * @throws ForbiddenError if user doesn't own the plan's note
 * @throws Error for database errors
 */
async getPlanById(planId: string, userId: string): Promise<PlanDTO> {
  // Step 1: Query plan with note JOIN
  const { data, error } = await this.supabase
    .from('plans')
    .select(`
      id,
      note_id,
      content,
      prompt_version,
      feedback,
      created_at,
      notes!inner(
        destination,
        start_date,
        end_date,
        user_id
      )
    `)
    .eq('id', planId)
    .single();

  // Step 2: Handle plan not found
  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError('plan', planId);
    }
    console.error('[PlansService.getPlanById] Database error:', error);
    throw new Error(`Failed to fetch plan: ${error.message}`);
  }

  if (!data) {
    throw new NotFoundError('plan', planId);
  }

  // Step 3: Authorization check
  if (data.notes.user_id !== userId) {
    throw new ForbiddenError("You don't have permission to access this plan");
  }

  // Step 4: Transform to PlanDTO
  const planDTO: PlanDTO = {
    id: data.id,
    note_id: data.note_id,
    content: data.content,
    prompt_version: data.prompt_version,
    feedback: data.feedback,
    created_at: data.created_at,
    note: {
      destination: data.notes.destination,
      start_date: data.notes.start_date,
      end_date: data.notes.end_date,
    },
  };

  return planDTO;
}
```

**Testy jednostkowe (opcjonalnie):**
- Test: Plan istnieje i użytkownik jest właścicielem → zwraca PlanDTO
- Test: Plan nie istnieje → rzuca NotFoundError
- Test: Plan istnieje, ale należy do innego użytkownika → rzuca ForbiddenError
- Test: Błąd bazy danych → rzuca Error

---

### Krok 2: Utworzenie endpointu API

**Plik:** `src/pages/api/plans/[id].ts`

**Zadanie:** Utworzyć handler GET dla `/api/plans/:id`

**Implementacja:**

```typescript
import type { APIContext } from "astro";
import { PlansService } from "@/lib/services/plans.service";
import { createErrorResponse } from "@/lib/utils/error-mapper";

export const prerender = false;

/**
 * UUID validation regex (v4)
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates if string is a valid UUID
 */
function isValidUUID(value: string | undefined): boolean {
  if (!value) return false;
  return UUID_REGEX.test(value);
}

/**
 * GET /api/plans/:id
 * 
 * Retrieves a specific plan by ID with nested note information
 * 
 * @param context - Astro API context
 * @returns Response with PlanDTO (200) or error (400, 401, 403, 404, 500)
 */
export async function GET(context: APIContext): Promise<Response> {
  try {
    // Step 1: Authentication check
    if (!context.locals.user) {
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

    // Step 2: Extract and validate id parameter
    const id = context.params.id;

    if (!isValidUUID(id)) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: {
            id: "Invalid UUID format",
          },
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Fetch plan from service
    const plansService = new PlansService(context.locals.supabase);
    const plan = await plansService.getPlanById(id, context.locals.user.id);

    // Step 4: Return success response
    return new Response(JSON.stringify(plan), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=300", // Cache for 5 minutes
      },
    });
  } catch (error) {
    // Step 5: Handle errors with error mapper
    return createErrorResponse(error);
  }
}
```

**Struktura pliku:**
```
src/pages/api/
  └── plans/
      └── [id].ts  (nowy plik)
```

---

### Krok 3: Aktualizacja error-mapper (jeśli potrzebne)

**Plik:** `src/lib/utils/error-mapper.ts`

**Zadanie:** Upewnić się, że obsługuje wszystkie błędy z PlansService

**Sprawdzić:**
- ✅ NotFoundError → 404 z kodem "PLAN_NOT_FOUND" lub "NOT_FOUND"
- ✅ ForbiddenError → 403 z kodem "FORBIDDEN"
- ✅ Generic Error → 500 z kodem "INTERNAL_ERROR"

**Możliwa modyfikacja:** Rozróżnić "PLAN_NOT_FOUND" vs "NOTE_NOT_FOUND"

```typescript
// W mapErrorToResponse():
if (error instanceof NotFoundError) {
  const errorCode = error.resourceType === 'plan' 
    ? 'PLAN_NOT_FOUND' 
    : error.resourceType === 'note'
    ? 'NOTE_NOT_FOUND'
    : 'NOT_FOUND';

  return {
    status: 404,
    body: {
      error: error.message,
      code: errorCode,
      details: {
        resourceType: error.resourceType,
        resourceId: error.resourceId,
      },
    },
  };
}
```

---

### Krok 4: Testy manualne

**Narzędzia:** Postman, curl, lub przeglądarka z dev tools

**Scenariusze testowe:**

1. **Test 1: Sukces - pobranie istniejącego planu**
   ```bash
   curl -X GET 'http://localhost:4321/api/plans/{valid-plan-id}' \
     -H 'Cookie: sb-access-token={valid-token}'
   ```
   **Oczekiwany wynik:** 200 + PlanDTO z nested note

2. **Test 2: Błąd - brak autentykacji**
   ```bash
   curl -X GET 'http://localhost:4321/api/plans/{valid-plan-id}'
   ```
   **Oczekiwany wynik:** 401 + UNAUTHORIZED

3. **Test 3: Błąd - nieprawidłowy UUID**
   ```bash
   curl -X GET 'http://localhost:4321/api/plans/invalid-uuid' \
     -H 'Cookie: sb-access-token={valid-token}'
   ```
   **Oczekiwany wynik:** 400 + VALIDATION_ERROR

4. **Test 4: Błąd - plan nie istnieje**
   ```bash
   curl -X GET 'http://localhost:4321/api/plans/550e8400-e29b-41d4-a716-446655440000' \
     -H 'Cookie: sb-access-token={valid-token}'
   ```
   **Oczekiwany wynik:** 404 + PLAN_NOT_FOUND

5. **Test 5: Błąd - plan należy do innego użytkownika**
   ```bash
   # Użyć planu innego użytkownika
   curl -X GET 'http://localhost:4321/api/plans/{other-user-plan-id}' \
     -H 'Cookie: sb-access-token={user1-token}'
   ```
   **Oczekiwany wynik:** 403 + FORBIDDEN (lub 404 jeśli chcemy ukryć istnienie)

---

### Krok 5: Dokumentacja API

**Plik:** `.ai/api-plan.md`

**Zadanie:** Dodać dokumentację endpointu do istniejącego pliku API documentation

**Sekcja do dodania:**

```markdown
#### Get Specific Plan

- **Method:** `GET`
- **Path:** `/api/plans/:id`
- **Description:** Retrieve a specific plan by ID
- **Authentication:** Required (Supabase session)

**Path Parameters:**
- `id` (UUID, required) - Plan ID

**Response (200 OK):**
```json
{
  "id": "uuid",
  "note_id": "uuid",
  "content": "# Barcelona 7-Day Itinerary\n\n## Day 1: Arrival and Gothic Quarter...",
  "prompt_version": "v1",
  "feedback": 1,
  "created_at": "2025-10-11T11:00:00Z",
  "note": {
    "destination": "Barcelona, Spain",
    "start_date": "2025-12-01",
    "end_date": "2025-12-07"
  }
}
```

**Error Responses:**
- 401 Unauthorized - Authentication required
- 403 Forbidden - User doesn't own this plan
- 404 Not Found - Plan doesn't exist
- 400 Bad Request - Invalid UUID format
- 500 Internal Server Error - Server error
```

---

### Krok 6: Integracja z frontendem (opcjonalnie)

**Komponenty do utworzenia/zaktualizowania:**

1. **`src/pages/plans/[id].astro`** - Strona szczegółów planu
   - Pobiera plan przez fetch do `/api/plans/:id`
   - Wyświetla treść planu (markdown rendering)
   - Pokazuje informacje o notatce (destination, dates)
   - Przycisk "Back to note" z linkiem do `/notes/:noteId`

2. **`src/components/plans/PlanDetailView.tsx`** (React)
   - Komponent do wyświetlania planu
   - Markdown rendering (np. przez `react-markdown`)
   - Obsługa stanów loading/error

**Przykład użycia:**
```typescript
// W pages/plans/[id].astro
const planId = Astro.params.id;

// Fetch plan server-side
const response = await fetch(`${Astro.url.origin}/api/plans/${planId}`, {
  headers: {
    Cookie: Astro.request.headers.get('Cookie') || ''
  }
});

if (!response.ok) {
  return Astro.redirect('/404');
}

const plan = await response.json();
```

---

### Krok 7: Linting i code review

**Sprawdzić:**
- ✅ Brak linter errors (`npm run lint`)
- ✅ TypeScript compiles bez błędów (`npm run build`)
- ✅ Wszystkie importy są poprawne
- ✅ Nazwy zmiennych są zgodne z konwencją projektu
- ✅ Komentarze JSDoc są kompletne
- ✅ Error handling jest kompletny

**Komendy:**
```bash
npm run lint
npm run build
```

---

### Krok 8: Deployment i monitoring

**Pre-deployment checklist:**
- [ ] Wszystkie testy manualne przeszły pomyślnie
- [ ] Dokumentacja API jest zaktualizowana
- [ ] Middleware Supabase działa poprawnie
- [ ] Environment variables są ustawione (Supabase URL, Keys)

**Post-deployment monitoring:**
- Monitor error rate dla 404/403/500
- Monitor response time (cel: < 200ms P95)
- Monitor database query performance
- Sprawdzić logi dla nieoczekiwanych błędów

**Rollback plan:**
- Jeśli > 5% error rate → rollback deployment
- Jeśli response time > 1s → sprawdzić indeksy bazy danych

---

## 10. Podsumowanie i checklist

### Pliki do utworzenia/zmodyfikowania

- [x] `src/lib/services/plans.service.ts` - Dodać metodę `getPlanById()`
- [x] `src/pages/api/plans/[id].ts` - Utworzyć nowy endpoint
- [x] `src/lib/utils/error-mapper.ts` - Opcjonalne rozróżnienie PLAN_NOT_FOUND
- [x] `.ai/api-plan.md` - Dodać dokumentację endpointu

### Checklist implementacji

**Service Layer:**
- [ ] Dodano metodę `getPlanById()` w PlansService
- [ ] Query używa JOIN do pobrania danych notes
- [ ] Weryfikacja istnienia planu (NotFoundError)
- [ ] Weryfikacja autoryzacji przez notes.user_id (ForbiddenError)
- [ ] Transformacja do PlanDTO z nested note object
- [ ] Error logging z context (planId, userId)

**API Endpoint:**
- [ ] Utworzono plik `/api/plans/[id].ts`
- [ ] Dodano `export const prerender = false`
- [ ] Authentication check na początku
- [ ] Walidacja UUID parametru id
- [ ] Wywołanie PlansService.getPlanById()
- [ ] Obsługa błędów przez createErrorResponse()
- [ ] Cache-Control header (5 minutes)

**Error Handling:**
- [ ] Obsługa 401 Unauthorized
- [ ] Obsługa 400 Bad Request (invalid UUID)
- [ ] Obsługa 403 Forbidden (wrong user)
- [ ] Obsługa 404 Not Found (plan doesn't exist)
- [ ] Obsługa 500 Internal Error
- [ ] Logging nieoczekiwanych błędów

**Security:**
- [ ] Session verification przez middleware
- [ ] Authorization check (user owns note)
- [ ] UUID validation (prevent injection)
- [ ] No sensitive data in error responses

**Performance:**
- [ ] Single query z JOIN (nie multiple queries)
- [ ] Odpowiednie indeksy w bazie danych
- [ ] Cache-Control header
- [ ] Czas odpowiedzi < 200ms (P95)

**Testing:**
- [ ] Test: Sukces - plan istnieje i należy do użytkownika
- [ ] Test: 401 - brak autentykacji
- [ ] Test: 400 - nieprawidłowy UUID
- [ ] Test: 404 - plan nie istnieje
- [ ] Test: 403 - plan należy do innego użytkownika

**Documentation:**
- [ ] Zaktualizowano `.ai/api-plan.md`
- [ ] JSDoc comments dla wszystkich funkcji
- [ ] README (jeśli dotyczy)

---

## Appendix: Dodatkowe zasoby

### Przykładowe odpowiedzi API

**Sukces (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "note_id": "660e8400-e29b-41d4-a716-446655440000",
  "content": "# Barcelona 7-Day Itinerary\n\n## Day 1: Arrival and Gothic Quarter\n\n### Morning\n- Arrive at Barcelona-El Prat Airport\n- Take the Aerobus to Plaça Catalunya (€5.90)\n- Check into your hotel in the Gothic Quarter\n\n### Afternoon\n...",
  "prompt_version": "v1",
  "feedback": null,
  "created_at": "2025-10-15T14:30:00Z",
  "note": {
    "destination": "Barcelona, Spain",
    "start_date": "2025-12-01",
    "end_date": "2025-12-07"
  }
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**403 Forbidden:**
```json
{
  "error": "You don't have permission to access this plan",
  "code": "FORBIDDEN"
}
```

**404 Not Found:**
```json
{
  "error": "Plan with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "code": "PLAN_NOT_FOUND",
  "details": {
    "resourceType": "plan",
    "resourceId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "id": "Invalid UUID format"
  }
}
```

---

### Supabase Query Examples

**Podstawowy query:**
```typescript
const { data, error } = await supabase
  .from('plans')
  .select('*')
  .eq('id', planId)
  .single();
```

**Query z JOINem (zalecane):**
```typescript
const { data, error } = await supabase
  .from('plans')
  .select(`
    id,
    note_id,
    content,
    prompt_version,
    feedback,
    created_at,
    notes!inner(
      destination,
      start_date,
      end_date,
      user_id
    )
  `)
  .eq('id', planId)
  .single();
```

**Struktura wyniku z JOINem:**
```typescript
{
  id: 'uuid',
  note_id: 'uuid',
  content: 'markdown content...',
  prompt_version: 'v1',
  feedback: null,
  created_at: '2025-10-15T14:30:00Z',
  notes: {
    destination: 'Barcelona, Spain',
    start_date: '2025-12-01',
    end_date: '2025-12-07',
    user_id: 'user-uuid'
  }
}
```

---

### TypeScript Type Definitions

**PlanDTO z zagnieżdżonym note:**
```typescript
export interface PlanDTO {
  id: string;
  note_id: string;
  content: string;
  prompt_version: string;
  feedback: number | null; // 1, -1, or null
  created_at: string; // ISO 8601
  note: {
    destination: string;
    start_date: string; // ISO 8601 date
    end_date: string; // ISO 8601 date
  };
}
```

**Supabase query result type:**
```typescript
type PlanWithNote = {
  id: string;
  note_id: string;
  content: string;
  prompt_version: string;
  feedback: number | null;
  created_at: string;
  notes: {
    destination: string;
    start_date: string;
    end_date: string;
    user_id: string;
  };
};
```

---

### SQL dla weryfikacji indeksów

```sql
-- Sprawdź istniejące indeksy
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'plans';

-- Sprawdź query plan
EXPLAIN ANALYZE 
SELECT 
  plans.id,
  plans.note_id,
  plans.content,
  plans.prompt_version,
  plans.feedback,
  plans.created_at,
  notes.destination,
  notes.start_date,
  notes.end_date,
  notes.user_id
FROM plans
INNER JOIN notes ON plans.note_id = notes.id
WHERE plans.id = '550e8400-e29b-41d4-a716-446655440000';
```

**Oczekiwany output:**
```
Index Scan using plans_pkey on plans  (cost=0.15..8.17 rows=1 width=...)
  Index Cond: (id = '550e8400-e29b-41d4-a716-446655440000'::uuid)
  ->  Index Scan using notes_pkey on notes  (cost=0.15..8.17 rows=1 width=...)
        Index Cond: (id = plans.note_id)
```

---

### Postman Collection

**Collection setup:**

1. **Environment variables:**
   - `base_url` = `http://localhost:4321`
   - `access_token` = `{supabase-access-token}`

2. **Request: Get Plan by ID**
   - Method: GET
   - URL: `{{base_url}}/api/plans/:id`
   - Headers:
     - `Cookie: sb-access-token={{access_token}}`
   - Params:
     - `id` = `{valid-plan-uuid}`

3. **Tests (JavaScript):**
   ```javascript
   pm.test("Status code is 200", function () {
     pm.response.to.have.status(200);
   });

   pm.test("Response has plan structure", function () {
     const json = pm.response.json();
     pm.expect(json).to.have.property('id');
     pm.expect(json).to.have.property('note_id');
     pm.expect(json).to.have.property('content');
     pm.expect(json).to.have.property('note');
     pm.expect(json.note).to.have.property('destination');
   });
   ```

---

**Koniec planu implementacji.**


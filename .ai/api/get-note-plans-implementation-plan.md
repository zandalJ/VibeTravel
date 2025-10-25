# API Endpoint Implementation Plan: Get Plan History for Note

## 1. Przegląd punktu końcowego

**Cel:** Pobranie wszystkich planów podróży wygenerowanych dla konkretnej notatki użytkownika, posortowanych według daty utworzenia (od najnowszego).

**Funkcjonalność:**
- Pobiera historię wszystkich planów związanych z daną notatką
- Weryfikuje własność notatki przed zwróceniem planów
- Zwraca puste wyniki jeśli notatka nie ma żadnych planów
- Sortuje plany według daty utworzenia (najnowsze pierwsze)

**Przypadki użycia:**
- Użytkownik chce zobaczyć historię wszystkich wersji planu dla danej podróży
- Użytkownik chce porównać różne wygenerowane plany
- Użytkownik chce wrócić do wcześniej wygenerowanego planu

## 2. Szczegóły żądania

**Metoda HTTP:** `GET`

**Struktura URL:** `/api/notes/:noteId/plans`

**Parametry:**

**Wymagane (URL):**
- `noteId` (string, UUID) - Unikalny identyfikator notatki, dla której pobieramy plany
  - Format: UUID v4 (np. "550e8400-e29b-41d4-a716-446655440000")
  - Walidacja: Musi być prawidłowym UUID

**Opcjonalne:**
- Brak (w obecnej specyfikacji; możliwe przyszłe rozszerzenie o paginację)

**Request Body:**
Brak - endpoint GET nie przyjmuje ciała żądania

**Nagłówki:**
- `Cookie` - Supabase session cookie (automatycznie zarządzane przez middleware)

## 3. Wykorzystywane typy

**Response DTOs:**
```typescript
// Główna odpowiedź endpointa
interface PlansListResponseDTO {
  plans: PlanListItemDTO[];  // Tablica planów
  total: number;              // Łączna liczba planów
}

// Pojedynczy element listy planów
interface PlanListItemDTO {
  id: string;              // UUID planu
  note_id: string;         // UUID notatki
  content: string;         // Treść planu w formacie Markdown
  prompt_version: string;  // Wersja promptu (np. "v1")
  feedback: number | null; // 1 (👍) lub -1 (👎) lub null
  created_at: string;      // ISO 8601 timestamp
}
```

**Error DTOs:**
```typescript
// Standardowa odpowiedź błędu
interface ErrorResponseDTO {
  error: string;   // Czytelny komunikat błędu
  code: string;    // Kod błędu (np. "NOT_FOUND", "FORBIDDEN")
  details?: Record<string, unknown>;  // Dodatkowe szczegóły
}
```

**Database Types:**
```typescript
// Typ z bazy danych (Tables<"plans">)
type Plan = {
  id: string;
  note_id: string;
  prompt_text: string;
  prompt_version: string;
  content: string;
  feedback: number | null;
  created_at: string;
}

// Typ z bazy danych (Tables<"notes">)
type Note = {
  id: string;
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  total_budget: number | null;
  additional_notes: string | null;
  created_at: string;
  updated_at: string;
}
```

**Command Models:**
Brak - endpoint tylko odczytuje dane

## 4. Szczegóły odpowiedzi

**Sukces (200 OK):**
```json
{
  "plans": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "note_id": "123e4567-e89b-12d3-a456-426614174000",
      "content": "# Barcelona 7-Day Itinerary\n\n## Day 1...",
      "prompt_version": "v1",
      "feedback": 1,
      "created_at": "2025-10-11T11:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "note_id": "123e4567-e89b-12d3-a456-426614174000",
      "content": "# Barcelona 7-Day Itinerary (v2)\n\n## Day 1...",
      "prompt_version": "v1",
      "feedback": null,
      "created_at": "2025-10-10T15:30:00Z"
    }
  ],
  "total": 2
}
```

**Przypadek: Notatka bez planów (200 OK):**
```json
{
  "plans": [],
  "total": 0
}
```

**Błędy:**

| Status | Kod | Opis | Przykład odpowiedzi |
|--------|-----|------|---------------------|
| 400 | VALIDATION_ERROR | Nieprawidłowy format UUID | `{"error": "Invalid UUID format", "code": "VALIDATION_ERROR", "details": {"noteId": "Must be a valid UUID"}}` |
| 401 | UNAUTHORIZED | Brak sesji autentykacji | `{"error": "Authentication required", "code": "UNAUTHORIZED"}` |
| 403 | FORBIDDEN | Użytkownik nie jest właścicielem notatki | `{"error": "You don't have permission to access plans for this note", "code": "FORBIDDEN"}` |
| 404 | NOTE_NOT_FOUND | Notatka nie istnieje | `{"error": "Note with ID {id} not found", "code": "NOT_FOUND", "details": {"resourceType": "note", "resourceId": "{id}"}}` |
| 500 | INTERNAL_ERROR | Błąd bazy danych lub nieoczekiwany błąd | `{"error": "Internal server error", "code": "INTERNAL_ERROR", "details": {"message": "An unexpected error occurred. Please try again later."}}` |

## 5. Przepływ danych

### Szczegółowy przepływ krok po kroku:

```
┌─────────────┐
│   Klient    │
└──────┬──────┘
       │ GET /api/notes/:noteId/plans
       ▼
┌─────────────────────────────────────────────────┐
│  API Route Handler                              │
│  (src/pages/api/notes/[noteId]/plans.ts)       │
└──────┬──────────────────────────────────────────┘
       │
       │ 1. Ekstrakcja noteId z params
       ▼
┌─────────────────────────────────────────────────┐
│  Validator                                      │
│  validateNoteId(noteId)                         │
└──────┬──────────────────────────────────────────┘
       │ noteId: string (UUID)
       │
       │ 2. Pobranie userId z sesji Supabase
       ▼
┌─────────────────────────────────────────────────┐
│  Supabase Auth                                  │
│  context.locals.supabase.auth.getUser()         │
└──────┬──────────────────────────────────────────┘
       │ userId: string
       │
       │ 3. Wywołanie serwisu
       ▼
┌─────────────────────────────────────────────────┐
│  PlansService                                   │
│  getPlansByNoteId(noteId, userId)               │
└──────┬──────────────────────────────────────────┘
       │
       │ 3a. Weryfikacja własności notatki
       ▼
┌─────────────────────────────────────────────────┐
│  NotesService (optional, for verification)      │
│  OR direct Supabase query                       │
└──────┬──────────────────────────────────────────┘
       │
       │ Jeśli note.user_id !== userId → throw ForbiddenError
       │ Jeśli note nie istnieje → throw NotFoundError
       │
       │ 3b. Pobranie planów z bazy danych
       ▼
┌─────────────────────────────────────────────────┐
│  Supabase Database                              │
│  SELECT * FROM plans                            │
│  WHERE note_id = :noteId                        │
│  ORDER BY created_at DESC                       │
└──────┬──────────────────────────────────────────┘
       │ Plan[] (raw database records)
       │
       │ 3c. Transformacja danych
       ▼
┌─────────────────────────────────────────────────┐
│  Data Transformation                            │
│  Map Plan → PlanListItemDTO                     │
│  (exclude prompt_text, keep other fields)       │
└──────┬──────────────────────────────────────────┘
       │ PlanListItemDTO[]
       │
       │ 3d. Utworzenie odpowiedzi
       ▼
┌─────────────────────────────────────────────────┐
│  Response Construction                          │
│  { plans: PlanListItemDTO[], total: number }    │
└──────┬──────────────────────────────────────────┘
       │ PlansListResponseDTO
       │
       │ 4. Zwrot odpowiedzi do klienta
       ▼
┌─────────────┐
│   Klient    │ (200 OK + JSON)
└─────────────┘
```

### Interakcje z zewnętrznymi serwisami:

**Supabase PostgreSQL:**
- **Query 1:** Weryfikacja własności notatki
  ```sql
  SELECT user_id FROM notes WHERE id = :noteId
  ```
- **Query 2:** Pobranie planów
  ```sql
  SELECT id, note_id, content, prompt_version, feedback, created_at
  FROM plans
  WHERE note_id = :noteId
  ORDER BY created_at DESC
  ```

**Supabase Auth:**
- Walidacja sesji i pobranie user ID przez Astro middleware
- Automatyczna weryfikacja JWT tokenu

**Brak komunikacji z AI Service** - endpoint tylko odczytuje dane

## 6. Względy bezpieczeństwa

### 6.1 Uwierzytelnianie (Authentication)

**Mechanizm:**
- Supabase Auth z session cookies zarządzanymi przez middleware
- Session token walidowany automatycznie przez `context.locals.supabase.auth.getUser()`

**Implementacja:**
```typescript
const { data: { user }, error: authError } =
  await context.locals.supabase.auth.getUser();

// Produkcja: Wymagaj sesji
if (!user) {
  return new Response(JSON.stringify({
    error: "Authentication required",
    code: "UNAUTHORIZED"
  }), { status: 401 });
}

// MVP: Fallback do DEFAULT_USER_ID dla testów
const userId = user?.id || DEFAULT_USER_ID;
```

**Kody błędów:**
- `401 UNAUTHORIZED` - Brak ważnej sesji (produkcja)

### 6.2 Autoryzacja (Authorization)

**Zasada:** Użytkownik może zobaczyć plany tylko dla notatek, które sam stworzył.

**Weryfikacja własności:**
1. **Dwuetapowa weryfikacja:**
   - Krok 1: Pobranie notatki i sprawdzenie `note.user_id === userId`
   - Krok 2: Jeśli własność potwierdzona, pobranie planów dla tej notatki

2. **Alternatywnie (bardziej wydajne):**
   - Pojedyncze zapytanie z JOIN:
   ```sql
   SELECT p.* FROM plans p
   INNER JOIN notes n ON p.note_id = n.id
   WHERE p.note_id = :noteId AND n.user_id = :userId
   ORDER BY p.created_at DESC
   ```
   - Jeśli wynik pusty, dodatkowo sprawdź czy notatka istnieje (dla właściwego kodu błędu)

**Kody błędów:**
- `403 FORBIDDEN` - Notatka istnieje, ale należy do innego użytkownika
- `404 NOT_FOUND` - Notatka nie istnieje

### 6.3 Walidacja danych wejściowych

**Walidacja UUID:**
```typescript
function validateNoteId(noteId: string | undefined): string {
  if (!noteId) {
    throw new ValidationError("noteId", "Note ID is required");
  }

  // UUID v4 regex pattern
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(noteId)) {
    throw new ValidationError("noteId", "Must be a valid UUID");
  }

  return noteId;
}
```

### 6.4 Ochrona przed atakami

**SQL Injection:**
- ✅ Chronione przez Supabase client (parametryzowane zapytania)
- ✅ Walidacja UUID przed przekazaniem do bazy danych

**XSS (Cross-Site Scripting):**
- ✅ Endpoint zwraca JSON (nie HTML)
- ⚠️ Frontend musi sanitize zawartość planów (Markdown) przed renderowaniem

**CSRF (Cross-Site Request Forgery):**
- ✅ GET request (read-only, idempotent)
- ✅ Supabase session cookies mają odpowiednie flagi (HttpOnly, Secure, SameSite)

**Rate Limiting:**
- ⚠️ Brak w MVP
- 📝 Zalecenie: 100 requestów/minutę/użytkownika (ogólne API rate limiting)

**Information Disclosure:**
- ✅ Nie ujawniaj szczegółów błędów bazy danych w odpowiedzi
- ✅ Użyj ogólnych komunikatów dla błędów 500
- ✅ Loguj szczegóły tylko po stronie serwera

### 6.5 Supabase Row Level Security (RLS)

**Opcjonalne dodatkowe zabezpieczenie:**

Można skonfigurować RLS policies w Supabase dla dodatkowej warstwy bezpieczeństwa:

```sql
-- Policy dla tabeli plans (tylko dla własnych planów poprzez notes)
CREATE POLICY "Users can view their own plans"
  ON plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes
      WHERE notes.id = plans.note_id
      AND notes.user_id = auth.uid()
    )
  );
```

**W MVP:** RLS może być opcjonalny, jeśli autoryzacja jest dobrze zaimplementowana w warstwie aplikacji.

## 7. Obsługa błędów

### 7.1 Hierarchia obsługi błędów

```typescript
try {
  // 1. Walidacja parametrów URL
  const noteId = validateNoteId(context.params.noteId);

  // 2. Autentykacja
  const userId = await authenticateUser(context);

  // 3. Biznesowa logika
  const result = await plansService.getPlansByNoteId(noteId, userId);

  // 4. Odpowiedź sukcesu
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

} catch (error) {
  // 5. Mapowanie błędów na odpowiedzi HTTP
  return createErrorResponse(error);
}
```

### 7.2 Szczegółowa tabela błędów

| Błąd | Typ Exception | HTTP Status | Error Code | Przykładowy komunikat | Logowanie |
|------|---------------|-------------|------------|----------------------|-----------|
| Brak noteId w URL | ValidationError | 400 | VALIDATION_ERROR | "Note ID is required" | console.warn |
| Nieprawidłowy format UUID | ValidationError | 400 | VALIDATION_ERROR | "Must be a valid UUID" | console.warn |
| Brak sesji autentykacji | N/A (handled inline) | 401 | UNAUTHORIZED | "Authentication required" | console.warn |
| Notatka nie istnieje | NotFoundError | 404 | NOT_FOUND | "Note with ID {id} not found" | console.info |
| Brak dostępu do notatki | ForbiddenError | 403 | FORBIDDEN | "You don't have permission to access plans for this note" | console.warn |
| Błąd bazy danych | Error | 500 | INTERNAL_ERROR | "Internal server error" | console.error + stack trace |
| Nieznany błąd | unknown | 500 | INTERNAL_ERROR | "An unexpected error occurred" | console.error |

### 7.3 Implementacja obsługi błędów

**Custom Error Classes (już istniejące):**
```typescript
// src/lib/errors/plan-generation.errors.ts
export class NotFoundError extends PlanGenerationError {
  readonly statusCode = 404;
  constructor(resourceType: "note" | "user" | "profile", resourceId: string) {
    super(`${resourceType} with ID ${resourceId} not found`);
  }
}

export class ForbiddenError extends PlanGenerationError {
  readonly statusCode = 403;
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends PlanGenerationError {
  readonly statusCode = 400;
  constructor(field: string, reason: string) {
    super(`Validation error for field '${field}': ${reason}`);
  }
}
```

**Error Mapper (już istniejący):**
```typescript
// src/lib/utils/error-mapper.ts
export function createErrorResponse(error: unknown): Response {
  const { status, body } = mapErrorToResponse(error);

  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
```

### 7.4 Logowanie błędów

**Poziomy logowania:**
- **INFO:** Notatka nie znaleziona (normalny przypadek)
- **WARN:** Walidacja nie powiodła się, nieautoryzowany dostęp
- **ERROR:** Błędy bazy danych, nieoczekiwane wyjątki

**Format logów:**
```typescript
console.log("[GET /api/notes/:noteId/plans] Fetching plans for note:", noteId);
console.warn("[GET /api/notes/:noteId/plans] Auth error:", authError.message);
console.error("[GET /api/notes/:noteId/plans] Database error:", error);
console.error("[GET /api/notes/:noteId/plans] Stack trace:", error.stack);
```

**Nie loguj:**
- Zawartości planów (może zawierać dane użytkownika)
- Pełnych szczegółów sesji użytkownika
- Wrażliwych danych konfiguracyjnych

### 7.5 User-Friendly Error Messages

Wszystkie komunikaty błędów zwracane do klienta powinny być:
- ✅ Zrozumiałe dla użytkownika końcowego
- ✅ Bez technicznych szczegółów implementacji
- ✅ Z sugestiami rozwiązania (jeśli możliwe)
- ✅ W języku angielskim (zgodnie z API spec)

**Przykłady:**
- ❌ Zły: "pg_query failed: relation 'plans' does not exist"
- ✅ Dobry: "Internal server error. Please try again later."

## 8. Wydajność

### 8.1 Potencjalne wąskie gardła

**1. Duża liczba planów dla jednej notatki:**
- **Problem:** Użytkownik wygenerował wiele planów (np. 50+), endpoint zwraca wszystkie
- **Wpływ:** Duży rozmiar odpowiedzi, wolny transfer, wysokie zużycie pamięci
- **Mitygacja (przyszłość):** Paginacja z parametrami `limit` i `offset`

**2. Duży rozmiar zawartości planu:**
- **Problem:** Plany zawierają szczegółowy Markdown (do ~10,000 znaków każdy)
- **Wpływ:** Transfer sieciowy może być wolny dla 20+ planów
- **Mitygacja (przyszłość):**
  - Opcja zwracania tylko metadanych (bez content)
  - Kompresja gzip na poziomie serwera

**3. Równoległe zapytania od wielu użytkowników:**
- **Problem:** Wzrost ruchu może obciążyć bazę danych
- **Wpływ:** Wolniejsze czasy odpowiedzi
- **Mitygacja:** Indeksowanie bazy danych (patrz sekcja 8.3)

**4. N+1 Query Problem:**
- **Problem:** Jeśli weryfikacja własności i pobranie planów to osobne zapytania
- **Wpływ:** Dwa round-tripy do bazy danych zamiast jednego
- **Mitygacja:** JOIN w jednym zapytaniu (preferowane rozwiązanie)

### 8.2 Strategie optymalizacji

**Optymalizacja #1: Zapytanie z JOIN (zalecane)**
```typescript
// Pojedyncze zapytanie weryfikujące własność i pobierające plany
const { data, error } = await this.supabase
  .from("plans")
  .select("id, note_id, content, prompt_version, feedback, created_at")
  .eq("note_id", noteId)
  .order("created_at", { ascending: false })
  .inner("notes!inner", { user_id: userId });  // Weryfikacja własności przez JOIN

// Następnie sprawdź czy wynik jest pusty:
// - Puste + note istnieje = 403 Forbidden
// - Puste + note nie istnieje = 404 Not Found
```

**Optymalizacja #2: Caching (przyszłość)**
```typescript
// Redis cache z TTL 60 sekund
const cacheKey = `plans:note:${noteId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const plans = await fetchPlansFromDB();
await redis.set(cacheKey, JSON.stringify(plans), "EX", 60);

return plans;
```

**Optymalizacja #3: Field Selection**
```typescript
// Nie pobieraj prompt_text (może być długi i nie jest potrzebny w liście)
.select("id, note_id, content, prompt_version, feedback, created_at")
// Zamiast:
.select("*")
```

**Optymalizacja #4: Lazy Loading (frontend)**
- Lista planów zwraca tylko podstawowe metadane
- Pełna zawartość (`content`) pobierana osobno przez `GET /api/plans/:id`
- **W MVP:** Zwracamy pełny content (zgodnie ze specyfikacją)

### 8.3 Indeksowanie bazy danych

**Wymagane indeksy:**

```sql
-- Index dla zapytania głównego
CREATE INDEX idx_plans_note_id_created_at
ON plans(note_id, created_at DESC);

-- Index dla weryfikacji własności (jeśli nie ma JOINa)
CREATE INDEX idx_notes_id_user_id
ON notes(id, user_id);
```

**Query plan analysis:**
```sql
EXPLAIN ANALYZE
SELECT id, note_id, content, prompt_version, feedback, created_at
FROM plans
WHERE note_id = '123e4567-e89b-12d3-a456-426614174000'
ORDER BY created_at DESC;
```

**Oczekiwania:**
- Index Scan (nie Sequential Scan)
- Czas wykonania < 10ms dla typowego użytkownika (5-10 planów)

### 8.4 Limity i thresholdy

**Aktualne limity (MVP):**
- Brak limitu liczby zwracanych planów
- Brak limitu rozmiaru odpowiedzi
- Brak timeout dla zapytania

**Zalecane limity (przyszłość):**
- Max 100 planów na zapytanie (z paginacją)
- Timeout 5 sekund dla zapytania do bazy
- Max rozmiar odpowiedzi: 5MB

**Monitoring:**
- Loguj czas wykonania zapytania (> 1s = warning)
- Loguj liczbę zwróconych planów (> 50 = info)
- Alert jeśli > 10% requestów przekracza 2s

### 8.5 Szacowana wydajność

**Założenia:**
- Średnio 3-5 planów na notatkę
- Każdy plan ~5,000 znaków (5KB)
- Połączenie z bazą: 10-20ms latency
- Processing time: 5-10ms

**Szacowany czas odpowiedzi:**
- Best case (0 planów): ~30ms
- Average case (3-5 planów): ~50ms
- Worst case (20 planów): ~150ms

**Throughput:**
- Oczekiwane: 100-200 req/s na standardowym serwerze
- Z cachingiem: 1000+ req/s

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie środowiska i walidacja założeń
**Cel:** Upewnić się, że mamy wszystkie potrzebne narzędzia i istniejące komponenty

**Zadania:**
1. ✅ Sprawdź strukturę tabeli `plans` w bazie danych
2. ✅ Zweryfikuj istnienie tabeli `notes` i kolumny `user_id`
3. ✅ Potwierdź działanie middleware Supabase w Astro
4. ✅ Zlokalizuj istniejące pliki:
   - `src/lib/services/notes.service.ts`
   - `src/lib/errors/plan-generation.errors.ts`
   - `src/lib/utils/error-mapper.ts`
   - `src/lib/validators/notes.validator.ts`

**Weryfikacja:**
```bash
# Sprawdź strukturę bazy danych
psql -d vibetravel -c "\d plans"
psql -d vibetravel -c "\d notes"

# Sprawdź istnienie plików
ls src/lib/services/notes.service.ts
ls src/lib/errors/plan-generation.errors.ts
```

**Oczekiwany wynik:** Wszystkie pliki i tabele istnieją zgodnie z planem

---

### Krok 2: Utworzenie serwisu dla planów (PlansService)
**Cel:** Stworzyć warstwę logiki biznesowej do pobierania planów

**Plik:** `src/lib/services/plans.service.ts`

**Implementacja:**
```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { PlansListResponseDTO, PlanListItemDTO } from "../../types";
import { NotFoundError, ForbiddenError } from "../errors/plan-generation.errors";

/**
 * Service for managing travel plans
 * Handles read operations for plans table
 */
export class PlansService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Retrieves all plans for a specific note with authorization check
   *
   * @param noteId - UUID of the note to fetch plans for
   * @param userId - UUID of the authenticated user
   * @returns Promise resolving to PlansListResponseDTO
   * @throws NotFoundError if note doesn't exist
   * @throws ForbiddenError if user doesn't own the note
   * @throws Error for database errors
   */
  async getPlansByNoteId(
    noteId: string,
    userId: string
  ): Promise<PlansListResponseDTO> {
    // Step 1: Verify note ownership first
    const { data: note, error: noteError } = await this.supabase
      .from("notes")
      .select("id, user_id")
      .eq("id", noteId)
      .single();

    // Step 2: Handle note not found
    if (noteError) {
      if (noteError.code === "PGRST116") {
        throw new NotFoundError("note", noteId);
      }
      console.error("[PlansService.getPlansByNoteId] Note query error:", noteError);
      throw new Error(`Failed to verify note: ${noteError.message}`);
    }

    if (!note) {
      throw new NotFoundError("note", noteId);
    }

    // Step 3: Authorization check
    if (note.user_id !== userId) {
      throw new ForbiddenError(
        "You don't have permission to access plans for this note"
      );
    }

    // Step 4: Fetch plans for the note
    const { data: plans, error: plansError } = await this.supabase
      .from("plans")
      .select("id, note_id, content, prompt_version, feedback, created_at")
      .eq("note_id", noteId)
      .order("created_at", { ascending: false });

    // Step 5: Handle database errors
    if (plansError) {
      console.error("[PlansService.getPlansByNoteId] Plans query error:", plansError);
      throw new Error(`Failed to fetch plans: ${plansError.message}`);
    }

    // Step 6: Transform to DTOs
    const planDTOs: PlanListItemDTO[] = (plans || []).map((plan) => ({
      id: plan.id,
      note_id: plan.note_id,
      content: plan.content,
      prompt_version: plan.prompt_version,
      feedback: plan.feedback,
      created_at: plan.created_at,
    }));

    // Step 7: Return response with total count
    return {
      plans: planDTOs,
      total: planDTOs.length,
    };
  }
}
```

**Testowanie:**
```typescript
// Unit test (opcjonalnie)
describe("PlansService", () => {
  it("should return plans for authorized user", async () => {
    const service = new PlansService(mockSupabase);
    const result = await service.getPlansByNoteId(noteId, userId);
    expect(result.plans).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("should throw ForbiddenError for unauthorized user", async () => {
    const service = new PlansService(mockSupabase);
    await expect(
      service.getPlansByNoteId(noteId, otherUserId)
    ).rejects.toThrow(ForbiddenError);
  });
});
```

**Weryfikacja:**
- Kod kompiluje się bez błędów TypeScript
- Wszystkie importy są poprawne
- Obsługa błędów jest zgodna z istniejącym wzorcem w `NotesService`

---

### Krok 3: Utworzenie walidatora (opcjonalnie, jeśli nie istnieje)
**Cel:** Upewnić się, że walidator UUID istnieje lub go utworzyć

**Plik:** `src/lib/validators/notes.validator.ts` (sprawdź czy już istnieje)

**Jeśli funkcja `validateNoteId` już istnieje:**
✅ Użyj istniejącej implementacji

**Jeśli nie istnieje, dodaj:**
```typescript
import { ValidationError } from "../errors/plan-generation.errors";

/**
 * Validates that a note ID is a valid UUID v4
 * @throws ValidationError if invalid
 */
export function validateNoteId(noteId: string | undefined): string {
  if (!noteId) {
    throw new ValidationError("noteId", "Note ID is required");
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(noteId)) {
    throw new ValidationError("noteId", "Must be a valid UUID");
  }

  return noteId;
}
```

**Weryfikacja:**
```typescript
// Test validation
console.log(validateNoteId("550e8400-e29b-41d4-a716-446655440000")); // OK
validateNoteId("invalid-uuid"); // Throws ValidationError
validateNoteId(undefined); // Throws ValidationError
```

---

### Krok 4: Utworzenie endpointa API
**Cel:** Utworzyć plik z handlerem dla route `/api/notes/:noteId/plans`

**Struktura katalogów:**
```
src/pages/api/notes/
  [noteId]/
    plans.ts         ← NOWY PLIK
    generate-plan.ts (już istnieje)
```

**Plik:** `src/pages/api/notes/[noteId]/plans.ts`

**Implementacja:**
```typescript
import type { APIRoute } from "astro";
import { PlansService } from "../../../../lib/services/plans.service";
import { validateNoteId } from "../../../../lib/validators/notes.validator";
import { createErrorResponse } from "../../../../lib/utils/error-mapper";

export const prerender = false;

/**
 * Default user ID for development purposes (matches test user in migrations)
 * TODO: Remove fallback and enforce authentication in production
 */
const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000000";

/**
 * GET /api/notes/:noteId/plans
 * Retrieves all plans for a specific note, ordered by creation date (newest first)
 *
 * URL Parameters:
 * - noteId: UUID of the note to fetch plans for
 *
 * Response: 200 OK with PlansListResponseDTO
 *
 * Error responses:
 * - 400 Bad Request: Invalid UUID format
 * - 401 Unauthorized: No authentication session (production only)
 * - 403 Forbidden: User doesn't own the note
 * - 404 Not Found: Note doesn't exist
 * - 500 Internal Server Error: Database or unexpected errors
 *
 * NOTE: For MVP, falls back to DEFAULT_USER_ID when no auth session exists
 */
export const GET: APIRoute = async (context) => {
  try {
    // Step 1: Extract and validate noteId from URL params
    const { noteId } = context.params;
    console.log("[GET /api/notes/:noteId/plans] Received noteId:", noteId);

    const validatedNoteId = validateNoteId(noteId);
    console.log("[GET /api/notes/:noteId/plans] Validated noteId:", validatedNoteId);

    // Step 2: Authentication check - get current user (or use default for MVP)
    const {
      data: { user },
      error: authError,
    } = await context.locals.supabase.auth.getUser();

    // For MVP: Use DEFAULT_USER_ID when no auth session exists
    const userId = user?.id || DEFAULT_USER_ID;

    if (authError) {
      console.warn(
        "[GET /api/notes/:noteId/plans] Auth error (using DEFAULT_USER_ID):",
        authError.message
      );
    }

    console.log("[GET /api/notes/:noteId/plans] Using user ID:", userId);

    // Step 3: Initialize plans service
    const plansService = new PlansService(context.locals.supabase);

    // Step 4: Retrieve plans with authorization check
    console.log("[GET /api/notes/:noteId/plans] Fetching plans...");
    const result = await plansService.getPlansByNoteId(validatedNoteId, userId);
    console.log(
      "[GET /api/notes/:noteId/plans] Plans retrieved successfully:",
      result.total,
      "plans"
    );

    // Step 5: Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    // Step 6: Handle all errors with error mapper
    console.error("[GET /api/notes/:noteId/plans] Error occurred:", error);

    if (error instanceof Error) {
      console.error("[GET /api/notes/:noteId/plans] Error stack:", error.stack);
    }

    return createErrorResponse(error);
  }
};
```

**Weryfikacja struktury pliku:**
```bash
# Sprawdź czy plik został utworzony w odpowiednim miejscu
ls src/pages/api/notes/[noteId]/plans.ts

# Sprawdź routing Astro (podczas dev server)
npm run dev
# Endpoint powinien być dostępny na: http://localhost:4321/api/notes/{noteId}/plans
```

---

### Krok 5: Testowanie manualne endpointa
**Cel:** Zweryfikować wszystkie scenariusze (sukces i błędy)

**Przygotowanie:**
1. Uruchom serwer deweloperski: `npm run dev`
2. Przygotuj dane testowe w bazie (notatkę z planami)
3. Użyj narzędzia HTTP (curl, Postman, Insomnia)

**Scenariusze testowe:**

**Test 1: Sukces - pobranie planów dla istniejącej notatki**
```bash
curl -X GET \
  "http://localhost:4321/api/notes/550e8400-e29b-41d4-a716-446655440000/plans" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# Oczekiwana odpowiedź: 200 OK
# {
#   "plans": [...],
#   "total": 2
# }
```

**Test 2: Sukces - notatka bez planów**
```bash
curl -X GET \
  "http://localhost:4321/api/notes/660e8400-e29b-41d4-a716-446655440001/plans" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# Oczekiwana odpowiedź: 200 OK
# {
#   "plans": [],
#   "total": 0
# }
```

**Test 3: Błąd - nieprawidłowy UUID**
```bash
curl -X GET \
  "http://localhost:4321/api/notes/invalid-uuid/plans"

# Oczekiwana odpowiedź: 400 Bad Request
# {
#   "error": "Validation error for field 'noteId': Must be a valid UUID",
#   "code": "VALIDATION_ERROR",
#   "details": { "noteId": "Must be a valid UUID" }
# }
```

**Test 4: Błąd - notatka nie istnieje**
```bash
curl -X GET \
  "http://localhost:4321/api/notes/00000000-0000-0000-0000-000000000099/plans" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# Oczekiwana odpowiedź: 404 Not Found
# {
#   "error": "Note with ID ... not found",
#   "code": "NOT_FOUND"
# }
```

**Test 5: Błąd - brak uprawnień (inna notatka użytkownika)**
```bash
# Użyj tokenu User A do dostępu do notatki User B
curl -X GET \
  "http://localhost:4321/api/notes/USER_B_NOTE_ID/plans" \
  -H "Cookie: sb-access-token=USER_A_TOKEN"

# Oczekiwana odpowiedź: 403 Forbidden
# {
#   "error": "You don't have permission to access plans for this note",
#   "code": "FORBIDDEN"
# }
```

**Test 6: Sortowanie (najnowsze pierwsze)**
```bash
curl -X GET \
  "http://localhost:4321/api/notes/550e8400-e29b-41d4-a716-446655440000/plans" \
  -H "Cookie: sb-access-token=YOUR_TOKEN"

# Sprawdź czy created_at[0] > created_at[1]
# plans[0].created_at = "2025-10-11T11:00:00Z"
# plans[1].created_at = "2025-10-10T15:30:00Z"
```

**Weryfikacja:**
- ✅ Wszystkie scenariusze zwracają odpowiednie kody statusu
- ✅ Struktura JSON odpowiada specyfikacji
- ✅ Plany są posortowane od najnowszego
- ✅ Error codes są zgodne z dokumentacją API

---

### Krok 6: Dodanie indeksów bazy danych (optymalizacja)
**Cel:** Poprawić wydajność zapytań o plany

**Plik:** Utwórz migration w Supabase lub wykonaj SQL bezpośrednio

**SQL Migration:**
```sql
-- Migration: Add indexes for plans query optimization
-- Date: 2025-10-13

-- Index for fetching plans by note_id, ordered by created_at
CREATE INDEX IF NOT EXISTS idx_plans_note_id_created_at
ON plans(note_id, created_at DESC);

-- Index for verifying note ownership (if not already exists)
CREATE INDEX IF NOT EXISTS idx_notes_id_user_id
ON notes(id, user_id);

-- Analyze tables to update statistics
ANALYZE plans;
ANALYZE notes;
```

**Weryfikacja wydajności:**
```sql
-- Sprawdź czy index jest używany
EXPLAIN ANALYZE
SELECT id, note_id, content, prompt_version, feedback, created_at
FROM plans
WHERE note_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC;

-- Oczekiwany query plan:
-- Index Scan using idx_plans_note_id_created_at on plans
-- (nie: Seq Scan)
```

**Benchmark:**
```bash
# Przed indeksem: ~50-100ms
# Po indeksie: ~5-15ms (dla typowych danych)
```

---

### Krok 7: Code review i refactoring
**Cel:** Upewnić się, że kod jest czysty, zgodny z konwencjami i dobrze udokumentowany

**Checklist:**
- [ ] Kod jest zgodny z ESLint rules projektu
- [ ] Wszystkie funkcje mają JSDoc komentarze
- [ ] Nazwy zmiennych są opisowe i zgodne z konwencją
- [ ] Brak duplikacji kodu (DRY principle)
- [ ] Obsługa błędów jest kompletna i spójna
- [ ] Logi są informacyjne ale nie przesadnie szczegółowe
- [ ] Brak hardcoded values (poza DEFAULT_USER_ID dla MVP)
- [ ] TypeScript typy są poprawne (brak `any`)

**Linting:**
```bash
npm run lint
npm run type-check  # Jeśli dostępne
```

**Code review points:**
1. Czy `PlansService` prawidłowo weryfikuje autoryzację?
2. Czy error handling obejmuje wszystkie scenariusze?
3. Czy kolejność kroków w komentarzach jest logiczna?
4. Czy logowanie jest wystarczające do debugowania?
5. Czy endpoint zwraca dokładnie strukturę z API spec?

---

### Krok 8: Dokumentacja i finalizacja
**Cel:** Zaktualizować dokumentację i przygotować kod do merge

**Zadania:**

**1. Aktualizacja API documentation (jeśli to osobny plik):**
```markdown
# GET /api/notes/:noteId/plans

**Status:** ✅ Implemented

**Implementation date:** 2025-10-13

**Files:**
- Service: `src/lib/services/plans.service.ts`
- Endpoint: `src/pages/api/notes/[noteId]/plans.ts`

**Database indexes:**
- `idx_plans_note_id_created_at` on plans(note_id, created_at DESC)

**Known limitations:**
- No pagination (returns all plans)
- No query parameters for filtering
- Content always included (no lazy loading option)

**Future improvements:**
- Add pagination support (limit/offset)
- Add option to exclude `content` field for list view
- Add caching layer for frequently accessed plans
```

**2. Update README (jeśli dotyczy):**
Dodaj endpoint do listy zaimplementowanych API routes

**3. Commit changes:**
```bash
git add src/lib/services/plans.service.ts
git add src/pages/api/notes/[noteId]/plans.ts
git add .ai/get-note-plans-implementation-plan.md
git commit -m "feat: implement GET /api/notes/:noteId/plans endpoint

- Add PlansService for fetching plans with authorization
- Create API route handler at /api/notes/[noteId]/plans
- Add database indexes for query optimization
- Include comprehensive error handling and logging

Closes #[ISSUE_NUMBER]"
```

**4. Create pull request:**
- Tytuł: "feat: implement GET /api/notes/:noteId/plans endpoint"
- Opis: Link do implementation plan i API spec
- Checklist:
  - [ ] All tests pass
  - [ ] Manual testing completed
  - [ ] Documentation updated
  - [ ] Database migrations included

---

### Krok 9: Monitoring i obserwacja produkcyjnego wdrożenia
**Cel:** Upewnić się, że endpoint działa poprawnie w produkcji

**Metryki do monitorowania:**
1. **Response time:** Średni czas odpowiedzi (target: < 100ms)
2. **Error rate:** Procent błędów 4xx i 5xx (target: < 1%)
3. **Request volume:** Liczba requestów na endpoint
4. **Most common errors:** Najczęstsze kody błędów

**Alerty do ustawienia:**
- Response time > 500ms przez > 5 minut
- Error rate > 5% przez > 2 minuty
- Database connection errors

**Dashboard metrics (przykład Grafana):**
```
- Endpoint: /api/notes/:noteId/plans
  - RPS (requests per second)
  - P50, P95, P99 latency
  - Status code breakdown (200, 400, 403, 404, 500)
  - Average plans per response
```

**Log aggregation (przykład):**
```
Query: [GET /api/notes/:noteId/plans]
Filters:
  - level: ERROR
  - status: 500
Time range: Last 24h
```

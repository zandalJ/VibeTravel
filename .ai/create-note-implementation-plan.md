# API Endpoint Implementation Plan: POST /api/notes

## 1. Przegląd punktu końcowego

Endpoint służy do tworzenia nowej notatki podróżnej (travel note) dla zalogowanego użytkownika. Notatka zawiera podstawowe informacje o planowanej podróży: cel podróży, daty, budżet oraz dodatkowe uwagi. Jest to pierwszy krok w procesie generowania spersonalizowanego planu wycieczki przez AI.

**Kluczowe cechy:**
- Wymaga autentykacji użytkownika (sesja Supabase)
- Waliduje dane wejściowe zgodnie ze ścisłymi regułami biznesowymi
- Automatycznie przypisuje notatkę do zalogowanego użytkownika
- Zwraca kompletny obiekt notatki po utworzeniu (201 Created)

## 2. Szczegóły żądania

- **Metoda HTTP:** `POST`
- **Struktura URL:** `/api/notes`
- **Content-Type:** `application/json`
- **Autentykacja:** Wymagana (Supabase session cookie)

### Parametry żądania

**Request Body (JSON):**

```typescript
{
  destination: string;         // WYMAGANE
  start_date: string;          // WYMAGANE (ISO 8601: "YYYY-MM-DD")
  end_date: string;            // WYMAGANE (ISO 8601: "YYYY-MM-DD")
  total_budget?: number | null;    // OPCJONALNE
  additional_notes?: string | null; // OPCJONALNE
}
```

**Wymagane pola:**
- `destination` - cel podróży (string, 1-255 znaków)
- `start_date` - data rozpoczęcia (ISO 8601 date string)
- `end_date` - data zakończenia (ISO 8601 date string)

**Opcjonalne pola:**
- `total_budget` - całkowity budżet na wyjazd (number > 0 lub null)
- `additional_notes` - dodatkowe uwagi użytkownika (string, max ~10,000 znaków lub null)

### Reguły walidacji

1. **destination:**
   - WYMAGANE
   - Typ: string
   - Min długość: 1 znak
   - Max długość: 255 znaków

2. **start_date:**
   - WYMAGANE
   - Typ: string w formacie ISO 8601 (`YYYY-MM-DD`)
   - Musi być prawidłową datą

3. **end_date:**
   - WYMAGANE
   - Typ: string w formacie ISO 8601 (`YYYY-MM-DD`)
   - Musi być prawidłową datą
   - Musi być >= `start_date`

4. **Czas trwania podróży:**
   - `end_date - start_date` <= 14 dni
   - Walidacja cross-field

5. **total_budget:**
   - OPCJONALNE
   - Typ: number lub null
   - Jeśli podane, musi być > 0
   - Precision: NUMERIC(10,2) w bazie danych

6. **additional_notes:**
   - OPCJONALNE
   - Typ: string lub null
   - Zalecany limit: ~10,000 znaków (walidacja w aplikacji)

## 3. Wykorzystywane typy

### Command Model (Input)

```typescript
// src/types.ts (linie 72-79)
interface CreateNoteCommand {
  destination: string;
  start_date: string;
  end_date: string;
  total_budget?: number | null;
  additional_notes?: string | null;
}
```

### DTO (Output)

```typescript
// src/types.ts (linie 51-60)
interface NoteDTO {
  id: string;
  destination: string;
  start_date: string;
  end_date: string;
  total_budget?: number | null;
  additional_notes?: string | null;
  created_at: string;
  updated_at: string;
}
```

### Error DTOs

```typescript
// src/types.ts (linie 179-192)
interface ErrorResponseDTO {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

interface ValidationErrorResponseDTO extends ErrorResponseDTO {
  code: "VALIDATION_ERROR";
  details: Record<string, string>; // field -> error message
}
```

### Zod Schema (do utworzenia)

```typescript
// src/lib/validators/notes.validator.ts
import { z } from "zod";

export const createNoteSchema = z.object({
  destination: z.string().min(1, "Destination is required").max(255, "Destination cannot exceed 255 characters"),
  start_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid start date format (expected ISO 8601: YYYY-MM-DD)"
  }),
  end_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: "Invalid end date format (expected ISO 8601: YYYY-MM-DD)"
  }),
  total_budget: z.number().positive("Total budget must be greater than 0").nullable().optional(),
  additional_notes: z.string().max(10000, "Additional notes cannot exceed 10,000 characters").nullable().optional()
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  return endDate >= startDate;
}, {
  message: "End date must be after or equal to start date",
  path: ["end_date"]
}).refine((data) => {
  const startDate = new Date(data.start_date);
  const endDate = new Date(data.end_date);
  const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  return durationInDays <= 14;
}, {
  message: "Trip duration cannot exceed 14 days",
  path: ["duration"]
});
```

## 4. Szczegóły odpowiedzi

### Sukces (201 Created)

```json
{
  "id": "uuid",
  "destination": "Barcelona, Spain",
  "start_date": "2025-12-01",
  "end_date": "2025-12-07",
  "total_budget": 1000.00,
  "additional_notes": "Want to see Sagrada Familia and Gothic Quarter",
  "created_at": "2025-10-11T10:30:00Z",
  "updated_at": "2025-10-11T10:30:00Z"
}
```

**Headers:**
- `Content-Type: application/json`
- `Location: /api/notes/{id}` (opcjonalnie, wskazuje URL utworzonego zasobu)

### Błąd walidacji (400 Bad Request)

```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "destination": "Destination is required",
    "end_date": "End date must be after or equal to start date",
    "duration": "Trip duration cannot exceed 14 days"
  }
}
```

### Błąd autoryzacji (401 Unauthorized)

```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

### Błąd serwera (500 Internal Server Error)

```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "details": {
    "message": "Failed to create note. Please try again later."
  }
}
```

## 5. Przepływ danych

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /api/notes
       │ Body: CreateNoteCommand
       ▼
┌─────────────────────────┐
│  Astro API Route        │
│  src/pages/api/notes.ts │
└──────┬──────────────────┘
       │
       │ 1. Sprawdź autentykację
       │    (context.locals.supabase.auth.getUser())
       │
       ├─► NIE ────► 401 Unauthorized
       │
       │ TAK
       │
       │ 2. Waliduj body (Zod schema)
       │
       ├─► BŁĄD ──► 400 Bad Request (ValidationErrorResponseDTO)
       │
       │ OK
       │
       ▼
┌─────────────────────────┐
│  Notes Service          │
│  src/lib/services/      │
│  notes.service.ts       │
└──────┬──────────────────┘
       │
       │ 3. createNote(userId, command)
       │
       ▼
┌─────────────────────────┐
│  Supabase Client        │
│  (context.locals.       │
│   supabase)             │
└──────┬──────────────────┘
       │
       │ 4. INSERT INTO notes
       │    (user_id, destination, start_date, end_date,
       │     total_budget, additional_notes)
       │
       ▼
┌─────────────────────────┐
│  PostgreSQL Database    │
│  (Supabase)             │
└──────┬──────────────────┘
       │
       │ 5. Zwróć utworzony rekord z:
       │    - id (UUID)
       │    - created_at (timestamp)
       │    - updated_at (timestamp)
       │
       ▼
┌─────────────────────────┐
│  Notes Service          │
└──────┬──────────────────┘
       │
       │ 6. Mapuj do NoteDTO
       │
       ▼
┌─────────────────────────┐
│  Astro API Route        │
└──────┬──────────────────┘
       │
       │ 7. Zwróć Response(JSON, 201)
       │
       ▼
┌─────────────┐
│   Client    │
│ 201 Created │
│ NoteDTO     │
└─────────────┘
```

### Interakcje z bazą danych

**Tabela:** `notes` (db-plan.md, linie 38-53)

**INSERT Query (wykonywane przez Supabase SDK):**
```sql
INSERT INTO notes (
  user_id,
  destination,
  start_date,
  end_date,
  total_budget,
  additional_notes
) VALUES (
  $1, -- user_id z sesji
  $2, -- destination z command
  $3, -- start_date z command
  $4, -- end_date z command
  $5, -- total_budget z command (może być NULL)
  $6  -- additional_notes z command (może być NULL)
)
RETURNING *;
```

**Constrainty bazy sprawdzane automatycznie:**
- `CHECK (end_date >= start_date)` - linia 51
- `CHECK (end_date - start_date <= 14)` - linia 52
- `CHECK (total_budget > 0)` - linia 45 (jeśli NOT NULL)
- `NOT NULL` dla: user_id, destination, start_date, end_date

**Triggery:**
- Automatyczne ustawienie `updated_at` przy modyfikacji (linia 48)

## 6. Względy bezpieczeństwa

### 1. Autentykacja

**Implementacja:**
```typescript
const { data: { user }, error } = await context.locals.supabase.auth.getUser();

if (error || !user) {
  return new Response(
    JSON.stringify({
      error: "Authentication required",
      code: "UNAUTHORIZED"
    }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
```

**Zasady:**
- Użyć `context.locals.supabase` (zgodnie z backend.mdc, linia 11)
- NIE importować `supabaseClient` bezpośrednio
- Sprawdzać sesję przed jakąkolwiek operacją
- Zwracać 401 jeśli brak użytkownika lub błąd sesji

### 2. Autoryzacja

**Przypisanie user_id:**
```typescript
// W notes.service.ts
async createNote(userId: string, command: CreateNoteCommand): Promise<NoteDTO> {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      user_id: userId, // ZAWSZE z sesji, NIGDY z request body
      ...command
    })
    .select()
    .single();

  // ...
}
```

**Zasady:**
- `user_id` ZAWSZE pochodzi z `context.locals.supabase.auth.getUser()`
- NIGDY nie akceptować `user_id` z request body
- Każdy użytkownik może tworzyć tylko swoje notatki

### 3. Walidacja danych wejściowych

**Ochrona przed:**
- **SQL Injection:** Supabase SDK używa parametryzowanych zapytań
- **XSS:** Walidacja typu i długości stringów
- **Type coercion attacks:** Zod wymusza ścisłe typy

**Implementacja:**
```typescript
try {
  const validatedData = createNoteSchema.parse(await request.json());
} catch (error) {
  if (error instanceof z.ZodError) {
    const details: Record<string, string> = {};
    error.errors.forEach((err) => {
      const path = err.path.join('.');
      details[path] = err.message;
    });

    return new Response(
      JSON.stringify({
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        details
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

### 4. Row Level Security (RLS)

**Supabase RLS Policy (do skonfigurowania w migration):**
```sql
-- Policy: Użytkownicy mogą tworzyć tylko własne notatki
CREATE POLICY "Users can create their own notes"
ON notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Użytkownicy mogą odczytać tylko własne notatki
CREATE POLICY "Users can view their own notes"
ON notes
FOR SELECT
USING (auth.uid() = user_id);
```

### 5. Rate Limiting

**Nie określono w specyfikacji**, ale zalecane do wdrożenia w przyszłości:
- Limit: np. 100 notatek na użytkownika dziennie
- Implementacja: middleware lub Supabase Edge Functions
- Header: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## 7. Obsługa błędów

### Scenariusze błędów i kody statusu

| Scenariusz | Status | Code | Przykład message |
|------------|--------|------|------------------|
| Brak autentykacji | 401 | `UNAUTHORIZED` | "Authentication required" |
| Nieprawidłowy JSON | 400 | `VALIDATION_ERROR` | "Invalid JSON body" |
| Brak wymaganych pól | 400 | `VALIDATION_ERROR` | "Destination is required" |
| Nieprawidłowy format daty | 400 | `VALIDATION_ERROR` | "Invalid start date format" |
| end_date < start_date | 400 | `VALIDATION_ERROR` | "End date must be after or equal to start date" |
| Duration > 14 dni | 400 | `VALIDATION_ERROR` | "Trip duration cannot exceed 14 days" |
| total_budget <= 0 | 400 | `VALIDATION_ERROR` | "Total budget must be greater than 0" |
| destination > 255 chars | 400 | `VALIDATION_ERROR` | "Destination cannot exceed 255 characters" |
| additional_notes > 10k chars | 400 | `VALIDATION_ERROR` | "Additional notes cannot exceed 10,000 characters" |
| Błąd bazy danych | 500 | `INTERNAL_ERROR` | "Failed to create note" |
| Nieoczekiwany błąd | 500 | `INTERNAL_ERROR` | "Internal server error" |

### Struktura obsługi błędów

**W Astro API Route:**
```typescript
export const POST: APIRoute = async (context) => {
  try {
    // 1. Autentykacja
    const { data: { user }, error: authError } = await context.locals.supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication required", code: "UNAUTHORIZED" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Parsowanie i walidacja
    let body;
    try {
      body = await context.request.json();
    } catch (e) {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON body",
          code: "VALIDATION_ERROR"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validatedData = createNoteSchema.parse(body);

    // 3. Wywołanie serwisu
    const note = await notesService.createNote(user.id, validatedData);

    // 4. Sukces
    return new Response(
      JSON.stringify(note),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    // Obsługa błędów walidacji Zod
    if (error instanceof z.ZodError) {
      const details: Record<string, string> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        details[path] = err.message;
      });

      return new Response(
        JSON.stringify({
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Logowanie błędów serwera
    console.error("[POST /api/notes] Internal error:", error);

    // Ogólny błąd serwera
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: { message: "Failed to create note. Please try again later." }
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

**W Notes Service:**
```typescript
async createNote(userId: string, command: CreateNoteCommand): Promise<NoteDTO> {
  const { data, error } = await this.supabase
    .from('notes')
    .insert({
      user_id: userId,
      destination: command.destination,
      start_date: command.start_date,
      end_date: command.end_date,
      total_budget: command.total_budget ?? null,
      additional_notes: command.additional_notes ?? null
    })
    .select()
    .single();

  if (error) {
    console.error("[NotesService.createNote] Database error:", error);
    throw new Error(`Failed to create note: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to create note: No data returned");
  }

  return data as NoteDTO;
}
```

### Logowanie błędów

**Strategia:**
1. **Błędy użytkownika (4xx):** Logować na poziomie `info` lub `warn`
2. **Błędy serwera (5xx):** Logować na poziomie `error` z pełnym stack trace
3. **Format:** Strukturyzowane logi JSON (łatwe do parsowania)

**Przykład:**
```typescript
console.error({
  timestamp: new Date().toISOString(),
  level: "error",
  context: "POST /api/notes",
  userId: user.id,
  error: {
    message: error.message,
    stack: error.stack
  }
});
```

## 8. Rozważania dotyczące wydajności

### 1. Potencjalne wąskie gardła

**Baza danych:**
- Operacja INSERT na tabeli `notes`
- Trigger automatycznej aktualizacji `updated_at`

**Supabase connection:**
- Każde wywołanie API = 1 connection do Supabase
- Default connection pool: wystarczający dla MVP

**Walidacja:**
- Zod schema parse: ~1ms dla typowego requesta
- Cross-field validation (daty): ~0.1ms

### 2. Strategie optymalizacji

**Obecnie NIE potrzebne** (MVP z zamkniętą grupą testową), ale do rozważenia w przyszłości:

**Indeksy bazy danych:**
```sql
-- Już istnieją domyślnie:
-- PRIMARY KEY na notes.id (UUID)
-- FOREIGN KEY INDEX na notes.user_id
-- INDEX na created_at (dla sortowania w listach)
```

**Caching:**
- NIE potrzebny dla POST operacji (zawsze świeże dane)
- Rozważyć dla GET /api/notes (lista notatek)

**Connection pooling:**
- Supabase obsługuje automatycznie
- Domyślny pool: 15 connections per user

**Validation caching:**
- Zod schemas są kompilowane raz przy starcie
- Brak potrzeby memoizacji

### 3. Monitorowanie wydajności

**Metryki do śledzenia:**
- Czas odpowiedzi endpoint (target: <200ms)
- Liczba błędów bazy danych (target: <0.1%)
- Liczba błędów walidacji (informacyjne)

**Narzędzia:**
- Supabase Dashboard: query performance
- Astro dev server: response times
- Production logs: error rates

### 4. Limity systemu

**Supabase Free Tier:**
- 500MB database
- 2GB bandwidth/month
- 50,000 monthly active users

**PostgreSQL constraints:**
- Max row size: ~1.6GB (notes są małe, ~10KB każda)
- Max table size: brak praktycznego limitu dla MVP

**Estimated capacity:**
- 50,000 notatek ≈ 500MB database (przy ~10KB/notatka)
- Wystarczające dla zamkniętej grupy testowej

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie struktury plików
- [ ] Utworzyć `src/lib/validators/notes.validator.ts`
- [ ] Utworzyć `src/lib/services/notes.service.ts`
- [ ] Utworzyć `src/pages/api/notes.ts`

### Krok 2: Implementacja walidacji (notes.validator.ts)
- [ ] Importować Zod: `import { z } from "zod"`
- [ ] Zdefiniować `createNoteSchema` zgodnie z regułami z sekcji 3
- [ ] Wyeksportować schema: `export const createNoteSchema`
- [ ] Dodać testy jednostkowe dla walidacji (opcjonalnie, zalecane)

### Krok 3: Implementacja serwisu (notes.service.ts)
- [ ] Importować typy: `CreateNoteCommand`, `NoteDTO` z `src/types.ts`
- [ ] Importować `SupabaseClient` z `src/db/supabase.client.ts`
- [ ] Utworzyć klasę `NotesService` z konstruktorem przyjmującym `SupabaseClient`
- [ ] Implementować metodę `createNote(userId: string, command: CreateNoteCommand): Promise<NoteDTO>`
- [ ] Obsłużyć błędy bazy danych z odpowiednimi logami
- [ ] Zwrócić `NoteDTO` lub rzucić błąd

**Przykładowa struktura:**
```typescript
export class NotesService {
  constructor(private supabase: SupabaseClient) {}

  async createNote(userId: string, command: CreateNoteCommand): Promise<NoteDTO> {
    // Implementacja z sekcji 7
  }
}
```

### Krok 4: Implementacja API Route (src/pages/api/notes.ts)
- [ ] Dodać `export const prerender = false` na górze pliku
- [ ] Importować `APIRoute` z `astro`
- [ ] Importować `z` z `zod`
- [ ] Importować `createNoteSchema` z `validators/notes.validator.ts`
- [ ] Importować `NotesService` z `services/notes.service.ts`
- [ ] Implementować handler `export const POST: APIRoute`
- [ ] Dodać sprawdzenie autentykacji (sekcja 6.1)
- [ ] Dodać parsowanie i walidację body (sekcja 6.3)
- [ ] Wywołać `notesService.createNote(user.id, validatedData)`
- [ ] Zwrócić response 201 z NoteDTO
- [ ] Obsłużyć wszystkie błędy zgodnie z sekcją 7

**Struktura pliku:**
```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import { createNoteSchema } from "../../lib/validators/notes.validator";
import { NotesService } from "../../lib/services/notes.service";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  // Implementacja z sekcji 7
};
```

### Krok 5: Konfiguracja Row Level Security (RLS) w Supabase
- [ ] Otworzyć Supabase Dashboard
- [ ] Przejść do Table Editor → notes
- [ ] Włączyć RLS: "Enable Row Level Security"
- [ ] Dodać policy dla INSERT (sekcja 6.4)
- [ ] Dodać policy dla SELECT (sekcja 6.4)
- [ ] Przetestować policies z różnymi użytkownikami

### Krok 6: Testowanie manualne
- [ ] Uruchomić `npm run dev`
- [ ] Zalogować się jako użytkownik testowy
- [ ] Wysłać POST request do `/api/notes` z prawidłowymi danymi
- [ ] Zweryfikować response 201 z NoteDTO
- [ ] Sprawdzić bazę danych - czy notatka została utworzona
- [ ] Przetestować wszystkie scenariusze błędów z sekcji 7:
  - [ ] Brak autentykacji (401)
  - [ ] Nieprawidłowy JSON (400)
  - [ ] Brak wymaganych pól (400)
  - [ ] Nieprawidłowy format daty (400)
  - [ ] end_date < start_date (400)
  - [ ] Duration > 14 dni (400)
  - [ ] total_budget <= 0 (400)
  - [ ] destination > 255 znaków (400)
  - [ ] additional_notes > 10,000 znaków (400)

### Krok 7: Testowanie integracyjne (opcjonalnie, zalecane)
- [ ] Utworzyć `src/pages/api/notes.test.ts`
- [ ] Mockować Supabase client
- [ ] Napisać testy dla wszystkich scenariuszy sukcesu i błędów
- [ ] Uruchomić testy: `npm run test`

### Krok 8: Dokumentacja i code review
- [ ] Dodać komentarze JSDoc do funkcji serwisu
- [ ] Dodać komentarze do API Route wyjaśniające logikę
- [ ] Zaktualizować dokumentację API (jeśli istnieje)
- [ ] Przejrzeć kod pod kątem zgodności z `.cursor/rules/`
- [ ] Sprawdzić linterem: `npm run lint`
- [ ] Sformatować kodem: `npm run format`

### Krok 9: Deployment checklist
- [ ] Upewnić się, że `SUPABASE_URL` i `SUPABASE_ANON_KEY` są ustawione w production env
- [ ] Zweryfikować, że RLS policies są włączone w production database
- [ ] Przetestować endpoint na staging environment
- [ ] Monitorować logi po deployment na produkcję
- [ ] Sprawdzić response times w Supabase Dashboard

### Krok 10: Post-deployment monitoring
- [ ] Sprawdzić error rate w pierwszych 24h
- [ ] Zweryfikować, że wszystkie notatki mają poprawnie przypisany `user_id`
- [ ] Monitorować czas odpowiedzi (target: <200ms)
- [ ] Zebrać feedback od użytkowników z zamkniętej grupy testowej
- [ ] Zidentyfikować potencjalne edge cases do obsługi w następnej iteracji

---

## Podsumowanie

Ten endpoint jest fundamentem aplikacji VibeTravel - umożliwia użytkownikom zapisywanie podstawowych informacji o planowanych podróżach, które następnie będą wykorzystywane do generowania spersonalizowanych planów wycieczek przez AI.

**Kluczowe aspekty implementacji:**
1. **Bezpieczeństwo:** Pełna autentykacja + autoryzacja + RLS
2. **Walidacja:** Ścisłe reguły biznesowe (daty, budżet, długość podróży)
3. **Obsługa błędów:** Jasne komunikaty dla każdego scenariusza
4. **Wydajność:** Optymalna dla MVP, gotowa do skalowania
5. **Zgodność:** 100% zgodny z tech stackiem i regułami projektu

**Czas implementacji:** ~2-3 godziny dla doświadczonego developera
**Priortet:** WYSOKI (zablokowany przez generowanie planów AI)
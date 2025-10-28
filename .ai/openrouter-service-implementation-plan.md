## Opis usługi

Usługa OpenRouter integruje aplikację z API `openrouter.ai` w celu wykonywania zapytań typu Chat Completions (także strumieniowanych) oraz generowania ustrukturyzowanych odpowiedzi w formacie JSON. Zostanie zaimplementowana jako serwis serwerowy TypeScript w `src/lib/services/openrouter.service.ts`, wykorzystywany z poziomu endpointów Astro (`src/pages/api`) oraz serwisów domenowych (np. `plan-generation.service.ts`).

W projekcie docelowo zastąpi obecny mock i zapewni:
- **chat completions** (non-stream i stream),
- **ustrukturyzowane odpowiedzi** przez `response_format: json_schema`,
- **konfigurowalność** (model, parametry, nagłówki, timeout, retry),
- **silną obsługę błędów** z mapowaniem do klas domenowych i standardu API,
- **bezpieczeństwo** (sekrety w `import.meta.env`, redakcja logów, limity kosztów).

### Kluczowe komponenty (z celem)
1. **Konfiguracja i typy**: centralizuje klucze i opcje (model i parametry) oraz definicje typów DTO.
2. **HTTP client (fetch + AbortController)**: odpowiedzialny za wywołania, time-out, retry i nagłówki OpenRouter.
3. **Serwis `OpenRouterService`**: publiczne API do `chatCompletion`, `structuredCompletion`, `chatCompletionStream`.
4. **Warstwa normalizacji odpowiedzi**: spójne DTO (`AIResponse`, `StructuredAIResponse<T>`) z liczbą tokenów, modelem, metadanymi.
5. **Obsługa ustrukturyzowanych wyjść**: budowanie `response_format` z JSON Schema, walidacja odpowiedzi i zwrot `T`.
6. **Obsługa błędów i mapowanie**: translacja HTTP/SDK błędów do `OpenRouterError` i domenowych (`AIGenerationError`).
7. **Integracja domenowa**: punkty użycia w `plan-generation.service.ts` oraz w API (`src/pages/api/**`).

#### Wyzwania i rozwiązania (per komponent)
1. Konfiguracja i typy
   - (1) Rozjazd domyślnych parametrów między wywołaniami.
   - (2) Brak spójności nazw modeli.
   - Rozwiązania:
     - (1) Jedno źródło konfiguracji w konstruktorze + nadpisy per‑request.
     - (2) Enum/union string z walidacją i sensownym fallbackiem.
2. HTTP client
   - (1) Time-out i wiszące połączenia.
   - (2) Powtórzenia na 429/5xx a nie‑idempotentność.
   - Rozwiązania:
     - (1) `AbortController` + konfigurowalny `timeoutMs`.
     - (2) Ostrożny retry (np. max 1–2) tylko na 429/5xx, z backoffem.
3. Serwis `OpenRouterService`
   - (1) Rozbieżne wymagania: zwykłe vs ustrukturyzowane vs stream.
   - (2) Spójne DTO i logowanie.
   - Rozwiązania:
     - (1) Oddzielne metody z wspólnym jądrem wywołania.
     - (2) Normalizacja i jednolite typy wyników + korelacja `requestId`.
4. Normalizacja odpowiedzi
   - (1) Niespójny kształt `usage`, `model`, `choices` między providerami.
   - Rozwiązania:
     - (1) Mapper dedykowany do OpenAI‑compatible odpowiedzi (OpenRouter jest kompatybilny), z bezpiecznymi fallbackami.
5. Ustrukturyzowane wyjścia
   - (1) Błędny JSON lub niepełna zgodność ze schematem.
   - Rozwiązania:
     - (1) Wymuszony `response_format.json_schema.strict: true` + walidacja Zodem.
6. Błędy i mapowanie
   - (1) Różne kody i formaty błędów.
   - Rozwiązania:
     - (1) Jedna klasa `OpenRouterError` i mapowanie do `AIGenerationError` przez warstwę domenową i `error-mapper`.
7. Integracja domenowa
   - (1) Zależność od istniejących kontraktów (np. `AIResponse` używana w `plan-generation.service.ts`).
   - Rozwiązania:
     - (1) Zgodność typów (dodaj `model` w DTO) i bezinwazyjna podmiana mocka.

## Opis konstruktora

```ts
export type OpenRouterServiceOptions = {
  apiKey?: string; // domyślnie import.meta.env.OPENROUTER_API_KEY
  baseUrl?: string; // domyślnie "https://openrouter.ai/api/v1"
  defaultModel?: string; // np. "openrouter/auto" lub konkretny model
  defaultParams?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
    stop?: string[];
    seed?: number;
  };
  headers?: Record<string, string>; // dop. nagłówki: HTTP-Referer, X-Title
  timeoutMs?: number; // np. 60000
  maxRetries?: number; // np. 1
};

export class OpenRouterService {
  constructor(private readonly options: OpenRouterServiceOptions = {}) {}
}
```

- `apiKey`: z `import.meta.env.OPENROUTER_API_KEY` (fallback gdy nie podano).
- `headers`: zalecane przez OpenRouter: `HTTP-Referer`, `X-Title` (np. z `import.meta.env.PUBLIC_SITE_URL`, `import.meta.env.PUBLIC_APP_NAME`).
- `defaultModel` i `defaultParams`: sensowne domyślne wartości, nadpisywane per‑request.
- `timeoutMs`, `maxRetries`: kontrola stabilności i kosztów.

## Publiczne metody i pola

1. `chatCompletion(args): Promise<AIResponse>`
   - Wejście: `messages`, opcjonalnie `model`, `params` (temperature itd.), `response_format` (gdy nie‑JSON, to brak).
   - Wyjście: `{ content, model, promptTokens, completionTokens, provider?, raw? }`.
   - Zastosowanie: klasyczny czat bez strumieniowania.

2. `structuredCompletion<T>(args, schema): Promise<StructuredAIResponse<T>>`
   - Wymusza zwrot ustrukturyzowanego JSON przez `response_format: { type: 'json_schema', json_schema: { ... } }`.
   - Waliduje wynik Zodem (lub inną walidacją) i zwraca bezpieczny `data: T` wraz ze statystykami tokenów.

3. `chatCompletionStream(args): Promise<ReadableStream<Uint8Array>>`
   - Wywołuje `stream: true` i zwraca strumień SSE, który można dalej przetworzyć do tokenów/tekstu.

4. `getDefaultModel(): string`
   - Ekspozycja modelu domyślnego (wspiera debug i UI).

Typy wejściowe/wyjściowe (skrót):

```ts
type OpenRouterMessage = { role: 'system' | 'user' | 'assistant'; content: string };

type ChatCompletionArgs = {
  messages: OpenRouterMessage[];
  model?: string;
  params?: OpenRouterServiceOptions['defaultParams'];
  response_format?: unknown; // gdy używamy json_schema
};

export type AIResponse = {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  provider?: string;
  raw?: unknown; // pełna odpowiedź dla debugowania
};

export type StructuredAIResponse<T> = AIResponse & { data: T };
```

## Prywatne metody i pola

1. `buildHeaders(): Headers`
   - Zwraca komplet nagłówków: `Authorization: Bearer`, `Content-Type: application/json`, `HTTP-Referer`, `X-Title` (jeśli skonfigurowane).

2. `withTimeout<T>(promise, ms): Promise<T>`
   - Realizuje timeout przez `AbortController` i odrzuca obietnicę po przekroczeniu limitu.

3. `request<T>(path, body, {stream?: boolean}): Promise<T | ReadableStream>`
   - Jedno miejsce realizacji wywołań (retry, backoff, obsługa 429/5xx), wysyła na `baseUrl + /chat/completions`.

4. `normalizeCompletion(json): AIResponse`
   - Wyciąga `content`, `model`, `usage.prompt_tokens`, `usage.completion_tokens`, `provider`, `raw`.

5. `toOpenRouterError(error, context): OpenRouterError`
   - Zamienia błędy transportowe/parsing/HTTP na `OpenRouterError` (z `statusCode`, `originalError`).

6. `buildResponseFormatFromSchema(zodSchema, name): object`
   - Konwertuje Zod → JSON Schema (opcjonalnie przez `zod-to-json-schema`) lub przyjmuje gotowy JSON Schema.

## Obsługa błędów

Potencjalne scenariusze (i zalecenia):
1. Brak `OPENROUTER_API_KEY` → 401 w warstwie własnej: rzuć `OpenRouterError('Missing API key', 401)`; mapuj do `UnauthorizedError`/`AIGenerationError` przez `error-mapper`.
2. 400 z API (błędny `messages`/`response_format`) → rzuć `OpenRouterError` z `statusCode: 400`, do klienta 400.
3. 401/403 z API → rzuć `OpenRouterError` (do 401/403) i nie loguj sekretów.
4. 404 modelu → komunikat o niedostępności danego modelu; fallback do `defaultModel` (jeśli polityka na to pozwala) lub błąd 422/400.
5. 408/504 time-out → przerwij przez `AbortController`, zwróć błąd 504/408 zależnie od kontekstu.
6. 429 rate limit → jeden kontrolowany retry z backoffem; jeśli ponownie 429, zwróć 429.
7. 5xx serwera → jeden retry (jeśli dozwolone), potem 502/503 z informacją o degradacji.
8. Niepoprawny JSON (przy `response_format`) → walidacja nie przeszła: 502 + komunikat o niezgodności ze schematem (z redakcją treści).
9. Przerwane strumienie (SSE) → sygnalizacja przerwania do wyższych warstw; opcjonalny retry tylko jeśli polityka to dopuszcza.

## Kwestie bezpieczeństwa

- Sekrety w `import.meta.env` (TS typy w `src/env.d.ts`), nigdy w repo ani logach.
- Redakcja treści w logach (maskowanie klucza i potencjalnie PII z promptu).
- Wymuszony `timeoutMs` i twarde limity `max_tokens`/`temperature` (zabezp. koszty/ryzyko halucynacji).
- Nagłówki rekomendowane przez OpenRouter: `HTTP-Referer` (adres produkcyjny), `X-Title` (nazwa aplikacji) – mogą wpływać na routing i fair‑use.
- Walidacja wejścia (Zod) i wyjścia (Zod/JSON Schema) – zgodnie z zasadami projektu.
- Brak danych użytkowników w parametrach zapytań; używaj `POST` i `JSON`.

## Ujęcie elementów wymaganych przez OpenRouter (z przykładami)

1. System message
   - Użycie: pierwszy element w `messages` o roli `system`.
   - Przykład:
```ts
const systemMessage = { role: 'system', content: 'Jesteś asystentem planowania podróży. Odpowiadaj zwięźle i konkretnie.' };
```

2. User message
   - Użycie: kolejne komunikaty `user` z danymi użytkownika.
   - Przykład:
```ts
const userMessage = { role: 'user', content: 'Plan na 3 dni w Lizbonie, budżet 300 EUR/dzień, styl: foodie + kultura.' };
```

3. Ustrukturyzowane odpowiedzi (response_format)
   - Wzór:
```ts
const responseFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'TripPlan',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'days', 'budget'],
      properties: {
        summary: { type: 'string', minLength: 1 },
        budget: {
          type: 'object',
          additionalProperties: false,
          required: ['daily', 'currency'],
          properties: {
            daily: { type: 'number', minimum: 0 },
            currency: { type: 'string', minLength: 1 }
          }
        },
        days: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'morning', 'afternoon', 'evening'],
            properties: {
              title: { type: 'string' },
              morning: { type: 'string' },
              afternoon: { type: 'string' },
              evening: { type: 'string' }
            }
          }
        }
      }
    }
  }
};
```
   - Alternatywnie: zdefiniuj Zod i skonwertuj do JSON Schema (np. `zod-to-json-schema`).

4. Nazwa modelu
   - Użycie: `model` w payloadzie.
   - Przykłady:
     1) `openrouter/auto` (automatyczny wybór dostawcy/modelu)
     2) `anthropic/claude-3.5-sonnet`
     3) `openai/gpt-4o-mini`

5. Parametry modelu
   - Użycie: w polu `params` lub bezpośrednio w payloadzie (OpenAI‑compatible nazwy).
   - Przykład:
```ts
const params = { temperature: 0.4, top_p: 0.9, max_tokens: 1200, presence_penalty: 0.1 };
```

### Kompletny przykład wywołania (non‑stream, structured)

```ts
const messages = [
  { role: 'system', content: 'Jesteś asystentem planowania podróży. Zwracaj ściśle JSON zgodny ze schematem.' },
  { role: 'user', content: 'Kraków, 2 dni, budżet 150 EUR/dzień, interesuje mnie historia i kuchnia.' }
];

const responseFormat = { /* jak wyżej */ };

const ai = new OpenRouterService({
  defaultModel: 'openrouter/auto',
  timeoutMs: 60000,
  headers: {
    'HTTP-Referer': import.meta.env.PUBLIC_SITE_URL,
    'X-Title': import.meta.env.PUBLIC_APP_NAME
  }
});

const result = await ai.structuredCompletion<{ summary: string; days: Array<{title: string; morning: string; afternoon: string; evening: string}>; budget: { daily: number; currency: string } }>(
  { messages, model: 'anthropic/claude-3.5-sonnet', params: { temperature: 0.3 }, response_format: responseFormat },
  /* zodSchema lub walidator */
);

// result.data → bezpieczny obiekt zgodny ze schematem
// result.content → surowy JSON (string) zwrócony przez model
// result.model / result.promptTokens / result.completionTokens → metryki
```

## Plan wdrożenia krok po kroku

1. Konfiguracja środowiska
   - Dodaj do `.env`:
```bash
OPENROUTER_API_KEY="sk-or-..."
PUBLIC_SITE_URL="https://twoja-domena.com"
PUBLIC_APP_NAME="VibeTravel"
```
   - Zaktualizuj `src/env.d.ts`:
```ts
interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_APP_NAME?: string;
}
```

2. Implementacja serwisu w `src/lib/services/openrouter.service.ts`
   - Zamień mock na klasę zgodną z niniejszym przewodnikiem (z zachowaniem nazwy eksportu), dodaj pole `model` do zwracanego `AIResponse`.
   - Zaimplementuj: `chatCompletion`, `structuredCompletion`, `chatCompletionStream` oraz prywatne: `buildHeaders`, `withTimeout`, `request`, `normalizeCompletion`, `toOpenRouterError`, `buildResponseFormatFromSchema`.

3. Integracja z warstwą domenową
   - W `plan-generation.service.ts` skorzystaj z `getOpenRouterService()` (jak obecnie) – metoda `generatePlan` może zostać zrealizowana przez `chatCompletion`/`structuredCompletion`.
   - Jeżeli endpointy API potrzebują strumienia, udostępnij wariant `stream` i przekazuj SSE do klienta.

4. Walidacja i schematy
   - Umieść ewentualne schematy Zod w `src/lib/validators/openrouter.schema.ts` (lub istniejących validatorach), konwertuj do JSON Schema dla `response_format`.
   - Waliduj odpowiedzi strukturalne przed zwrotem do wyższych warstw.

5. Obsługa błędów i mapowanie
   - W serwisie rzucaj `OpenRouterError` z `statusCode` i `originalError`.
   - W miejscach integracji użyj istniejącego `error-mapper` do zwracania standaryzowanych odpowiedzi (np. mapuj do `AIGenerationError`).

6. Telemetria i logowanie
   - Dodaj `requestId` (np. `crypto.randomUUID()`) do kontekstu wywołania i logów.
   - Loguj metryki (`model`, `usage`, czasy), nie loguj pełnych treści promptów w produkcji (lub stosuj redakcję).

7. Testy i weryfikacja
   - Test jednostkowy (mock fetch): time‑out, retry, normalizacja odpowiedzi, walidacja schematu.
   - Test integracyjny: minimalne wywołanie z prawdziwym kluczem (w środowisku zewnętrznym), limitowane budżetem.

8. Hardenowanie i limity
   - Skonfiguruj konserwatywne `max_tokens`, `temperature` domyślne.
   - Wprowadź globalny limiter zapytań (np. w middleware lub per‑user quotas – już częściowo istnieje w limicie generacji planów).

## Dodatkowe wskazówki implementacyjne (OpenRouter API)

- Endpointy:
  - Chat Completions: `POST https://openrouter.ai/api/v1/chat/completions`
  - Modele: `GET https://openrouter.ai/api/v1/models`
- Nagłówki:
  - `Authorization: Bearer ${OPENROUTER_API_KEY}`
  - `Content-Type: application/json`
  - `HTTP-Referer: ${PUBLIC_SITE_URL}` (zalecane)
  - `X-Title: ${PUBLIC_APP_NAME}` (zalecane)
- Payload (rdzeń):
```ts
{
  model,
  messages, // [{ role, content }]
  ...params, // temperature, top_p, max_tokens, ...
  response_format, // jeśli wymagamy ustrukturyzowanego JSON
  stream // opcjonalnie true dla SSE
}
```

---

Ten przewodnik jest dostosowany do stacku: Astro 5, TypeScript 5, React 19, Tailwind 4, Shadcn/ui oraz obecnej architektury folderów. Implementując wg powyższych punktów, podmienisz mock na stabilną usługę OpenRouter z pełną obsługą błędów, bezpieczeństwem oraz ustrukturyzowanymi wynikami.

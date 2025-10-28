import { randomUUID } from "node:crypto";
import type { ZodTypeAny } from "zod";

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const CHAT_COMPLETIONS_PATH = "/chat/completions";
const DEFAULT_MODEL = "openrouter/auto";
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_RETRIES = 1;
const BASE_BACKOFF_MS = 250;

const ALLOWED_ROLES = ["system", "user", "assistant"] as const;

const DEFAULT_TRAVEL_PLAN_SYSTEM_PROMPT =
  "You are VibeTravel, an expert travel planning assistant. Follow the user's instructions precisely, produce practical itineraries, and respond in markdown unless a structured response is explicitly requested.";

type CompletionMessageRole = (typeof ALLOWED_ROLES)[number];

export interface OpenRouterMessage {
  role: CompletionMessageRole;
  content: string;
}

export interface ChatModelParams {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
  seed?: number;
}

export interface ChatCompletionArgs {
  messages: OpenRouterMessage[];
  model?: string;
  params?: ChatModelParams;
  response_format?: unknown;
  requestId?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface StructuredCompletionOptions<T> {
  schemaName?: string;
  validator?: (payload: unknown) => T;
  requestId?: string;
  timeoutMs?: number;
  strict?: boolean;
  headers?: Record<string, string>;
}

export type OpenRouterJsonSchemaDefinition =
  | {
      schema: Record<string, unknown>;
      name?: string;
      strict?: boolean;
    }
  | Record<string, unknown>;

export interface AIResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  provider?: string;
  requestId?: string;
  raw?: unknown;
}

export interface StructuredAIResponse<T> extends AIResponse {
  data: T;
}

export interface OpenRouterServiceOptions {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  defaultParams?: ChatModelParams;
  headers?: Record<string, string>;
  timeoutMs?: number;
  maxRetries?: number;
  fetch?: typeof fetch;
}

interface RequestOptions {
  stream?: boolean;
  timeoutMs?: number;
  requestId?: string;
  headers?: Record<string, string>;
}

interface OpenRouterChatCompletionResponse {
  id?: string;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  choices?: {
    index?: number;
    message?: { role?: string; content?: string };
    delta?: { content?: string };
    finish_reason?: string | null;
  }[];
  provider?: { name?: string } | string | null;
  [key: string]: unknown;
}

interface OpenRouterErrorPayload {
  error?: {
    message?: string;
    type?: string;
    code?: string | number | null;
    param?: string | null;
    metadata?: unknown;
  };
  message?: string;
  [key: string]: unknown;
}

export class OpenRouterError extends Error {
  public readonly statusCode?: number;
  public readonly code?: string;
  public readonly requestId?: string;
  public readonly originalError?: unknown;

  constructor(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      requestId?: string;
      originalError?: unknown;
    } = {}
  ) {
    super(message);
    this.name = "OpenRouterError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.requestId = options.requestId;
    this.originalError = options.originalError;
  }
}

export class OpenRouterService {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly defaultParams: ChatModelParams;
  private readonly staticHeaders: Record<string, string>;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OpenRouterServiceOptions = {}) {
    this.apiKey = options.apiKey ?? import.meta.env.OPENROUTER_API_KEY;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.defaultModel = options.defaultModel ?? DEFAULT_MODEL;
    this.defaultParams = options.defaultParams ?? {};
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_MAX_RETRIES);
    this.fetchImpl = options.fetch ?? fetch;

    this.staticHeaders = {
      ...(options.headers ?? {}),
    };

    const referer = import.meta.env.PUBLIC_SITE_URL;
    const title = import.meta.env.PUBLIC_APP_NAME;

    if (referer) {
      this.staticHeaders["HTTP-Referer"] = referer;
    }

    if (title) {
      this.staticHeaders["X-Title"] = title;
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  async chatCompletion(args: ChatCompletionArgs): Promise<AIResponse> {
    this.validateMessages(args.messages);

    const requestId = args.requestId ?? randomUUID();
    const payload = this.buildRequestPayload(args, false);
    const response = await this.request<OpenRouterChatCompletionResponse>(payload, {
      stream: false,
      requestId,
      timeoutMs: args.timeoutMs,
      headers: args.headers,
    });

    return this.normalizeCompletion(response, args.model ?? this.defaultModel, requestId);
  }

  async structuredCompletion<T>(
    args: Omit<ChatCompletionArgs, "response_format">,
    schema: ZodTypeAny | OpenRouterJsonSchemaDefinition,
    options: StructuredCompletionOptions<T> = {}
  ): Promise<StructuredAIResponse<T>> {
    this.validateMessages(args.messages);

    const requestId = options.requestId ?? args.requestId ?? randomUUID();
    const strict = options.strict ?? true;

    const responseFormat = await this.buildResponseFormatFromSchema(schema, options.schemaName, strict);
    const completion = await this.chatCompletion({
      ...args,
      requestId,
      timeoutMs: options.timeoutMs ?? args.timeoutMs,
      response_format: responseFormat,
      headers: { ...args.headers, ...options.headers },
    });

    const data = this.parseStructuredData<T>(completion.content, schema, {
      requestId: completion.requestId ?? requestId,
      validator: options.validator,
    });

    return { ...completion, data };
  }

  async chatCompletionStream(args: ChatCompletionArgs): Promise<ReadableStream<Uint8Array>> {
    this.validateMessages(args.messages);

    const requestId = args.requestId ?? randomUUID();
    const payload = this.buildRequestPayload(args, true);
    const stream = await this.request(payload, {
      stream: true,
      requestId,
      timeoutMs: args.timeoutMs,
      headers: args.headers,
    });

    return stream;
  }

  async generatePlan(prompt: string, options: Omit<ChatCompletionArgs, "messages"> = {}): Promise<AIResponse> {
    if (typeof prompt !== "string" || !prompt.trim()) {
      throw new OpenRouterError("Prompt must be a non-empty string", {
        statusCode: 400,
      });
    }

    return this.chatCompletion({
      ...options,
      messages: [
        {
          role: "system",
          content: DEFAULT_TRAVEL_PLAN_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });
  }

  private buildRequestPayload(args: ChatCompletionArgs, stream: boolean): Record<string, unknown> {
    const model = args.model ?? this.defaultModel;

    if (!model) {
      throw new OpenRouterError("Model must be specified for OpenRouter request", {
        statusCode: 400,
      });
    }

    const params = { ...this.defaultParams, ...(args.params ?? {}) };
    const payload: Record<string, unknown> = {
      model,
      messages: args.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    };

    if (stream) {
      payload.stream = true;
    }

    if (typeof args.response_format !== "undefined") {
      payload.response_format = args.response_format;
    }

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        payload[key] = value;
      }
    }

    return payload;
  }

  private async buildResponseFormatFromSchema(
    schema: ZodTypeAny | OpenRouterJsonSchemaDefinition,
    preferredName?: string,
    strict?: boolean
  ): Promise<unknown> {
    const name = preferredName ?? "StructuredResponse";
    const strictValue = strict ?? true;

    if (this.isZodSchema(schema)) {
      const jsonSchema = await this.convertZodToJsonSchema(schema, name);
      return {
        type: "json_schema",
        json_schema: {
          name,
          strict: strictValue,
          schema: jsonSchema,
        },
      };
    }

    if (this.isJsonSchemaWrapper(schema)) {
      return {
        type: "json_schema",
        json_schema: {
          name: schema.name ?? name,
          strict: schema.strict ?? strictValue,
          schema: schema.schema,
        },
      };
    }

    return {
      type: "json_schema",
      json_schema: {
        name,
        strict: strictValue,
        schema,
      },
    };
  }

  private async convertZodToJsonSchema(schema: ZodTypeAny, name: string): Promise<Record<string, unknown>> {
    try {
      const module = await import("zod-to-json-schema");
      if (typeof module.zodToJsonSchema !== "function") {
        throw new Error("zodToJsonSchema export not found");
      }

      return module.zodToJsonSchema(schema, { name }) as Record<string, unknown>;
    } catch (error) {
      throw new OpenRouterError(
        "Failed to convert Zod schema to JSON schema. Install 'zod-to-json-schema' or provide a JSON schema manually.",
        {
          statusCode: 500,
          code: "zod_to_json_schema_error",
          originalError: error,
        }
      );
    }
  }

  private parseStructuredData<T>(
    rawContent: string,
    schema: ZodTypeAny | OpenRouterJsonSchemaDefinition,
    options: { requestId?: string; validator?: (payload: unknown) => T }
  ): T {
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawContent);
    } catch (error) {
      throw new OpenRouterError("Model returned invalid JSON payload", {
        statusCode: 502,
        code: "invalid_json",
        requestId: options.requestId,
        originalError: error,
      });
    }

    if (this.isZodSchema(schema)) {
      const validation = schema.safeParse(parsed);
      if (!validation.success) {
        throw new OpenRouterError("Structured response validation failed", {
          statusCode: 502,
          code: "invalid_schema",
          requestId: options.requestId,
          originalError: validation.error,
        });
      }

      return validation.data as T;
    }

    if (typeof options.validator === "function") {
      try {
        return options.validator(parsed);
      } catch (error) {
        throw new OpenRouterError("Structured response validator rejected payload", {
          statusCode: 502,
          code: "validator_error",
          requestId: options.requestId,
          originalError: error,
        });
      }
    }

    throw new OpenRouterError(
      "Structured completion requires either a Zod schema or a validator function when using plain JSON schema.",
      {
        statusCode: 500,
        code: "missing_validator",
        requestId: options.requestId,
      }
    );
  }

  private async request<T>(payload: Record<string, unknown>, options: RequestOptions & { stream?: false }): Promise<T>;
  private async request(
    payload: Record<string, unknown>,
    options: RequestOptions & { stream: true }
  ): Promise<ReadableStream<Uint8Array>>;
  private async request<T>(
    payload: Record<string, unknown>,
    options: RequestOptions
  ): Promise<T | ReadableStream<Uint8Array>> {
    const url = `${this.baseUrl}${CHAT_COMPLETIONS_PATH}`;
    const maxAttempts = this.maxRetries + 1;
    let attempt = 0;
    let lastError: OpenRouterError | null = null;

    while (attempt < maxAttempts) {
      const attemptRequestId = options.requestId ?? randomUUID();

      try {
        const response = await this.withTimeout(
          (signal) =>
            this.fetchImpl(url, {
              method: "POST",
              headers: this.buildHeaders(options.headers, attemptRequestId),
              body: JSON.stringify(payload),
              signal,
            }),
          options.timeoutMs ?? this.timeoutMs,
          attemptRequestId
        );

        const responseRequestId = response.headers.get("x-request-id") ?? attemptRequestId;

        if (!response.ok) {
          const error = await this.createHttpError(response, responseRequestId);
          if (this.shouldRetry(error.statusCode) && attempt < maxAttempts - 1) {
            lastError = error;
            await this.delay(this.computeBackoff(attempt));
            attempt += 1;
            continue;
          }

          throw error;
        }

        if (options.stream) {
          const stream = response.body;
          if (!stream || typeof (stream as ReadableStream<Uint8Array>).getReader !== "function") {
            throw new OpenRouterError("OpenRouter stream response is empty", {
              statusCode: 502,
              requestId: responseRequestId,
            });
          }

          return stream as ReadableStream<Uint8Array>;
        }

        try {
          const json = (await response.json()) as T;
          return json;
        } catch (error) {
          throw new OpenRouterError("Failed to parse OpenRouter response payload", {
            statusCode: 502,
            requestId: responseRequestId,
            originalError: error,
          });
        }
      } catch (error) {
        const normalizedError =
          error instanceof OpenRouterError ? error : this.toOpenRouterError(error, attemptRequestId);

        if (this.shouldRetry(normalizedError.statusCode) && attempt < maxAttempts - 1) {
          lastError = normalizedError;
          await this.delay(this.computeBackoff(attempt));
          attempt += 1;
          continue;
        }

        throw normalizedError;
      }
    }

    throw lastError ?? new OpenRouterError("OpenRouter request failed", { statusCode: 500 });
  }

  private buildHeaders(overrides: Record<string, string> | undefined, requestId: string): Headers {
    if (!this.apiKey) {
      throw new OpenRouterError("Missing OpenRouter API key", {
        statusCode: 401,
        code: "missing_api_key",
      });
    }

    const headers = new Headers({
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      ...this.staticHeaders,
      ...(overrides ?? {}),
    });

    headers.set("X-Request-Id", requestId);

    return headers;
  }

  private async withTimeout<T>(
    action: (signal: AbortSignal) => Promise<T>,
    timeoutMs: number,
    requestId: string
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await action(controller.signal);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new OpenRouterError(`OpenRouter request exceeded timeout of ${timeoutMs}ms`, {
          statusCode: 504,
          code: "timeout",
          requestId,
          originalError: error,
        });
      }

      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  private async createHttpError(response: Response, requestId?: string): Promise<OpenRouterError> {
    const status = response.status;
    let payload: OpenRouterErrorPayload | undefined;
    let message = `OpenRouter request failed with status ${status}`;
    let code: string | undefined;

    try {
      const text = await response.text();
      if (text) {
        payload = JSON.parse(text) as OpenRouterErrorPayload;
        const errorInfo = payload.error;

        if (errorInfo?.message) {
          message = errorInfo.message;
        } else if (payload.message) {
          message = payload.message;
        }

        if (errorInfo?.code) {
          code = String(errorInfo.code);
        }
      }
    } catch {
      payload = undefined;
    }

    return new OpenRouterError(message, {
      statusCode: status,
      code,
      requestId,
      originalError: payload,
    });
  }

  private toOpenRouterError(error: unknown, requestId?: string): OpenRouterError {
    if (error instanceof OpenRouterError) {
      return error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      return new OpenRouterError("OpenRouter request was aborted", {
        statusCode: 499,
        code: "abort",
        requestId,
        originalError: error,
      });
    }

    if (error instanceof TypeError) {
      return new OpenRouterError("Network error while contacting OpenRouter", {
        statusCode: 503,
        code: "network_error",
        requestId,
        originalError: error,
      });
    }

    return new OpenRouterError("Unexpected error during OpenRouter request", {
      statusCode: 500,
      requestId,
      originalError: error,
    });
  }

  private normalizeCompletion(
    response: OpenRouterChatCompletionResponse,
    fallbackModel: string,
    requestId: string
  ): AIResponse {
    const primaryChoice = response.choices?.[0];
    const content = primaryChoice?.message?.content ?? primaryChoice?.delta?.content ?? "";
    const model = response.model ?? fallbackModel;

    return {
      content,
      model,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      provider: this.extractProvider(response.provider),
      requestId: response.id ?? requestId,
      raw: response,
    };
  }

  private extractProvider(provider: OpenRouterChatCompletionResponse["provider"]): string | undefined {
    if (!provider) {
      return undefined;
    }

    if (typeof provider === "string") {
      return provider;
    }

    if (typeof provider === "object" && "name" in provider && typeof provider.name === "string") {
      return provider.name;
    }

    return undefined;
  }

  private validateMessages(messages: OpenRouterMessage[]): void {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new OpenRouterError("OpenRouter chat completion requires at least one message", {
        statusCode: 400,
      });
    }

    messages.forEach((message, index) => {
      if (typeof message.content !== "string" || !message.content.trim()) {
        throw new OpenRouterError(`Message at index ${index} must contain non-empty string content`, {
          statusCode: 400,
        });
      }

      if (!ALLOWED_ROLES.includes(message.role)) {
        throw new OpenRouterError(`Message at index ${index} has an invalid role`, {
          statusCode: 400,
        });
      }
    });
  }

  private isZodSchema(value: unknown): value is ZodTypeAny {
    return (
      typeof value === "object" &&
      value !== null &&
      "safeParse" in value &&
      typeof (value as ZodTypeAny).safeParse === "function"
    );
  }

  private isJsonSchemaWrapper(
    value: unknown
  ): value is { schema: Record<string, unknown>; name?: string; strict?: boolean } {
    return (
      typeof value === "object" &&
      value !== null &&
      "schema" in value &&
      typeof (value as { schema?: unknown }).schema === "object" &&
      (value as { schema?: unknown }).schema !== null
    );
  }

  private shouldRetry(statusCode?: number): boolean {
    if (statusCode === undefined) {
      return true;
    }

    if (statusCode === 408 || statusCode === 429) {
      return true;
    }

    if (statusCode >= 500 && statusCode < 600) {
      return true;
    }

    return false;
  }

  private computeBackoff(attempt: number): number {
    return Math.min(5_000, BASE_BACKOFF_MS * 2 ** attempt);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

let openRouterServiceInstance: OpenRouterService | null = null;

export function getOpenRouterService(): OpenRouterService {
  if (!openRouterServiceInstance) {
    openRouterServiceInstance = new OpenRouterService();
  }

  return openRouterServiceInstance;
}

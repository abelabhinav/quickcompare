import { ProviderIntegrationError } from "./integrationErrors.js";
import type { ProviderIntegrationConfig } from "./integrationConfig.js";

export type IntegrationHttpClientOptions = {
  config: ProviderIntegrationConfig;
  defaultHeaders?: Record<string, string>;
  fetchImpl?: typeof fetch;
  log?: (context: {
    providerSlug: string;
    code: string;
    status?: number;
    attempt: number;
  }) => void;
};

type RequestOptions = {
  path: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyStatus(status: number, providerSlug: string) {
  if (status === 401 || status === 403) {
    return new ProviderIntegrationError({
      code: "authentication_failure",
      message: "Provider authentication failed",
      providerSlug,
      status,
      retryable: false,
    });
  }

  if (status === 429) {
    return new ProviderIntegrationError({
      code: "rate_limit",
      message: "Provider rate limit reached",
      providerSlug,
      status,
      retryable: true,
    });
  }

  if (status >= 500) {
    return new ProviderIntegrationError({
      code: "provider_unavailable",
      message: "Provider is unavailable",
      providerSlug,
      status,
      retryable: true,
    });
  }

  return new ProviderIntegrationError({
    code: "invalid_request",
    message: "Provider rejected the request",
    providerSlug,
    status,
    retryable: false,
  });
}

function getRetryAfterMs(response: Response): number | undefined {
  const value = response.headers.get("retry-after");
  if (!value) {
    return undefined;
  }

  const seconds = Number.parseInt(value, 10);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : undefined;
}

export class IntegrationHttpClient {
  private readonly config: ProviderIntegrationConfig;
  private readonly defaultHeaders: Record<string, string>;
  private readonly fetchImpl: typeof fetch;
  private readonly log?: IntegrationHttpClientOptions["log"];

  constructor(options: IntegrationHttpClientOptions) {
    this.config = options.config;
    this.defaultHeaders = options.defaultHeaders ?? {};
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.log = options.log;
  }

  async requestJson<T>(options: RequestOptions): Promise<T> {
    if (!this.config.enabled) {
      throw new ProviderIntegrationError({
        code: "disabled",
        message: "Provider integration is disabled",
        providerSlug: this.config.slug,
      });
    }

    if (!this.config.baseUrl) {
      throw new ProviderIntegrationError({
        code: "provider_unavailable",
        message: "Provider integration base URL is not configured",
        providerSlug: this.config.slug,
      });
    }

    const maxAttempts = this.config.retry.retries + 1;
    let lastError: ProviderIntegrationError | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

      try {
        const response = await this.fetchImpl(
          new URL(options.path, this.config.baseUrl),
          {
            method: options.method ?? "GET",
            headers: {
              Accept: "application/json",
              ...this.defaultHeaders,
              ...options.headers,
            },
            body:
              options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          const error = classifyStatus(response.status, this.config.slug);
          lastError = error;
          this.log?.({
            providerSlug: this.config.slug,
            code: error.code,
            status: error.status,
            attempt,
          });

          if (!error.retryable || attempt === maxAttempts) {
            throw error;
          }

          await delay(getRetryAfterMs(response) ?? this.config.retry.retryDelayMs);
          continue;
        }

        return (await response.json()) as T;
      } catch (error) {
        const providerError =
          error instanceof ProviderIntegrationError
            ? error
            : new ProviderIntegrationError({
                code:
                  error instanceof DOMException && error.name === "AbortError"
                    ? "timeout"
                    : "network_failure",
                message:
                  error instanceof DOMException && error.name === "AbortError"
                    ? "Provider request timed out"
                    : "Provider network request failed",
                providerSlug: this.config.slug,
                retryable: true,
              });

        lastError = providerError;
        this.log?.({
          providerSlug: this.config.slug,
          code: providerError.code,
          status: providerError.status,
          attempt,
        });

        if (!providerError.retryable || attempt === maxAttempts) {
          throw providerError;
        }

        await delay(this.config.retry.retryDelayMs);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError;
  }
}

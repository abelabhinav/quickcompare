import { describe, expect, it, vi } from "vitest";
import { IntegrationHttpClient } from "./integrationClient.js";
import { ProviderIntegrationError } from "./integrationErrors.js";
import {
  assertIntegrationReady,
  getProviderIntegrationConfig,
  type ProviderIntegrationConfig,
} from "./integrationConfig.js";

function makeConfig(
  overrides: Partial<ProviderIntegrationConfig> = {},
): ProviderIntegrationConfig {
  return {
    slug: "test-provider",
    enabled: true,
    baseUrl: "https://provider.example",
    timeoutMs: 50,
    retry: {
      retries: 0,
      retryDelayMs: 0,
    },
    ...overrides,
  };
}

function jsonResponse(
  status: number,
  body: unknown,
  headers?: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

describe("IntegrationHttpClient", () => {
  it("performs a successful JSON request with configured headers", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { ok: true }));
    const client = new IntegrationHttpClient({
      config: makeConfig(),
      defaultHeaders: { "x-provider": "test" },
      fetchImpl,
    });

    await expect(client.requestJson({ path: "/search" })).resolves.toEqual({
      ok: true,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("/search", "https://provider.example"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "x-provider": "test" }),
      }),
    );
  });

  it("times out slow provider requests", async () => {
    const fetchImpl = vi.fn(
      (_input: unknown, init?: { signal?: AbortSignal }) =>
        new Promise<Response>((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new DOMException("The operation was aborted.", "AbortError"));
            return;
          }
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }),
    ) as unknown as typeof fetch;
    const client = new IntegrationHttpClient({
      config: makeConfig({ timeoutMs: 1 }),
      fetchImpl,
    });

    await expect(client.requestJson({ path: "/slow" })).rejects.toMatchObject({
      code: "timeout",
      retryable: true,
    });
  });

  it("retries transient provider failures conservatively", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, { error: "busy" }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    const client = new IntegrationHttpClient({
      config: makeConfig({ retry: { retries: 1, retryDelayMs: 0 } }),
      fetchImpl,
    });

    await expect(client.requestJson({ path: "/search" })).resolves.toEqual({
      ok: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry authentication failures", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(401, { error: "nope" }));
    const client = new IntegrationHttpClient({
      config: makeConfig({ retry: { retries: 2, retryDelayMs: 0 } }),
      fetchImpl,
    });

    await expect(client.requestJson({ path: "/search" })).rejects.toMatchObject({
      code: "authentication_failure",
      retryable: false,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("classifies rate limits as retryable provider errors", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse(429, { error: "limited" }, { "retry-after": "0" }),
    );
    const client = new IntegrationHttpClient({
      config: makeConfig(),
      fetchImpl,
    });

    await expect(client.requestJson({ path: "/search" })).rejects.toMatchObject({
      code: "rate_limit",
      status: 429,
      retryable: true,
    });
  });

  it("blocks requests when a provider integration is disabled", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { ok: true }));
    const client = new IntegrationHttpClient({
      config: makeConfig({ enabled: false }),
      fetchImpl,
    });

    await expect(client.requestJson({ path: "/search" })).rejects.toMatchObject({
      code: "disabled",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("logs safe failure context without credentials", async () => {
    const log = vi.fn();
    const fetchImpl = vi.fn(async () => jsonResponse(503, { error: "busy" }));
    const client = new IntegrationHttpClient({
      config: makeConfig(),
      defaultHeaders: { authorization: "Bearer secret" },
      fetchImpl,
      log,
    });

    await expect(client.requestJson({ path: "/search" })).rejects.toBeInstanceOf(
      ProviderIntegrationError,
    );
    expect(log).toHaveBeenCalledWith({
      providerSlug: "test-provider",
      code: "provider_unavailable",
      status: 503,
      attempt: 1,
    });
  });
});

describe("provider integration config", () => {
  it("reads provider config from environment variables", () => {
    expect(
      getProviderIntegrationConfig("fresh-cart", {
        PROVIDER_FRESH_CART_ENABLED: "true",
        PROVIDER_FRESH_CART_BASE_URL: "https://fresh.example",
        PROVIDER_FRESH_CART_API_KEY: "env-secret",
        PROVIDER_FRESH_CART_TIMEOUT_MS: "2000",
        PROVIDER_FRESH_CART_RETRIES: "2",
        PROVIDER_FRESH_CART_RETRY_DELAY_MS: "25",
      }),
    ).toEqual({
      slug: "fresh-cart",
      enabled: true,
      baseUrl: "https://fresh.example",
      timeoutMs: 2000,
      retry: { retries: 2, retryDelayMs: 25 },
      apiKey: "env-secret",
    });
  });

  it("fails safely when credentials are required but missing", () => {
    expect(() =>
      assertIntegrationReady(makeConfig(), { requireApiKey: true }),
    ).toThrow(ProviderIntegrationError);
  });
});

import { z } from "zod";
import { ProviderIntegrationError } from "./integrationErrors.js";

export type RetryConfig = {
  retries: number;
  retryDelayMs: number;
};

export type ProviderIntegrationConfig = {
  slug: string;
  enabled: boolean;
  baseUrl?: string;
  timeoutMs: number;
  retry: RetryConfig;
  apiKey?: string;
};

const booleanEnvSchema = z
  .string()
  .optional()
  .transform((value) => value === "true");

const integerEnvSchema = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (value === undefined || value.trim() === "") {
        return fallback;
      }

      const parsed = Number.parseInt(value, 10);
      return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
    });

const envSchema = z.object({
  PROVIDER_INTEGRATIONS_ENABLED: booleanEnvSchema,
  PROVIDER_DEFAULT_TIMEOUT_MS: integerEnvSchema(3000),
  PROVIDER_DEFAULT_RETRIES: integerEnvSchema(1),
  PROVIDER_DEFAULT_RETRY_DELAY_MS: integerEnvSchema(150),
});

function readEnv(env: NodeJS.ProcessEnv) {
  return envSchema.parse(env);
}

function keyFor(slug: string, suffix: string): string {
  return `PROVIDER_${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${suffix}`;
}

export function getProviderIntegrationConfig(
  slug: string,
  env: NodeJS.ProcessEnv = process.env,
): ProviderIntegrationConfig {
  const defaults = readEnv(env);
  const enabled =
    env[keyFor(slug, "ENABLED")] === "true" ||
    defaults.PROVIDER_INTEGRATIONS_ENABLED;
  const baseUrl = env[keyFor(slug, "BASE_URL")]?.trim() || undefined;
  const apiKey = env[keyFor(slug, "API_KEY")]?.trim() || undefined;
  const timeoutMs = Number.parseInt(
    env[keyFor(slug, "TIMEOUT_MS")] ?? "",
    10,
  );
  const retries = Number.parseInt(env[keyFor(slug, "RETRIES")] ?? "", 10);
  const retryDelayMs = Number.parseInt(
    env[keyFor(slug, "RETRY_DELAY_MS")] ?? "",
    10,
  );

  return {
    slug,
    enabled,
    baseUrl,
    timeoutMs:
      Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : defaults.PROVIDER_DEFAULT_TIMEOUT_MS,
    retry: {
      retries:
        Number.isFinite(retries) && retries >= 0
          ? retries
          : defaults.PROVIDER_DEFAULT_RETRIES,
      retryDelayMs:
        Number.isFinite(retryDelayMs) && retryDelayMs >= 0
          ? retryDelayMs
          : defaults.PROVIDER_DEFAULT_RETRY_DELAY_MS,
    },
    apiKey,
  };
}

export function assertIntegrationReady(
  config: ProviderIntegrationConfig,
  options: { requireApiKey?: boolean } = {},
) {
  if (!config.enabled) {
    throw new ProviderIntegrationError({
      code: "disabled",
      message: `Provider integration '${config.slug}' is disabled`,
      providerSlug: config.slug,
    });
  }

  if (!config.baseUrl) {
    throw new ProviderIntegrationError({
      code: "provider_unavailable",
      message: `Provider integration '${config.slug}' is missing a base URL`,
      providerSlug: config.slug,
      retryable: false,
    });
  }

  if (options.requireApiKey && !config.apiKey) {
    throw new ProviderIntegrationError({
      code: "missing_credentials",
      message: `Provider integration '${config.slug}' is missing credentials`,
      providerSlug: config.slug,
    });
  }
}

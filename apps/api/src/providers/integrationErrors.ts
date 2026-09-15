export type ProviderIntegrationErrorCode =
  | "timeout"
  | "network_failure"
  | "authentication_failure"
  | "rate_limit"
  | "invalid_request"
  | "invalid_response"
  | "provider_unavailable"
  | "disabled"
  | "missing_credentials";

export class ProviderIntegrationError extends Error {
  readonly code: ProviderIntegrationErrorCode;
  readonly providerSlug?: string;
  readonly status?: number;
  readonly retryable: boolean;

  constructor({
    code,
    message,
    providerSlug,
    status,
    retryable = false,
  }: {
    code: ProviderIntegrationErrorCode;
    message: string;
    providerSlug?: string;
    status?: number;
    retryable?: boolean;
  }) {
    super(message);
    this.name = "ProviderIntegrationError";
    this.code = code;
    this.providerSlug = providerSlug;
    this.status = status;
    this.retryable = retryable;
  }
}

export function isProviderIntegrationError(
  error: unknown,
): error is ProviderIntegrationError {
  return error instanceof ProviderIntegrationError;
}

import { AxiosError } from 'axios';

/**
 * Normalized API error. Carries only safe-to-display information — never the
 * request headers (which contain the API key) or the raw axios config.
 */
export class ApiError extends Error {
  readonly status?: number;
  readonly detail?: string;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Formats any error for display, appending the API's own error message when
 * available (e.g. `Elastic Email API returned HTTP 400. (Missing scopeType)`).
 */
export function formatApiError(err: unknown): string {
  if (err instanceof ApiError) {
    return err.detail ? `${err.message} (${err.detail})` : err.message;
  }
  return err instanceof Error ? err.message : String(err);
}

/** Best-effort extraction of a human message from an Elastic Email error body. */
function extractApiMessage(data: unknown): string | undefined {
  if (typeof data === 'string' && data.trim().length > 0) return data.trim();
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const candidate = obj.Error ?? obj.error ?? obj.message ?? obj.Message;
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return undefined;
}

/**
 * Converts any thrown value from an axios call into a clean {@link ApiError}.
 * Deliberately avoids surfacing request headers/config so the API key is never
 * leaked into logs or error output.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;

  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const apiMessage = extractApiMessage(err.response?.data);

    if (status === 401 || status === 403) {
      return new ApiError(
        'Authentication failed — the API key was rejected (HTTP ' + status + ').',
        status,
        apiMessage,
      );
    }
    if (status) {
      return new ApiError(`Elastic Email API returned HTTP ${status}.`, status, apiMessage);
    }
    // Network-level failure (DNS, timeout, connection refused, ...).
    return new ApiError(`Request to Elastic Email failed: ${err.code ?? err.message}`);
  }

  if (err instanceof Error) {
    return new ApiError(err.message);
  }
  return new ApiError('Unknown error while contacting Elastic Email.');
}

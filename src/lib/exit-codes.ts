/**
 * Stable process exit codes used across all commands so scripts/CI can branch
 * on the failure category.
 */
export const ExitCode = {
  /** Command completed successfully. */
  Success: 0,
  /** Catch-all for unexpected errors. */
  General: 1,
  /** No API key could be resolved from flag, env, or config. */
  MissingApiKey: 2,
  /** User input failed validation (bad email, missing subject, ...). */
  InvalidInput: 3,
  /** Elastic Email API returned an error (non-2xx) or the request failed. */
  ApiError: 4,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

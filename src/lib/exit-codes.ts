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
  /** A destructive command was blocked: no --yes and nobody to confirm. Stop and escalate, do not retry. */
  ConfirmationRequired: 5,
  /** Interrupted by the user: Ctrl+C at a prompt, or SIGINT (128 + 2, shell convention). */
  Interrupted: 130,
  /** Terminated by SIGTERM, e.g. a CI timeout or process manager (128 + 15). */
  Terminated: 143,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];

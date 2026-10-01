import { maskApiKey } from '../config/api-key.js';
import { ExitCode } from './exit-codes.js';

/**
 * Stable machine-readable names for exit codes, emitted as `error.code` in
 * `--json` mode. Public contract, like the numbers themselves: never rename.
 */
export const ERROR_CODE_NAMES: Record<number, string> = {
  [ExitCode.General]: 'general',
  [ExitCode.MissingApiKey]: 'missing_api_key',
  [ExitCode.InvalidInput]: 'invalid_input',
  [ExitCode.ApiError]: 'api_error',
  [ExitCode.ConfirmationRequired]: 'confirmation_required',
  [ExitCode.Interrupted]: 'interrupted',
  [ExitCode.Terminated]: 'terminated',
};

/** True for exit codes that mean "stopped from outside", not "failed". */
export function isSignalExit(exitCode: number): boolean {
  return exitCode === ExitCode.Interrupted || exitCode === ExitCode.Terminated;
}

/**
 * Thrown when an interactive prompt is aborted with Ctrl+C. Ink puts the
 * terminal in raw mode, so Ctrl+C never becomes a SIGINT there — the prompt
 * has to report the interruption itself.
 */
export class InterruptedError extends Error {
  readonly oclif = { exit: ExitCode.Interrupted };
  constructor(message = 'Interrupted.') {
    super(message);
    this.name = 'InterruptedError';
  }
}

export interface ErrorPayload {
  error: { code: string; exitCode: number; message: string };
}

interface OclifLikeError {
  message?: unknown;
  oclif?: { exit?: unknown };
  parse?: unknown;
}

/**
 * Exit code for any thrown value. oclif's own flag/argument parse errors
 * default to exit 2, which collides with MissingApiKey — they are bad input,
 * so they are classified as InvalidInput.
 */
export function resolveExitCode(err: unknown): number {
  const e = (err ?? {}) as OclifLikeError;
  if (e.parse) return ExitCode.InvalidInput;
  const exit = e.oclif?.exit;
  return typeof exit === 'number' ? exit : ExitCode.General;
}

/** Value of `--api-key <v>` or `--api-key=<v>` in raw argv, even if parsing failed. */
export function apiKeyFromArgv(argv: readonly string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--api-key') return argv[i + 1];
    if (argv[i].startsWith('--api-key=')) return argv[i].slice('--api-key='.length);
  }
  return undefined;
}

/** Replaces every occurrence of a known secret with its masked form. */
export function redactSecrets(text: string, secrets: ReadonlyArray<string | undefined>): string {
  let out = text;
  for (const secret of secrets) {
    if (secret && secret.length >= 8) out = out.split(secret).join(maskApiKey(secret));
  }
  return out;
}

/**
 * Builds the `--json` error body. Deliberately a small, explicit shape: the
 * oclif default serializes the whole error object, including the parser's
 * full argv and config (which can contain the --api-key value).
 */
export function toErrorPayload(
  err: unknown,
  secrets: ReadonlyArray<string | undefined> = [],
): ErrorPayload {
  const exitCode = resolveExitCode(err);
  const rawMessage =
    typeof (err as OclifLikeError)?.message === 'string'
      ? ((err as OclifLikeError).message as string)
      : String(err);
  return {
    error: {
      code: ERROR_CODE_NAMES[exitCode] ?? 'general',
      exitCode,
      message: redactSecrets(rawMessage, secrets),
    },
  };
}

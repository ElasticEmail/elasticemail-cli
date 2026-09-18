import { Flags } from '@oclif/core';

/**
 * What a destructive command should do about confirmation.
 *  - `proceed`: the user passed --yes
 *  - `prompt`:  a human is present, ask them
 *  - `refuse`:  nobody can answer and no --yes was given
 */
export type ConfirmDecision = 'proceed' | 'prompt' | 'refuse';

export interface ConfirmContext {
  yes: boolean;
  stdinIsTty: boolean;
  stdoutIsTty: boolean;
  json: boolean;
}

/**
 * Pure decision used by every destructive command.
 *
 * Both streams must be a TTY to prompt: stdout so the question renders, and
 * stdin so the answer comes from a human. Checking stdout alone would let
 * `echo | elastic-email contacts delete x` feed "y" from the pipe and
 * silently self-confirm.
 */
export function decideConfirmation(ctx: ConfirmContext): ConfirmDecision {
  if (ctx.yes) return 'proceed';
  if (ctx.stdinIsTty && ctx.stdoutIsTty && !ctx.json) return 'prompt';
  return 'refuse';
}

export interface ConfirmRequest {
  /** Lowercase action phrase, e.g. `delete contact jane@example.com`. */
  action: string;
  /** Consequence shown after the question. Defaults to a generic warning. */
  warning?: string;
}

const DEFAULT_WARNING = 'This cannot be undone.';

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Question shown to a human, e.g. `Delete contact x@y.com? This cannot be undone.` */
export function confirmQuestion(req: ConfirmRequest): string {
  return `${capitalize(req.action)}? ${req.warning ?? DEFAULT_WARNING}`;
}

/** Error shown when nobody can be asked and --yes was not given. */
export function refusalMessage(req: ConfirmRequest): string {
  return (
    `Refusing to ${req.action} without confirmation — not an interactive terminal. ` +
    'Pass --yes to confirm.'
  );
}

/** Spread into the `flags` of every destructive command. */
export const confirmFlags = {
  yes: Flags.boolean({
    char: 'y',
    summary: 'Skip the confirmation prompt. Required when running non-interactively.',
    default: false,
  }),
};

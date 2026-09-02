import chalk from 'chalk';
import figlet from 'figlet';

export interface BannerOptions {
  /** Whether the current stdout is an interactive terminal. */
  isTty: boolean;
  /** Whether the command is running in JSON-output mode. */
  json: boolean;
}

/**
 * The banner must only ever be shown on a real TTY and never in `--json` mode,
 * so piped/redirected/CI output stays clean and machine-parseable.
 */
export function shouldShowBanner({ isTty, json }: BannerOptions): boolean {
  return isTty && !json;
}

/** Builds the colored ASCII banner string (without printing it). */
export function renderBanner(): string {
  const ascii = figlet.textSync('Elastic Email', {
    font: 'Big',
    horizontalLayout: 'default',
    verticalLayout: 'default',
  });
  return chalk.cyanBright(ascii);
}

/**
 * Prints the ASCII banner to stdout, but only when the guard conditions are
 * satisfied. Returns true when the banner was actually printed (useful for
 * tests and for callers that want to know whether anything was emitted).
 */
export function printBanner(
  options: BannerOptions = { isTty: Boolean(process.stdout.isTTY), json: false },
): boolean {
  if (!shouldShowBanner(options)) return false;
  console.log(renderBanner());
  return true;
}

import { Command, Flags, type Interfaces } from '@oclif/core';
import { ElasticEmailClient, createClient } from '../api/client.js';
import { ApiError, formatApiError } from '../api/errors.js';
import { resolveApiKey, type ApiKeySource } from '../config/api-key.js';
import { printBanner } from '../banner.js';
import { ExitCode } from './exit-codes.js';

export type BaseFlags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof BaseCommand)['baseFlags'] & T['flags']
>;
export type BaseArgs<T extends typeof Command> = Interfaces.InferredArgs<T['args']>;

/**
 * Shared base for every command. Provides:
 *  - the global `--api-key` override flag and oclif's `--json` flag,
 *  - API key resolution + client construction with a clean missing-key error,
 *  - a banner helper that respects the TTY / `--json` guard,
 *  - consistent mapping of {@link ApiError} to process exit codes.
 */
export abstract class BaseCommand<T extends typeof Command> extends Command {
  // Enables oclif's built-in `--json` flag and JSON output handling.
  static override enableJsonFlag = true;

  static override baseFlags = {
    'api-key': Flags.string({
      // Resolution order (flag > env > config) is handled explicitly in
      // resolveApiKey, so we intentionally do NOT wire oclif's `env` here.
      summary: 'Elastic Email API key (overrides env var and saved config).',
      helpValue: '<key>',
    }),
  };

  protected flags!: BaseFlags<T>;
  protected args!: BaseArgs<T>;

  public override async init(): Promise<void> {
    await super.init();
    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      args: this.ctor.args,
      strict: this.ctor.strict,
    });
    this.flags = flags as BaseFlags<T>;
    this.args = args as BaseArgs<T>;
  }

  /** True when stdout is an interactive terminal. */
  protected get isTty(): boolean {
    return Boolean(process.stdout.isTTY);
  }

  /** True when Ink / banner / decorations are allowed (TTY and not `--json`). */
  protected get interactive(): boolean {
    return this.isTty && !this.jsonEnabled();
  }

  /** Prints the ASCII banner when allowed (TTY and not `--json`). */
  protected showBanner(): void {
    printBanner({ isTty: this.isTty, json: this.jsonEnabled() });
  }

  /**
   * Resolves the API key (flag > env > config) and returns a ready client.
   * Exits with {@link ExitCode.MissingApiKey} and a helpful message if none.
   */
  protected requireClient(): { client: ElasticEmailClient; source: ApiKeySource; key: string } {
    const flagValue = (this.flags as Record<string, unknown>)['api-key'] as string | undefined;
    const resolved = resolveApiKey(flagValue);
    if (!resolved.key) {
      this.error(
        `No API key found. Provide --api-key, set ELASTIC_EMAIL_API_KEY, or run \`${this.config.bin} auth set-key\`.`,
        { exit: ExitCode.MissingApiKey },
      );
    }
    return {
      client: createClient(resolved.key),
      source: resolved.source,
      key: resolved.key,
    };
  }

  /** Maps an unknown error to a clean message + exit code. Never leaks the key. */
  protected fail(err: unknown): never {
    if (err instanceof ApiError) {
      this.error(formatApiError(err), { exit: ExitCode.ApiError });
    }
    this.error(formatApiError(err), { exit: ExitCode.General });
  }
}

import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { getConfigPath, updateConfig } from '../../config/config.js';
import { maskApiKey } from '../../config/api-key.js';
import { createClient } from '../../api/client.js';
import { formatApiError } from '../../api/errors.js';
import { promptApiKey } from '../../ui/ApiKeyForm.js';

interface SetKeyResult {
  saved: boolean;
  source: 'config';
  path: string;
  keyMasked: string;
  defaultFrom?: string;
  connection?: { ok: boolean; message?: string };
}

export default class AuthSetKey extends BaseCommand<typeof AuthSetKey> {
  static override summary = 'Store your Elastic Email API key in the local config file.';
  static override description =
    'Saves the key to ~/.elastic-email-cli/config.json with 0600 permissions. ' +
    'Pass the key as an argument (or --api-key) for non-interactive use, or run without it on a TTY for an interactive prompt.';

  static override examples = [
    '<%= config.bin %> auth set-key',
    '<%= config.bin %> auth set-key <key>',
    '<%= config.bin %> auth set-key <key> --default-from sender@example.com --json',
  ];

  static override args = {
    key: Args.string({
      description: 'The API key to store (alternative to --api-key).',
      required: false,
    }),
  };

  static override flags = {
    'default-from': Flags.string({
      summary: 'Default sender address to use when `emails send --from` is omitted.',
      helpValue: '<email>',
    }),
    'skip-test': Flags.boolean({
      summary: 'Do not verify the key against the API after saving.',
      default: false,
    }),
  };

  async run(): Promise<SetKeyResult> {
    let key =
      (this.args as { key?: string }).key ??
      ((this.flags as Record<string, unknown>)['api-key'] as string | undefined);
    key = key?.trim();

    if (!key) {
      if (!this.interactive) {
        this.error('No API key provided. Pass it as an argument (`auth set-key <key>`) when running non-interactively.', {
          exit: ExitCode.InvalidInput,
        });
      }
      this.showBanner();
      const entered = await promptApiKey();
      if (!entered) {
        this.error('Cancelled — no key was saved.', { exit: ExitCode.InvalidInput });
      }
      key = entered;
    }

    const defaultFrom = this.flags['default-from'];
    updateConfig({ apiKey: key, ...(defaultFrom ? { defaultFrom } : {}) });

    const result: SetKeyResult = {
      saved: true,
      source: 'config',
      path: getConfigPath(),
      keyMasked: maskApiKey(key),
      ...(defaultFrom ? { defaultFrom } : {}),
    };

    if (!this.flags['skip-test']) {
      try {
        await createClient(key).testConnection();
        result.connection = { ok: true };
      } catch (err) {
        result.connection = { ok: false, message: formatApiError(err) };
      }
    }

    if (this.jsonEnabled()) {
      return result;
    }

    this.log(`API key saved to ${result.path} (mode 0600).`);
    this.log(`Stored key: ${result.keyMasked}`);
    if (defaultFrom) this.log(`Default sender: ${defaultFrom}`);
    if (result.connection) {
      this.log(
        result.connection.ok
          ? '✓ Connection test succeeded — the key works.'
          : `✗ Connection test failed: ${result.connection.message}`,
      );
    }
    this.log('');
    this.warn('This file contains a secret. Keep it private and do not commit it.');

    return result;
  }
}

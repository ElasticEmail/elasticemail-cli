import { BaseCommand } from '../../lib/base-command.js';
import { clearConfig, getConfigPath } from '../../config/config.js';

interface ClearResult {
  cleared: boolean;
  path: string;
}

export default class AuthClear extends BaseCommand<typeof AuthClear> {
  static override summary = 'Remove the locally stored configuration (API key + defaults).';
  static override description =
    'Deletes ~/.elastic-email-cli/config.json. Does NOT touch the ELASTIC_EMAIL_API_KEY ' +
    'environment variable — unset that in your shell separately if needed.';

  static override examples = ['<%= config.bin %> auth clear', '<%= config.bin %> auth clear --json'];

  async run(): Promise<ClearResult> {
    const path = getConfigPath();
    const cleared = clearConfig();
    const result: ClearResult = { cleared, path };

    if (this.jsonEnabled()) {
      return result;
    }

    this.log(
      cleared
        ? `Removed local configuration at ${path}.`
        : `Nothing to remove — no config file at ${path}.`,
    );
    return result;
  }
}

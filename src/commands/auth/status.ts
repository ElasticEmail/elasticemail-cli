import { BaseCommand } from '../../lib/base-command.js';
import {
  API_KEY_ENV_VAR,
  maskApiKey,
  resolveApiKey,
  type ApiKeySource,
} from '../../config/api-key.js';
import { getConfigPath } from '../../config/config.js';
import { createClient } from '../../api/client.js';
import { formatApiError } from '../../api/errors.js';

interface StatusResult {
  hasKey: boolean;
  source: ApiKeySource;
  keyMasked?: string;
  configPath: string;
  envVar: string;
  envVarSet: boolean;
  connection?: { ok: boolean; message?: string };
}

export default class AuthStatus extends BaseCommand<typeof AuthStatus> {
  static override summary = 'Show where the API key comes from and test the connection.';
  static override description =
    'Reports the resolved key source (flag, env, or config), masks the key, and ' +
    'performs a lightweight live request to confirm the key is accepted.';

  static override examples = ['<%= config.bin %> auth status', '<%= config.bin %> auth status --json'];

  async run(): Promise<StatusResult> {
    const flagValue = (this.flags as Record<string, unknown>)['api-key'] as string | undefined;
    const resolved = resolveApiKey(flagValue);

    const result: StatusResult = {
      hasKey: Boolean(resolved.key),
      source: resolved.source,
      configPath: getConfigPath(),
      envVar: API_KEY_ENV_VAR,
      envVarSet: Boolean(process.env[API_KEY_ENV_VAR]?.trim()),
    };

    if (resolved.key) {
      result.keyMasked = maskApiKey(resolved.key);
      try {
        await createClient(resolved.key).testConnection();
        result.connection = { ok: true };
      } catch (err) {
        result.connection = { ok: false, message: formatApiError(err) };
      }
    }

    if (this.jsonEnabled()) {
      return result;
    }

    if (!result.hasKey) {
      this.log('No API key configured.');
      this.log(`  • Env var ${result.envVar}: ${result.envVarSet ? 'set' : 'not set'}`);
      this.log(`  • Config file: ${result.configPath}`);
      this.log('');
      this.log(`Run \`${this.config.bin} auth set-key\` to store one.`);
      return result;
    }

    this.log(`API key source: ${result.source}`);
    this.log(`Key: ${result.keyMasked}`);
    this.log(`Env var ${result.envVar}: ${result.envVarSet ? 'set' : 'not set'}`);
    this.log(`Config file: ${result.configPath}`);
    if (result.connection) {
      this.log(
        result.connection.ok
          ? '✓ Connection test succeeded.'
          : `✗ Connection test failed: ${result.connection.message}`,
      );
    }

    return result;
  }
}

import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * Persisted CLI configuration. Stored as JSON in the user's home directory.
 *
 * SECURITY NOTE: the API key is a secret stored in plaintext on disk (with
 * 0600 permissions). This is acceptable for an MVP but is not as strong as an
 * OS keychain. See the README for details.
 */
export interface CliConfig {
  apiKey?: string;
  defaultFrom?: string;
}

const CONFIG_DIR_NAME = '.elastic-email-cli';
const CONFIG_FILE_NAME = 'config.json';

/** Allow overriding the config directory in tests via env var. */
function configDir(): string {
  const override = process.env.ELASTIC_EMAIL_CLI_CONFIG_DIR;
  return override && override.length > 0 ? override : join(homedir(), CONFIG_DIR_NAME);
}

/** Absolute path to the config file. */
export function getConfigPath(): string {
  return join(configDir(), CONFIG_FILE_NAME);
}

/** Reads the config file, returning an empty object if it does not exist or is invalid. */
export function loadConfig(): CliConfig {
  const path = getConfigPath();
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as CliConfig;
    }
    return {};
  } catch {
    // A corrupt config file should not crash the whole CLI; treat as empty.
    return {};
  }
}

/**
 * Writes the config file with locked-down permissions:
 *  - directory mode 0700 (owner-only),
 *  - file mode 0600 (owner read/write only).
 */
export function saveConfig(config: CliConfig): void {
  const path = getConfigPath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  // Ensure permissions even if the file already existed with looser modes.
  try {
    chmodSync(path, 0o600);
  } catch {
    // chmod is best-effort (e.g. on filesystems that don't support it).
  }
}

/** Merges `patch` into the existing config and persists it. */
export function updateConfig(patch: Partial<CliConfig>): CliConfig {
  const next = { ...loadConfig(), ...patch };
  saveConfig(next);
  return next;
}

/** Deletes the local config file. Returns true if a file was removed. */
export function clearConfig(): boolean {
  const path = getConfigPath();
  if (!existsSync(path)) return false;
  rmSync(path);
  return true;
}

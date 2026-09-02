import { loadConfig } from './config.js';

export type ApiKeySource = 'flag' | 'env' | 'config' | 'none';

export interface ResolvedApiKey {
  key?: string;
  source: ApiKeySource;
}

export const API_KEY_ENV_VAR = 'ELASTIC_EMAIL_API_KEY';

/**
 * Resolves the API key honoring the documented priority order:
 *   1. `--api-key` flag (explicit override),
 *   2. `ELASTIC_EMAIL_API_KEY` environment variable,
 *   3. the saved local config file.
 *
 * Pure with respect to its `flagValue` argument and the environment/config, so
 * it is straightforward to unit-test.
 */
export function resolveApiKey(flagValue?: string): ResolvedApiKey {
  const fromFlag = flagValue?.trim();
  if (fromFlag) {
    return { key: fromFlag, source: 'flag' };
  }

  const fromEnv = process.env[API_KEY_ENV_VAR]?.trim();
  if (fromEnv) {
    return { key: fromEnv, source: 'env' };
  }

  const fromConfig = loadConfig().apiKey?.trim();
  if (fromConfig) {
    return { key: fromConfig, source: 'config' };
  }

  return { source: 'none' };
}

/** Masks a secret for safe display, e.g. `abcd…wxyz`. Never logs the full key. */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return '*'.repeat(key.length);
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}

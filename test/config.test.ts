import { mkdtempSync, rmSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API_KEY_ENV_VAR, maskApiKey, resolveApiKey } from '../src/config/api-key.js';
import { clearConfig, getConfigPath, loadConfig, saveConfig } from '../src/config/config.js';

let dir: string;
const originalEnv = process.env[API_KEY_ENV_VAR];

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'ee-cli-test-'));
  process.env.ELASTIC_EMAIL_CLI_CONFIG_DIR = dir;
  delete process.env[API_KEY_ENV_VAR];
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.ELASTIC_EMAIL_CLI_CONFIG_DIR;
  if (originalEnv === undefined) {
    delete process.env[API_KEY_ENV_VAR];
  } else {
    process.env[API_KEY_ENV_VAR] = originalEnv;
  }
});

describe('config persistence', () => {
  it('saves and loads config round-trip', () => {
    saveConfig({ apiKey: 'secret-key-123', defaultFrom: 'me@example.com' });
    const loaded = loadConfig();
    expect(loaded.apiKey).toBe('secret-key-123');
    expect(loaded.defaultFrom).toBe('me@example.com');
  });

  it('writes the config file with 0600 permissions', () => {
    saveConfig({ apiKey: 'secret-key-123' });
    const mode = statSync(getConfigPath()).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it('returns empty config when no file exists', () => {
    expect(loadConfig()).toEqual({});
  });

  it('clears the config file', () => {
    saveConfig({ apiKey: 'x'.repeat(10) });
    expect(existsSync(getConfigPath())).toBe(true);
    expect(clearConfig()).toBe(true);
    expect(existsSync(getConfigPath())).toBe(false);
    // Clearing again is a no-op.
    expect(clearConfig()).toBe(false);
  });
});

describe('resolveApiKey priority', () => {
  it('prefers the flag over env and config', () => {
    process.env[API_KEY_ENV_VAR] = 'from-env';
    saveConfig({ apiKey: 'from-config' });
    const resolved = resolveApiKey('from-flag');
    expect(resolved.key).toBe('from-flag');
    expect(resolved.source).toBe('flag');
  });

  it('prefers env over config when no flag is given', () => {
    process.env[API_KEY_ENV_VAR] = 'from-env';
    saveConfig({ apiKey: 'from-config' });
    const resolved = resolveApiKey();
    expect(resolved.key).toBe('from-env');
    expect(resolved.source).toBe('env');
  });

  it('falls back to config when no flag or env', () => {
    saveConfig({ apiKey: 'from-config' });
    const resolved = resolveApiKey();
    expect(resolved.key).toBe('from-config');
    expect(resolved.source).toBe('config');
  });

  it('reports source none when nothing is configured', () => {
    const resolved = resolveApiKey();
    expect(resolved.key).toBeUndefined();
    expect(resolved.source).toBe('none');
  });

  it('ignores blank/whitespace flag values', () => {
    saveConfig({ apiKey: 'from-config' });
    const resolved = resolveApiKey('   ');
    expect(resolved.source).toBe('config');
  });
});

describe('maskApiKey', () => {
  it('masks long keys keeping head and tail', () => {
    expect(maskApiKey('abcd1234wxyz')).toBe('abcd…wxyz');
  });

  it('fully masks short keys', () => {
    expect(maskApiKey('abc')).toBe('***');
  });
});

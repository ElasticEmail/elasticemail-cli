import { describe, expect, it } from 'vitest';
import {
  InterruptedError,
  apiKeyFromArgv,
  isSignalExit,
  redactSecrets,
  resolveExitCode,
  toErrorPayload,
} from '../src/lib/error-json.js';

const cliError = (exit: number, message = 'boom') =>
  Object.assign(new Error(message), { oclif: { exit } });

describe('resolveExitCode', () => {
  it('uses the oclif exit code of our own errors', () => {
    expect(resolveExitCode(cliError(2))).toBe(2);
    expect(resolveExitCode(cliError(4))).toBe(4);
    expect(resolveExitCode(cliError(5))).toBe(5);
  });

  it('classifies oclif parse errors as invalid input, not missing key', () => {
    // oclif parse errors default to exit 2, which is our MissingApiKey.
    const parseError = Object.assign(cliError(2, 'Nonexistent flag: --x'), { parse: {} });
    expect(resolveExitCode(parseError)).toBe(3);
  });

  it('falls back to general for plain errors and non-errors', () => {
    expect(resolveExitCode(new Error('x'))).toBe(1);
    expect(resolveExitCode('x')).toBe(1);
    expect(resolveExitCode(undefined)).toBe(1);
  });
});

describe('toErrorPayload', () => {
  it('emits only code, exitCode and message', () => {
    const payload = toErrorPayload(cliError(5, 'Refusing to delete'));
    expect(payload).toEqual({
      error: { code: 'confirmation_required', exitCode: 5, message: 'Refusing to delete' },
    });
  });

  it('maps every documented exit code to a stable name', () => {
    expect(toErrorPayload(cliError(1)).error.code).toBe('general');
    expect(toErrorPayload(cliError(2)).error.code).toBe('missing_api_key');
    expect(toErrorPayload(cliError(3)).error.code).toBe('invalid_input');
    expect(toErrorPayload(cliError(4)).error.code).toBe('api_error');
    expect(toErrorPayload(cliError(5)).error.code).toBe('confirmation_required');
  });

  it('never carries parser internals such as argv', () => {
    const leaky = Object.assign(cliError(2, 'bad flag'), {
      parse: { input: { argv: ['--api-key', 'SECRETKEY123'] } },
    });
    expect(JSON.stringify(toErrorPayload(leaky))).not.toContain('SECRETKEY123');
  });

  it('masks known secrets inside the message', () => {
    const payload = toErrorPayload(cliError(4, 'rejected key SECRETKEY123'), ['SECRETKEY123']);
    expect(payload.error.message).not.toContain('SECRETKEY123');
  });
});

describe('apiKeyFromArgv', () => {
  it('reads both --api-key forms', () => {
    expect(apiKeyFromArgv(['list', '--api-key', 'abc'])).toBe('abc');
    expect(apiKeyFromArgv(['list', '--api-key=abc'])).toBe('abc');
    expect(apiKeyFromArgv(['list'])).toBeUndefined();
  });
});

describe('redactSecrets', () => {
  it('ignores missing and too-short secrets', () => {
    expect(redactSecrets('abc', [undefined, 'ab'])).toBe('abc');
  });
});

describe('interruptions', () => {
  it('maps an interrupted prompt to 130', () => {
    expect(resolveExitCode(new InterruptedError())).toBe(130);
    expect(toErrorPayload(new InterruptedError()).error.code).toBe('interrupted');
  });

  it('names both signal exit codes', () => {
    expect(toErrorPayload(cliError(130)).error.code).toBe('interrupted');
    expect(toErrorPayload(cliError(143)).error.code).toBe('terminated');
  });

  it('treats only 130 and 143 as signal exits', () => {
    expect(isSignalExit(130)).toBe(true);
    expect(isSignalExit(143)).toBe(true);
    expect(isSignalExit(5)).toBe(false);
    expect(isSignalExit(1)).toBe(false);
  });
});

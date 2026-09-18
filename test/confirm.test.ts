import { describe, expect, it } from 'vitest';
import {
  confirmQuestion,
  decideConfirmation,
  refusalMessage,
  type ConfirmContext,
} from '../src/lib/confirm.js';

const ctx = (over: Partial<ConfirmContext> = {}): ConfirmContext => ({
  yes: false,
  stdinIsTty: true,
  stdoutIsTty: true,
  json: false,
  ...over,
});

describe('decideConfirmation', () => {
  it('prompts when a human is present on both streams', () => {
    expect(decideConfirmation(ctx())).toBe('prompt');
  });

  it('proceeds whenever --yes is given, regardless of environment', () => {
    expect(decideConfirmation(ctx({ yes: true }))).toBe('proceed');
    expect(decideConfirmation(ctx({ yes: true, stdinIsTty: false, stdoutIsTty: false }))).toBe(
      'proceed',
    );
    expect(decideConfirmation(ctx({ yes: true, json: true }))).toBe('proceed');
  });

  it('refuses in CI — neither stream is a terminal', () => {
    expect(decideConfirmation(ctx({ stdinIsTty: false, stdoutIsTty: false }))).toBe('refuse');
  });

  it('refuses when stdout is piped, so the question could not be seen', () => {
    expect(decideConfirmation(ctx({ stdoutIsTty: false }))).toBe('refuse');
  });

  it('refuses when stdin is piped — the answer would come from the pipe, not a human', () => {
    // Guards `echo | elastic-email contacts delete x` from self-confirming.
    expect(decideConfirmation(ctx({ stdinIsTty: false }))).toBe('refuse');
  });

  it('refuses in --json mode even on a full TTY', () => {
    expect(decideConfirmation(ctx({ json: true }))).toBe('refuse');
  });
});

describe('confirmQuestion', () => {
  it('capitalizes the action and appends the default warning', () => {
    expect(confirmQuestion({ action: 'delete contact a@b.co' })).toBe(
      'Delete contact a@b.co? This cannot be undone.',
    );
  });

  it('uses a custom warning when given', () => {
    expect(
      confirmQuestion({ action: 'delete list "News"', warning: 'Contacts are kept.' }),
    ).toBe('Delete list "News"? Contacts are kept.');
  });
});

describe('refusalMessage', () => {
  it('names the action and points at --yes', () => {
    const msg = refusalMessage({ action: 'delete contact a@b.co' });
    expect(msg).toContain('delete contact a@b.co');
    expect(msg).toContain('--yes');
  });
});

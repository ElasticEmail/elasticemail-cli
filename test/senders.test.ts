import { describe, expect, it } from 'vitest';
import { senderHint, verifiedSenderDomains } from '../src/lib/senders.js';
import type { DomainDetail } from '../src/api/types.js';

describe('verifiedSenderDomains', () => {
  it('returns only domains with both SPF and DKIM verified', () => {
    const domains: DomainDetail[] = [
      { Domain: 'ok.com', Spf: true, Dkim: true },
      { Domain: 'no-dkim.com', Spf: true, Dkim: false },
      { Domain: 'no-spf.com', Spf: false, Dkim: true },
      { Domain: 'unknown.com' },
    ];
    expect(verifiedSenderDomains(domains)).toEqual(['ok.com']);
  });

  it('returns empty for no domains', () => {
    expect(verifiedSenderDomains([])).toEqual([]);
  });
});

describe('senderHint', () => {
  it('mentions the account email and verified domains', () => {
    const hint = senderHint('me@example.com', ['a.com', 'b.com']);
    expect(hint).toContain('me@example.com');
    expect(hint).toContain('a.com, b.com');
  });

  it('handles a missing account email', () => {
    const hint = senderHint(undefined, ['a.com']);
    expect(hint).toContain('a.com');
    expect(hint).not.toContain('account email');
  });

  it('falls back to generic guidance with no data', () => {
    expect(senderHint()).toContain('verified');
  });
});

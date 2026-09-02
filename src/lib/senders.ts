import type { DomainDetail } from '../api/types.js';

/**
 * Domains that are fully verified for sending (SPF + DKIM pass). Any address
 * at such a domain can be used as the From address.
 */
export function verifiedSenderDomains(domains: DomainDetail[]): string[] {
  return domains
    .filter((d) => d.Spf === true && d.Dkim === true && typeof d.Domain === 'string')
    .map((d) => d.Domain);
}

/**
 * Human hint for the sender field: the account email always works; verified
 * custom domains allow any address at that domain.
 */
export function senderHint(accountEmail?: string, domains: string[] = []): string {
  const parts: string[] = [];
  if (accountEmail) parts.push(`your account email (${accountEmail})`);
  if (domains.length > 0) parts.push(`any address at: ${domains.join(', ')}`);
  if (parts.length === 0) return 'Use a sender address verified in your account.';
  return `You can send from ${parts.join(' or ')}.`;
}

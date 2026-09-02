import { Args } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { withSpinner } from '../../ui/spinner.js';
import type { DomainDetail } from '../../api/types.js';

function mark(value: unknown): string {
  if (value === true) return '✓ verified';
  if (value === false) return '✗ not verified';
  return '-';
}

export default class DomainsGet extends BaseCommand<typeof DomainsGet> {
  static override summary = 'Show one sender domain with its verification details.';

  static override examples = [
    '<%= config.bin %> domains get yourdomain.com',
    '<%= config.bin %> domains get yourdomain.com --json',
  ];

  static override args = {
    domain: Args.string({ description: 'Domain name.', required: true }),
  };

  async run(): Promise<DomainDetail> {
    const { client } = this.requireClient();

    let domain: DomainDetail;
    try {
      const task = client.getDomain(this.args.domain);
      domain = this.interactive ? await withSpinner('Loading domain…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    if (this.jsonEnabled()) {
      return domain;
    }

    this.log(`Domain:   ${domain.Domain ?? this.args.domain}`);
    this.log(`SPF:      ${mark(domain.Spf)}`);
    this.log(`DKIM:     ${mark(domain.Dkim)}`);
    this.log(`MX:       ${mark(domain.MX)}`);
    this.log(`DMARC:    ${mark(domain.DMARC)}`);
    if (domain.TrackingStatus) this.log(`Tracking: ${domain.TrackingStatus}`);
    if (domain.VerificationStatus) this.log(`Status:   ${domain.VerificationStatus}`);
    if (domain.DefaultDomain) this.log('This is the default sender domain.');

    return domain;
  }
}

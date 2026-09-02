import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { paginationFlags, resolvePagination } from '../../lib/pagination.js';
import { renderTable } from '../../lib/table.js';
import { withSpinner } from '../../ui/spinner.js';
import type { DomainDetail } from '../../api/types.js';

interface DomainsListResult {
  limit: number;
  offset: number;
  count: number;
  domains: DomainDetail[];
}

function mark(value: unknown): string {
  if (value === true) return '✓';
  if (value === false) return '✗';
  return '-';
}

export default class DomainsList extends BaseCommand<typeof DomainsList> {
  static override summary = 'List sender domains and their verification status.';

  static override examples = [
    '<%= config.bin %> domains list',
    '<%= config.bin %> domains list --page 2 --page-size 5',
    '<%= config.bin %> domains list --json',
  ];

  static override flags = { ...paginationFlags };

  async run(): Promise<DomainsListResult> {
    const { limit, offset, conflict } = resolvePagination(this.flags);
    if (conflict) {
      this.error(conflict, { exit: ExitCode.InvalidInput });
    }

    const { client } = this.requireClient();

    let domains: DomainDetail[];
    try {
      // GET /domains has no server-side pagination; slice client-side so the
      // flags behave like every other list command.
      const task = client.listDomains().then((all) => all.slice(offset, offset + limit));
      domains = this.interactive ? await withSpinner('Loading domains…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    const result: DomainsListResult = { limit, offset, count: domains.length, domains };

    if (this.jsonEnabled()) {
      return result;
    }

    if (domains.length === 0) {
      this.log('No sender domains configured.');
      return result;
    }

    this.log(`Sender domains (${domains.length}):`);
    this.log('');
    for (const line of renderTable(domains, [
      { header: 'Domain', value: (d) => d.Domain },
      { header: 'SPF', value: (d) => mark(d.Spf) },
      { header: 'DKIM', value: (d) => mark(d.Dkim) },
      { header: 'MX', value: (d) => mark(d.MX) },
      { header: 'DMARC', value: (d) => mark(d.DMARC) },
      { header: 'Tracking', value: (d) => d.TrackingStatus },
      { header: 'Default', value: (d) => (d.DefaultDomain ? '✓' : '') },
    ])) {
      this.log(line);
    }

    return result;
  }
}

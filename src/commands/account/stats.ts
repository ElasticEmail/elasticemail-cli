import { Flags } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { withSpinner } from '../../ui/spinner.js';
import type { AccountStatistics } from '../../api/types.js';

interface AccountStatsResult {
  from: string;
  to: string;
  statistics: AccountStatistics;
}

/** Formats a Date as `YYYY-MM-DDTHH:mm:ss` (Elastic Email's expected form). */
function formatApiDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '');
}

export default class AccountStats extends BaseCommand<typeof AccountStats> {
  static override summary = 'Show sending statistics (delivered, bounced, opens, ...).';
  static override description =
    'Reports aggregate sending statistics for a date range (default: the last 30 days).';

  static override examples = [
    '<%= config.bin %> account stats',
    '<%= config.bin %> account stats --days 7',
    '<%= config.bin %> account stats --from-date 2026-01-01T00:00:00 --json',
  ];

  static override flags = {
    days: Flags.integer({
      summary: 'Number of days to look back from now (ignored if --from-date is set).',
      default: 30,
      min: 1,
    }),
    'from-date': Flags.string({
      summary: 'Start date (YYYY-MM-DDTHH:mm:ss). Overrides --days.',
      helpValue: '<date>',
    }),
    'to-date': Flags.string({
      summary: 'End date (YYYY-MM-DDTHH:mm:ss). Defaults to now.',
      helpValue: '<date>',
    }),
  };

  async run(): Promise<AccountStatsResult> {
    const now = new Date();
    const from =
      this.flags['from-date'] ??
      formatApiDate(new Date(now.getTime() - this.flags.days * 24 * 60 * 60 * 1000));
    const to = this.flags['to-date'] ?? formatApiDate(now);

    const { client } = this.requireClient();

    let statistics: AccountStatistics;
    try {
      const task = client.getStatistics({ from, to });
      statistics = this.interactive ? await withSpinner('Loading statistics…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    const result: AccountStatsResult = { from, to, statistics };

    if (this.jsonEnabled()) {
      return result;
    }

    this.log(`Sending statistics (${from} → ${to}):`);
    this.log('');
    const entries = Object.entries(statistics).filter(([, v]) => typeof v === 'number');
    if (entries.length === 0) {
      this.log('  (no statistics returned for this period)');
    } else {
      for (const [name, value] of entries) {
        this.log(`  ${name.padEnd(16)} ${value}`);
      }
    }

    return result;
  }
}

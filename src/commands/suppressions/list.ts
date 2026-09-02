import { Flags } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { paginationFlags, resolvePagination } from '../../lib/pagination.js';
import { renderTable } from '../../lib/table.js';
import { withSpinner } from '../../ui/spinner.js';
import type { Suppression, SuppressionType } from '../../api/types.js';

interface SuppressionsListResult {
  type: SuppressionType | 'all';
  limit: number;
  offset: number;
  count: number;
  suppressions: Suppression[];
}

export default class SuppressionsList extends BaseCommand<typeof SuppressionsList> {
  static override summary = 'List suppressed addresses (bounces, complaints, unsubscribes).';

  static override examples = [
    '<%= config.bin %> suppressions list',
    '<%= config.bin %> suppressions list --type bounces --search example.com',
    '<%= config.bin %> suppressions list --type unsubscribes --limit 50 --json',
  ];

  static override flags = {
    ...paginationFlags,
    type: Flags.string({
      summary: 'Narrow to one suppression list.',
      options: ['bounces', 'complaints', 'unsubscribes'],
    }),
    search: Flags.string({
      summary: 'Substring filter (requires --type).',
      helpValue: '<text>',
    }),
  };

  async run(): Promise<SuppressionsListResult> {
    const { limit, offset, conflict } = resolvePagination(this.flags);
    if (conflict) {
      this.error(conflict, { exit: ExitCode.InvalidInput });
    }
    if (this.flags.search && !this.flags.type) {
      this.error('--search requires --type (the API only filters typed lists).', {
        exit: ExitCode.InvalidInput,
      });
    }

    const type = this.flags.type as SuppressionType | undefined;
    const { client } = this.requireClient();

    let suppressions: Suppression[];
    try {
      const task = client.listSuppressions({ type, search: this.flags.search, limit, offset });
      suppressions = this.interactive
        ? await withSpinner('Loading suppressions…', task)
        : await task;
    } catch (err) {
      this.fail(err);
    }

    const result: SuppressionsListResult = {
      type: type ?? 'all',
      limit,
      offset,
      count: suppressions.length,
      suppressions,
    };

    if (this.jsonEnabled()) {
      return result;
    }

    if (suppressions.length === 0) {
      this.log('No suppressions found for this page.');
      return result;
    }

    this.log(`Suppressions [${result.type}] (showing ${suppressions.length}, offset ${offset}):`);
    this.log('');
    for (const line of renderTable(suppressions, [
      { header: 'Email', value: (s) => s.Email },
      { header: 'Error code', value: (s) => s.ErrorCode },
      { header: 'Reason', value: (s) => s.FriendlyErrorMessage, maxWidth: 40 },
      { header: 'Date updated', value: (s) => s.DateUpdated },
    ])) {
      this.log(line);
    }

    return result;
  }
}

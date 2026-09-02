import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { paginationFlags, resolvePagination } from '../../lib/pagination.js';
import { renderTable } from '../../lib/table.js';
import { withSpinner } from '../../ui/spinner.js';
import type { EmailValidationResult } from '../../api/types.js';

interface VerificationsListResult {
  limit: number;
  offset: number;
  count: number;
  verifications: EmailValidationResult[];
}

export default class VerificationsList extends BaseCommand<typeof VerificationsList> {
  static override summary = 'List past single-email verification results.';
  static override description = 'Verify a new address with `<%= config.bin %> verify <email>`.';

  static override examples = [
    '<%= config.bin %> verifications list',
    '<%= config.bin %> verifications list --limit 50 --json',
  ];

  static override flags = { ...paginationFlags };

  async run(): Promise<VerificationsListResult> {
    const { limit, offset, conflict } = resolvePagination(this.flags);
    if (conflict) {
      this.error(conflict, { exit: ExitCode.InvalidInput });
    }

    const { client } = this.requireClient();

    let verifications: EmailValidationResult[];
    try {
      const task = client.listVerifications({ limit, offset });
      verifications = this.interactive
        ? await withSpinner('Loading verifications…', task)
        : await task;
    } catch (err) {
      this.fail(err);
    }

    const result: VerificationsListResult = {
      limit,
      offset,
      count: verifications.length,
      verifications,
    };

    if (this.jsonEnabled()) {
      return result;
    }

    if (verifications.length === 0) {
      this.log('No verification results for this page.');
      return result;
    }

    this.log(`Verification results (showing ${verifications.length}, offset ${offset}):`);
    this.log('');
    for (const line of renderTable(verifications, [
      { header: 'Email', value: (v) => v.Email },
      { header: 'Result', value: (v) => v.Result },
      { header: 'Reason', value: (v) => v.Reason, maxWidth: 40 },
      { header: 'Date', value: (v) => v.DateAdded },
    ])) {
      this.log(line);
    }

    return result;
  }
}

import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { paginationFlags, resolvePagination } from '../../lib/pagination.js';
import { renderTable } from '../../lib/table.js';
import { withSpinner } from '../../ui/spinner.js';
import type { Segment } from '../../api/types.js';

interface SegmentsListResult {
  limit: number;
  offset: number;
  count: number;
  segments: Segment[];
}

export default class SegmentsList extends BaseCommand<typeof SegmentsList> {
  static override summary = 'List your contact segments.';

  static override examples = [
    '<%= config.bin %> segments list',
    '<%= config.bin %> segments list --limit 10 --json',
  ];

  static override flags = { ...paginationFlags };

  async run(): Promise<SegmentsListResult> {
    const { limit, offset, conflict } = resolvePagination(this.flags);
    if (conflict) {
      this.error(conflict, { exit: ExitCode.InvalidInput });
    }

    const { client } = this.requireClient();

    let segments: Segment[];
    try {
      const task = client.listSegments({ limit, offset });
      segments = this.interactive ? await withSpinner('Loading segments…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    const result: SegmentsListResult = { limit, offset, count: segments.length, segments };

    if (this.jsonEnabled()) {
      return result;
    }

    if (segments.length === 0) {
      this.log('No segments found.');
      return result;
    }

    this.log(`Segments (showing ${segments.length}, offset ${offset}):`);
    this.log('');
    for (const line of renderTable(segments, [
      { header: 'Name', value: (s) => s.Name },
      { header: 'Rule', value: (s) => s.Rule, maxWidth: 60 },
    ])) {
      this.log(line);
    }

    return result;
  }
}

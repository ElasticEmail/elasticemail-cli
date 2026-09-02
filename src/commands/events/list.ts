import { Flags } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { paginationFlags, resolvePagination } from '../../lib/pagination.js';
import { renderTable } from '../../lib/table.js';
import { withSpinner } from '../../ui/spinner.js';
import type { RecipientEvent } from '../../api/types.js';

interface EventsListResult {
  limit: number;
  offset: number;
  count: number;
  events: RecipientEvent[];
}

export default class EventsList extends BaseCommand<typeof EventsList> {
  static override summary = 'List delivery events (sends, opens, clicks, bounces, ...).';

  static override examples = [
    '<%= config.bin %> events list',
    '<%= config.bin %> events list --from 2026-06-01T00:00:00 --limit 50',
    '<%= config.bin %> events list --order-by DateAscending --json',
  ];

  static override flags = {
    ...paginationFlags,
    from: Flags.string({
      summary: 'Start date (YYYY-MM-DDTHH:mm:ss).',
      helpValue: '<date>',
    }),
    to: Flags.string({
      summary: 'End date (YYYY-MM-DDTHH:mm:ss).',
      helpValue: '<date>',
    }),
    'order-by': Flags.string({
      summary: 'Sort order.',
      options: ['DateDescending', 'DateAscending'],
      default: 'DateDescending',
    }),
  };

  async run(): Promise<EventsListResult> {
    const { limit, offset, conflict } = resolvePagination(this.flags);
    if (conflict) {
      this.error(conflict, { exit: ExitCode.InvalidInput });
    }

    const { client } = this.requireClient();

    let events: RecipientEvent[];
    try {
      const task = client.listEvents({
        limit,
        offset,
        from: this.flags.from,
        to: this.flags.to,
        orderBy: this.flags['order-by'] as 'DateDescending' | 'DateAscending',
      });
      events = this.interactive ? await withSpinner('Loading events…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    const result: EventsListResult = { limit, offset, count: events.length, events };

    if (this.jsonEnabled()) {
      return result;
    }

    if (events.length === 0) {
      this.log('No events found for this page.');
      return result;
    }

    this.log(`Events (showing ${events.length}, offset ${offset}):`);
    this.log('');
    for (const line of renderTable(events, [
      { header: 'Date', value: (e) => e.EventDate },
      { header: 'Type', value: (e) => e.EventType },
      { header: 'To', value: (e) => e.To },
      { header: 'Subject', value: (e) => e.Subject, maxWidth: 40 },
    ])) {
      this.log(line);
    }

    return result;
  }
}

import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { paginationFlags, resolvePagination } from '../../lib/pagination.js';
import { renderTable } from '../../lib/table.js';
import { withSpinner } from '../../ui/spinner.js';
import type { ContactsList } from '../../api/types.js';

interface ListsResult {
  limit: number;
  offset: number;
  count: number;
  lists: ContactsList[];
}

export default class Lists extends BaseCommand<typeof Lists> {
  static override summary = 'List your contact lists.';

  static override examples = [
    '<%= config.bin %> lists',
    '<%= config.bin %> lists --limit 10 --json',
  ];

  static override flags = { ...paginationFlags };

  async run(): Promise<ListsResult> {
    const { limit, offset, conflict } = resolvePagination(this.flags);
    if (conflict) {
      this.error(conflict, { exit: ExitCode.InvalidInput });
    }

    const { client } = this.requireClient();

    let lists: ContactsList[];
    try {
      const task = client.listLists({ limit, offset });
      lists = this.interactive ? await withSpinner('Loading lists…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    const result: ListsResult = { limit, offset, count: lists.length, lists };

    if (this.jsonEnabled()) {
      return result;
    }

    if (lists.length === 0) {
      this.log('No contact lists found.');
      return result;
    }

    this.log(`Contact lists (showing ${lists.length}, offset ${offset}):`);
    this.log('');
    for (const line of renderTable(lists, [
      { header: 'Name', value: (l) => l.ListName },
      { header: 'Allow unsubscribe', value: (l) => l.AllowUnsubscribe },
      { header: 'Date added', value: (l) => l.DateAdded },
    ])) {
      this.log(line);
    }

    return result;
  }
}

import { Args } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { paginationFlags, resolvePagination } from '../../lib/pagination.js';
import { renderTable } from '../../lib/table.js';
import { withSpinner } from '../../ui/spinner.js';
import type { Contact } from '../../api/types.js';

interface ListContactsResult {
  list: string;
  limit: number;
  offset: number;
  count: number;
  contacts: Contact[];
}

export default class ListsContacts extends BaseCommand<typeof ListsContacts> {
  static override summary = 'Show the contacts that belong to a list.';

  static override examples = [
    '<%= config.bin %> lists contacts Newsletter',
    '<%= config.bin %> lists contacts Newsletter --page 2 --page-size 50 --json',
  ];

  static override args = {
    name: Args.string({ description: 'List name.', required: true }),
  };

  static override flags = { ...paginationFlags };

  async run(): Promise<ListContactsResult> {
    const { limit, offset, conflict } = resolvePagination(this.flags);
    if (conflict) {
      this.error(conflict, { exit: ExitCode.InvalidInput });
    }

    const { client } = this.requireClient();

    let contacts: Contact[];
    try {
      const task = client.getListContacts(this.args.name, { limit, offset });
      contacts = this.interactive ? await withSpinner('Loading contacts…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    const result: ListContactsResult = {
      list: this.args.name,
      limit,
      offset,
      count: contacts.length,
      contacts,
    };

    if (this.jsonEnabled()) {
      return result;
    }

    if (contacts.length === 0) {
      this.log(`No contacts in list "${this.args.name}" for this page.`);
      return result;
    }

    this.log(`Contacts in "${this.args.name}" (showing ${contacts.length}, offset ${offset}):`);
    this.log('');
    for (const line of renderTable(contacts, [
      { header: 'Email', value: (c) => c.Email },
      { header: 'Status', value: (c) => c.Status },
      {
        header: 'Name',
        value: (c) => [c.FirstName, c.LastName].filter(Boolean).join(' '),
        maxWidth: 32,
      },
      { header: 'Date added', value: (c) => c.DateAdded },
    ])) {
      this.log(line);
    }

    return result;
  }
}

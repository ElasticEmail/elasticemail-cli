import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { paginationFlags, resolvePagination } from '../../lib/pagination.js';
import { renderTable } from '../../lib/table.js';
import { withSpinner } from '../../ui/spinner.js';
import type { Contact } from '../../api/types.js';

interface ContactsListResult {
  limit: number;
  offset: number;
  count: number;
  contacts: Contact[];
}

export default class ContactsList extends BaseCommand<typeof ContactsList> {
  static override summary = 'List contacts.';

  static override examples = [
    '<%= config.bin %> contacts list',
    '<%= config.bin %> contacts list --page 2 --page-size 50',
    '<%= config.bin %> contacts list --limit 10 --json',
  ];

  static override flags = { ...paginationFlags };

  async run(): Promise<ContactsListResult> {
    const { limit, offset, conflict } = resolvePagination(this.flags);
    if (conflict) {
      this.error(conflict, { exit: ExitCode.InvalidInput });
    }

    const { client } = this.requireClient();

    let contacts: Contact[];
    try {
      const task = client.listContacts({ limit, offset });
      contacts = this.interactive ? await withSpinner('Loading contacts…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    const result: ContactsListResult = { limit, offset, count: contacts.length, contacts };

    if (this.jsonEnabled()) {
      return result;
    }

    if (contacts.length === 0) {
      this.log('No contacts found for this page.');
      return result;
    }

    this.log(`Contacts (showing ${contacts.length}, offset ${offset}):`);
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

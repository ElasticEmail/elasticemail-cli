import { Args } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { paginationFlags, resolvePagination } from '../../lib/pagination.js';
import { renderTable } from '../../lib/table.js';
import { withSpinner } from '../../ui/spinner.js';
import type { Contact } from '../../api/types.js';

interface SegmentContactsResult {
  segment: string;
  rule?: string;
  limit: number;
  offset: number;
  count: number;
  contacts: Contact[];
}

export default class SegmentsContacts extends BaseCommand<typeof SegmentsContacts> {
  static override summary = 'Show the contacts that match a segment.';
  static override description =
    'Resolves the segment rule and lists matching contacts (v4 has no dedicated ' +
    'segment-contacts endpoint, so this filters /contacts by the segment rule).';

  static override examples = [
    '<%= config.bin %> segments contacts "Engaged Contacts"',
    '<%= config.bin %> segments contacts "Engaged Contacts" --page 2 --json',
  ];

  static override args = {
    name: Args.string({ description: 'Segment name.', required: true }),
  };

  static override flags = { ...paginationFlags };

  async run(): Promise<SegmentContactsResult> {
    const { limit, offset, conflict } = resolvePagination(this.flags);
    if (conflict) {
      this.error(conflict, { exit: ExitCode.InvalidInput });
    }

    const { client } = this.requireClient();

    let rule: string | undefined;
    let contacts: Contact[];
    try {
      const task = (async () => {
        const segment = await client.getSegment(this.args.name);
        return {
          rule: segment.Rule,
          contacts: await client.listContacts({ limit, offset, rule: segment.Rule || undefined }),
        };
      })();
      const loaded = this.interactive
        ? await withSpinner('Loading segment contacts…', task)
        : await task;
      rule = loaded.rule;
      contacts = loaded.contacts;
    } catch (err) {
      this.fail(err);
    }

    const result: SegmentContactsResult = {
      segment: this.args.name,
      rule,
      limit,
      offset,
      count: contacts.length,
      contacts,
    };

    if (this.jsonEnabled()) {
      return result;
    }

    if (contacts.length === 0) {
      this.log(`No contacts match segment "${this.args.name}" on this page.`);
      return result;
    }

    this.log(`Contacts in segment "${this.args.name}" (showing ${contacts.length}, offset ${offset}):`);
    if (rule) this.log(`Rule: ${rule}`);
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

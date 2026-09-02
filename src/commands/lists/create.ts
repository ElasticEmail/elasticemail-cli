import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { parseRecipients } from '../../lib/validate.js';
import { withSpinner } from '../../ui/spinner.js';
import type { ContactsList } from '../../api/types.js';

export default class ListsCreate extends BaseCommand<typeof ListsCreate> {
  static override summary = 'Create a new contact list.';

  static override examples = [
    '<%= config.bin %> lists create Newsletter',
    '<%= config.bin %> lists create Newsletter --allow-unsubscribe --emails "a@x.com,b@x.com"',
  ];

  static override args = {
    name: Args.string({ description: 'Name of the list to create.', required: true }),
  };

  static override flags = {
    'allow-unsubscribe': Flags.boolean({
      summary: 'Let contacts unsubscribe from this list (instead of the whole account).',
      default: false,
    }),
    emails: Flags.string({
      summary: 'Existing contacts to add right away, comma-separated.',
      helpValue: '<emails>',
    }),
  };

  async run(): Promise<ContactsList> {
    let emails: string[] | undefined;
    if (this.flags.emails) {
      const { valid, invalid } = parseRecipients([this.flags.emails]);
      if (invalid.length > 0) {
        this.error(`Invalid email address(es): ${invalid.join(', ')}`, {
          exit: ExitCode.InvalidInput,
        });
      }
      emails = valid;
    }

    const { client } = this.requireClient();

    let list: ContactsList;
    try {
      const task = client.createList({
        ListName: this.args.name,
        AllowUnsubscribe: this.flags['allow-unsubscribe'],
        ...(emails && emails.length > 0 ? { Emails: emails } : {}),
      });
      list = this.interactive ? await withSpinner('Creating list…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    if (!this.jsonEnabled()) {
      this.log(`✓ Created list "${list.ListName ?? this.args.name}".`);
      if (emails && emails.length > 0) {
        this.log(`  Added ${emails.length} contact${emails.length === 1 ? '' : 's'}.`);
      }
    }

    return list;
  }
}

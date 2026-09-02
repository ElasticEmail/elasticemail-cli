import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { parseRecipients } from '../../lib/validate.js';
import { withSpinner } from '../../ui/spinner.js';
import type { Contact, ContactPayload } from '../../api/types.js';

interface AddResult {
  added: string[];
  lists: string[];
  contacts: Contact[];
}

export default class ContactsAdd extends BaseCommand<typeof ContactsAdd> {
  static override summary = 'Add one or more contacts.';
  static override description =
    'Accepts a single address or a comma-separated batch. --first-name/--last-name only make ' +
    'sense for a single contact.';

  static override examples = [
    '<%= config.bin %> contacts add jane@example.com --first-name Jane --last-name Doe',
    '<%= config.bin %> contacts add "a@example.com,b@example.com" --list Newsletter',
    '<%= config.bin %> contacts add jane@example.com --json',
  ];

  static override args = {
    emails: Args.string({
      description: 'Email address(es) to add — comma-separated for a batch.',
      required: true,
    }),
  };

  static override flags = {
    'first-name': Flags.string({ summary: 'First name (single contact only).' }),
    'last-name': Flags.string({ summary: 'Last name (single contact only).' }),
    list: Flags.string({
      summary: 'Subscribe the contact(s) to this list. Repeat for multiple lists.',
      multiple: true,
      helpValue: '<name>',
    }),
  };

  async run(): Promise<AddResult> {
    const { valid, invalid } = parseRecipients([this.args.emails]);
    if (invalid.length > 0) {
      this.error(`Invalid email address(es): ${invalid.join(', ')}`, {
        exit: ExitCode.InvalidInput,
      });
    }
    if (valid.length === 0) {
      this.error('No email addresses given.', { exit: ExitCode.InvalidInput });
    }
    if (valid.length > 1 && (this.flags['first-name'] || this.flags['last-name'])) {
      this.error('--first-name/--last-name can only be used with a single contact.', {
        exit: ExitCode.InvalidInput,
      });
    }

    const payload: ContactPayload[] = valid.map((email) => ({
      Email: email,
      ...(this.flags['first-name'] ? { FirstName: this.flags['first-name'] } : {}),
      ...(this.flags['last-name'] ? { LastName: this.flags['last-name'] } : {}),
    }));

    const { client } = this.requireClient();

    let contacts: Contact[];
    try {
      const task = client.addContacts(payload, this.flags.list);
      contacts = this.interactive ? await withSpinner('Adding contacts…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    const result: AddResult = { added: valid, lists: this.flags.list ?? [], contacts };

    if (!this.jsonEnabled()) {
      this.log(`✓ Added ${valid.length} contact${valid.length === 1 ? '' : 's'}: ${valid.join(', ')}`);
      if (result.lists.length > 0) {
        this.log(`  Subscribed to: ${result.lists.join(', ')}`);
      }
    }

    return result;
  }
}

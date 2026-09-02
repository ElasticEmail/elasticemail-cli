import { Args } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { isValidEmail } from '../../lib/validate.js';
import { withSpinner } from '../../ui/spinner.js';

interface DeleteResult {
  deleted: boolean;
  email: string;
}

export default class ContactsDelete extends BaseCommand<typeof ContactsDelete> {
  static override summary = 'Delete a contact.';

  static override examples = [
    '<%= config.bin %> contacts delete jane@example.com',
    '<%= config.bin %> contacts delete jane@example.com --json',
  ];

  static override args = {
    email: Args.string({ description: 'Email address of the contact to delete.', required: true }),
  };

  async run(): Promise<DeleteResult> {
    if (!isValidEmail(this.args.email)) {
      this.error(`Invalid email address: ${this.args.email}`, { exit: ExitCode.InvalidInput });
    }

    const { client } = this.requireClient();

    try {
      const task = client.deleteContact(this.args.email);
      if (this.interactive) {
        await withSpinner('Deleting contact…', task);
      } else {
        await task;
      }
    } catch (err) {
      this.fail(err);
    }

    const result: DeleteResult = { deleted: true, email: this.args.email };
    if (!this.jsonEnabled()) {
      this.log(`✓ Deleted contact ${this.args.email}.`);
    }
    return result;
  }
}

import { Args } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { isValidEmail } from '../../lib/validate.js';
import { withSpinner } from '../../ui/spinner.js';
import type { Contact } from '../../api/types.js';

export default class ContactsGet extends BaseCommand<typeof ContactsGet> {
  static override summary = 'Show a single contact.';

  static override examples = [
    '<%= config.bin %> contacts get jane@example.com',
    '<%= config.bin %> contacts get jane@example.com --json',
  ];

  static override args = {
    email: Args.string({ description: 'Contact email address.', required: true }),
  };

  async run(): Promise<Contact> {
    if (!isValidEmail(this.args.email)) {
      this.error(`Invalid email address: ${this.args.email}`, { exit: ExitCode.InvalidInput });
    }

    const { client } = this.requireClient();

    let contact: Contact;
    try {
      const task = client.getContact(this.args.email);
      contact = this.interactive ? await withSpinner('Loading contact…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    if (this.jsonEnabled()) {
      return contact;
    }

    this.log(`Email:        ${contact.Email}`);
    if (contact.Status) this.log(`Status:       ${contact.Status}`);
    const name = [contact.FirstName, contact.LastName].filter(Boolean).join(' ');
    if (name) this.log(`Name:         ${name}`);
    if (contact.Source) this.log(`Source:       ${contact.Source}`);
    if (contact.DateAdded) this.log(`Date added:   ${contact.DateAdded}`);
    if (contact.DateUpdated) this.log(`Date updated: ${contact.DateUpdated}`);
    const custom = Object.entries(contact.CustomFields ?? {});
    if (custom.length > 0) {
      this.log('Custom fields:');
      for (const [key, value] of custom) this.log(`  ${key}: ${value}`);
    }

    return contact;
  }
}

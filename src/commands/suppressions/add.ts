import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { parseRecipients } from '../../lib/validate.js';
import { withSpinner } from '../../ui/spinner.js';
import type { Suppression, SuppressionType } from '../../api/types.js';

interface AddResult {
  type: SuppressionType;
  added: string[];
  suppressions: Suppression[];
}

export default class SuppressionsAdd extends BaseCommand<typeof SuppressionsAdd> {
  static override summary = 'Add addresses to a suppression list.';

  static override examples = [
    '<%= config.bin %> suppressions add jane@example.com --type unsubscribes',
    '<%= config.bin %> suppressions add "a@x.com,b@x.com" --type bounces --json',
  ];

  static override args = {
    emails: Args.string({
      description: 'Email address(es) to suppress — comma-separated for a batch.',
      required: true,
    }),
  };

  static override flags = {
    type: Flags.string({
      summary: 'Which suppression list to add to.',
      options: ['bounces', 'complaints', 'unsubscribes'],
      required: true,
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

    const type = this.flags.type as SuppressionType;
    const { client } = this.requireClient();

    let suppressions: Suppression[];
    try {
      const task = client.addSuppressions(type, valid);
      suppressions = this.interactive
        ? await withSpinner('Adding suppressions…', task)
        : await task;
    } catch (err) {
      this.fail(err);
    }

    const result: AddResult = { type, added: valid, suppressions };
    if (!this.jsonEnabled()) {
      this.log(`✓ Added ${valid.length} address${valid.length === 1 ? '' : 'es'} to ${type}.`);
    }
    return result;
  }
}

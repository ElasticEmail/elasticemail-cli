import { Args } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { confirmFlags } from '../../lib/confirm.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { isValidEmail } from '../../lib/validate.js';
import { withSpinner } from '../../ui/spinner.js';

interface DeleteResult {
  deleted: boolean;
  email: string;
}

export default class SuppressionsDelete extends BaseCommand<typeof SuppressionsDelete> {
  static override summary = 'Remove an address from suppressions (it can receive email again).';

  static override examples = [
    '<%= config.bin %> suppressions delete jane@example.com',
    '<%= config.bin %> suppressions delete jane@example.com --json',
  ];

  static override args = {
    email: Args.string({ description: 'Email address to un-suppress.', required: true }),
  };

  static override flags = { ...confirmFlags };

  async run(): Promise<DeleteResult> {
    if (!isValidEmail(this.args.email)) {
      this.error(`Invalid email address: ${this.args.email}`, { exit: ExitCode.InvalidInput });
    }

    const { client } = this.requireClient();

    const confirmed = await this.confirmDestructive({
      action: `remove ${this.args.email} from suppressions`,
      warning: 'They will be able to receive email from you again.',
    });
    if (!confirmed) {
      if (!this.jsonEnabled()) this.log('Cancelled — nothing was changed.');
      return { deleted: false, email: this.args.email };
    }

    try {
      const task = client.deleteSuppression(this.args.email);
      if (this.interactive) {
        await withSpinner('Removing suppression…', task);
      } else {
        await task;
      }
    } catch (err) {
      this.fail(err);
    }

    const result: DeleteResult = { deleted: true, email: this.args.email };
    if (!this.jsonEnabled()) {
      this.log(`✓ Removed ${this.args.email} from suppressions.`);
    }
    return result;
  }
}

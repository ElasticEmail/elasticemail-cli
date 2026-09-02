import { Args } from '@oclif/core';
import { BaseCommand } from '../lib/base-command.js';
import { ExitCode } from '../lib/exit-codes.js';
import { isValidEmail } from '../lib/validate.js';
import { withSpinner } from '../ui/spinner.js';
import type { EmailValidationResult } from '../api/types.js';

export default class Verify extends BaseCommand<typeof Verify> {
  static override summary = 'Verify a single email address (deliverability check).';
  static override description =
    'Runs Elastic Email verification on one address and reports the result ' +
    '(ValidAddress, InvalidAddress, MailboxNotFound, Risky, Unknown, ...).';

  static override examples = [
    '<%= config.bin %> verify jane@example.com',
    '<%= config.bin %> verify jane@example.com --json',
  ];

  static override args = {
    email: Args.string({ description: 'Email address to verify.', required: true }),
  };

  async run(): Promise<EmailValidationResult> {
    if (!isValidEmail(this.args.email)) {
      this.error(`That does not look like an email address: ${this.args.email}`, {
        exit: ExitCode.InvalidInput,
      });
    }

    const { client } = this.requireClient();

    let result: EmailValidationResult;
    try {
      const task = client.verifyEmail(this.args.email);
      result = this.interactive ? await withSpinner('Verifying address…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    if (this.jsonEnabled()) {
      return result;
    }

    this.log(`Email:  ${result.Email ?? this.args.email}`);
    this.log(`Result: ${result.Result ?? 'unknown'}`);
    if (result.Reason) this.log(`Reason: ${result.Reason}`);
    if (result.Suggested) this.log(`Did you mean: ${result.Suggested}`);

    return result;
  }
}

import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { withSpinner } from '../../ui/spinner.js';
import type { EmailJobStatus } from '../../api/types.js';

export default class EmailsStatus extends BaseCommand<typeof EmailsStatus> {
  static override summary = 'Check the delivery status of a sent email.';
  static override description =
    'Looks up a send job by the TransactionID returned by `emails send` and reports ' +
    'per-recipient delivery counts.';

  static override examples = [
    '<%= config.bin %> emails status 61e4f...-transaction-id',
    '<%= config.bin %> emails status <transactionid> --recipients --json',
  ];

  static override args = {
    transactionid: Args.string({
      description: 'TransactionID returned when the email was sent.',
      required: true,
    }),
  };

  static override flags = {
    recipients: Flags.boolean({
      summary: 'Include per-recipient address lists (sent, delivered, failed, ...).',
      default: false,
    }),
    'message-ids': Flags.boolean({
      summary: 'Include the individual MessageIDs.',
      default: false,
    }),
  };

  async run(): Promise<EmailJobStatus> {
    const { client } = this.requireClient();
    const detail = this.flags.recipients;

    let status: EmailJobStatus;
    try {
      const task = client.getEmailStatus(this.args.transactionid, {
        showFailed: detail,
        showSent: detail,
        showDelivered: detail,
        showPending: detail,
        showOpened: detail,
        showClicked: detail,
        showAbuse: detail,
        showUnsubscribed: detail,
        showErrors: detail,
        showMessageIDs: this.flags['message-ids'],
      });
      status = this.interactive ? await withSpinner('Checking status…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    if (this.jsonEnabled()) {
      return status;
    }

    this.log(`Status: ${status.Status ?? 'unknown'}`);
    if (status.RecipientsCount !== undefined) this.log(`Recipients: ${status.RecipientsCount}`);
    const counts: [string, number | undefined][] = [
      ['Sent', status.SentCount],
      ['Delivered', status.DeliveredCount],
      ['Pending', status.PendingCount],
      ['Failed', status.FailedCount],
      ['Opened', status.OpenedCount],
      ['Clicked', status.ClickedCount],
      ['Unsubscribed', status.UnsubscribedCount],
      ['Abuse reports', status.AbuseReportsCount],
    ];
    for (const [label, value] of counts) {
      if (value !== undefined) this.log(`  ${label.padEnd(14)} ${value}`);
    }
    if (this.flags['message-ids'] && status.MessageIDs?.length) {
      this.log('MessageIDs:');
      for (const id of status.MessageIDs) this.log(`  ${id}`);
    }

    return status;
  }
}

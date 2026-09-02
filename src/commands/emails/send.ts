import { Flags } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { loadConfig } from '../../config/config.js';
import { parseRecipients, validateSendInput } from '../../lib/validate.js';
import { withSpinner } from '../../ui/spinner.js';
import { promptSendEmail } from '../../ui/SendEmailForm.js';
import type { BodyPart, Campaign, EmailMessageData } from '../../api/types.js';

interface SendResult {
  dryRun: boolean;
  mode: 'transactional' | 'campaign';
  to: string[];
  toList?: string;
  subject: string;
  request: EmailMessageData | Campaign;
  messageId?: string;
  transactionId?: string;
  campaignName?: string;
}

export default class EmailsSend extends BaseCommand<typeof EmailsSend> {
  static override summary = 'Send an email — to addresses, or to a whole list.';
  static override description =
    'Provide all flags for non-interactive/CI use, or run on a TTY without --to to open ' +
    'an interactive compose form. Use --template to send a saved template, and --to-list ' +
    'to send a template to every contact of a list (creates an Active campaign). ' +
    'Use --dry-run to validate and preview the request without sending.';

  static override examples = [
    '<%= config.bin %> emails send --to a@example.com --subject "Hi" --text "Hello!" --from me@example.com',
    '<%= config.bin %> emails send --to a@example.com --template "Welcome" --from me@example.com',
    '<%= config.bin %> emails send --to-list Newsletter --template "Promo" --from me@example.com',
    '<%= config.bin %> emails send --to a@example.com --subject Hi --text Hello --dry-run --json',
    '<%= config.bin %> emails send   # interactive form on a TTY',
  ];

  static override flags = {
    to: Flags.string({
      summary: 'Recipient address. Repeat the flag or use commas for multiple.',
      multiple: true,
      helpValue: '<email>',
    }),
    'to-list': Flags.string({
      summary: 'Send to every contact of this list (requires --template).',
      helpValue: '<name>',
      exclusive: ['to'],
    }),
    subject: Flags.string({ summary: 'Email subject line.', helpValue: '<text>' }),
    text: Flags.string({ summary: 'Plain-text body.', helpValue: '<text>' }),
    html: Flags.string({ summary: 'HTML body.', helpValue: '<html>' }),
    template: Flags.string({
      summary: 'Use a saved template as the message content.',
      helpValue: '<name>',
      exclusive: ['text', 'html'],
    }),
    from: Flags.string({
      summary: 'Sender address. Falls back to the configured default-from.',
      helpValue: '<email>',
    }),
    'dry-run': Flags.boolean({
      summary: 'Validate and print the request without sending.',
      default: false,
    }),
  };

  async run(): Promise<SendResult> {
    if (this.flags['to-list']) {
      return this.runCampaign(this.flags['to-list']);
    }
    return this.runTransactional();
  }

  /** Sends a saved template to a whole list by creating an Active campaign. */
  private async runCampaign(listName: string): Promise<SendResult> {
    const from = this.flags.from?.trim() || loadConfig().defaultFrom;
    if (!this.flags.template) {
      this.error('--to-list requires --template (campaign content must be a saved template).', {
        exit: ExitCode.InvalidInput,
      });
    }
    if (!from) {
      this.error('A sender address is required. Pass --from or set a default with `auth set-key`.', {
        exit: ExitCode.InvalidInput,
      });
    }

    const campaignName = `cli-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const campaign: Campaign = {
      Name: campaignName,
      Status: 'Active',
      Recipients: { ListNames: [listName] },
      Content: [
        {
          From: from,
          TemplateName: this.flags.template,
          ...(this.flags.subject ? { Subject: this.flags.subject } : {}),
        },
      ],
    };

    const result: SendResult = {
      dryRun: this.flags['dry-run'],
      mode: 'campaign',
      to: [],
      toList: listName,
      subject: this.flags.subject ?? '',
      request: campaign,
      campaignName,
    };

    if (this.flags['dry-run']) {
      if (!this.jsonEnabled()) {
        this.log('Dry run — the following campaign would be created (Status: Active):');
        this.log(JSON.stringify(campaign, null, 2));
        this.log('\nNothing was sent (--dry-run).');
      }
      return result;
    }

    const { client } = this.requireClient();
    try {
      const task = client.createCampaign(campaign);
      const created = this.interactive
        ? await withSpinner(`Sending to list "${listName}"…`, task)
        : await task;
      result.campaignName = created?.Name ?? campaignName;
    } catch (err) {
      this.fail(err);
    }

    if (!this.jsonEnabled()) {
      this.log(`✓ Campaign "${result.campaignName}" is sending to list "${listName}".`);
    }

    return result;
  }

  private async runTransactional(): Promise<SendResult> {
    const useForm = this.interactive && (!this.flags.to || this.flags.to.length === 0);

    const collected = useForm ? await this.collectInteractive() : this.collectFromFlags();
    if (!collected) {
      // User cancelled the interactive form.
      this.log('Cancelled — nothing was sent.');
      return {
        dryRun: this.flags['dry-run'],
        mode: 'transactional',
        to: [],
        subject: '',
        request: { Recipients: { To: [] }, Content: { Body: [] } },
      };
    }

    const errors = validateSendInput(collected);
    if (errors.length > 0) {
      const message = errors.map((e) => `  • ${e.message}`).join('\n');
      this.error(`Cannot send email:\n${message}`, { exit: ExitCode.InvalidInput });
    }

    const { valid: recipients } = parseRecipients(collected.to);
    const request = this.buildRequest(recipients, collected);

    const result: SendResult = {
      dryRun: this.flags['dry-run'],
      mode: 'transactional',
      to: recipients,
      subject: collected.subject ?? '',
      request,
    };

    if (this.flags['dry-run']) {
      if (!this.jsonEnabled()) {
        this.log('Dry run — the following request would be sent:');
        this.log(JSON.stringify(request, null, 2));
        this.log('\nNo email was sent (--dry-run).');
      }
      return result;
    }

    const { client } = this.requireClient();
    try {
      const send = client.sendTransactional(request);
      const sendResult = this.interactive
        ? await withSpinner('Sending email…', send)
        : await send;
      result.messageId = sendResult.MessageID;
      result.transactionId = sendResult.TransactionID;
    } catch (err) {
      this.fail(err);
    }

    if (!this.jsonEnabled()) {
      this.log(`✓ Email sent to ${recipients.join(', ')}.`);
      if (result.messageId) this.log(`  MessageID: ${result.messageId}`);
      if (result.transactionId) {
        this.log(`  TransactionID: ${result.transactionId}`);
        this.log(`  Check delivery: ${this.config.bin} emails status ${result.transactionId}`);
      }
    }

    return result;
  }

  /** Builds the normalized input from CLI flags, applying the config default-from. */
  private collectFromFlags() {
    const from = this.flags.from?.trim() || loadConfig().defaultFrom;
    return {
      to: this.flags.to ?? [],
      subject: this.flags.subject,
      text: this.flags.text,
      html: this.flags.html,
      template: this.flags.template,
      from,
    };
  }

  /** Runs the Ink compose form, seeded with any flags the user already passed. */
  private async collectInteractive() {
    this.showBanner();
    const defaultFrom = this.flags.from?.trim() || loadConfig().defaultFrom;
    const values = await promptSendEmail({
      from: defaultFrom ?? '',
      to: (this.flags.to ?? []).join(', '),
      subject: this.flags.subject ?? '',
      text: this.flags.text ?? '',
      html: this.flags.html ?? '',
    });
    if (!values) return null;
    return {
      to: values.to.length > 0 ? [values.to] : [],
      subject: values.subject,
      text: values.text,
      html: values.html,
      template: this.flags.template,
      from: values.from,
    };
  }

  private buildRequest(
    recipients: string[],
    input: { subject?: string; text?: string; html?: string; from?: string; template?: string },
  ): EmailMessageData {
    const body: BodyPart[] = [];
    if (input.html && input.html.trim().length > 0) {
      body.push({ ContentType: 'HTML', Charset: 'utf-8', Content: input.html });
    }
    if (input.text && input.text.trim().length > 0) {
      body.push({ ContentType: 'PlainText', Charset: 'utf-8', Content: input.text });
    }
    return {
      Recipients: { To: recipients },
      Content: {
        ...(body.length > 0 ? { Body: body } : { Body: [] }),
        From: input.from,
        ...(input.subject ? { Subject: input.subject } : {}),
        ...(input.template ? { TemplateName: input.template } : {}),
      },
    };
  }
}

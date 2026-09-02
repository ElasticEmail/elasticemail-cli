import { readFileSync } from 'node:fs';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { withSpinner } from '../../ui/spinner.js';
import type { BodyPart, TemplateDetail, TemplateScope } from '../../api/types.js';

export default class TemplatesCreate extends BaseCommand<typeof TemplatesCreate> {
  static override summary = 'Create an HTML template.';
  static override description =
    'Creates a template from HTML passed via --html-file, --html, or piped to stdin ' +
    '(--html-file -). Use it later with `emails send --template <name>`.';

  static override examples = [
    '<%= config.bin %> templates create "Welcome" --html-file welcome.html --subject "Welcome!"',
    '<%= config.bin %> templates create "Promo" --html "<h1>Sale!</h1>"',
    'cat welcome.html | <%= config.bin %> templates create "Welcome" --html-file -',
  ];

  static override args = {
    name: Args.string({ description: 'Name for the new template.', required: true }),
  };

  static override flags = {
    'html-file': Flags.string({
      summary: 'Path to an HTML file ("-" reads from stdin).',
      helpValue: '<path>',
      exclusive: ['html'],
    }),
    html: Flags.string({ summary: 'Inline HTML content.', helpValue: '<html>' }),
    subject: Flags.string({
      summary: 'Default subject stored with the template.',
      helpValue: '<text>',
    }),
    text: Flags.string({
      summary: 'Optional plain-text alternative body.',
      helpValue: '<text>',
    }),
    scope: Flags.string({
      summary: 'Template scope.',
      options: ['Personal', 'Global'],
      default: 'Personal',
    }),
  };

  async run(): Promise<TemplateDetail> {
    const html = this.readHtml();
    if (!html || html.trim().length === 0) {
      this.error('No HTML content given. Provide --html-file <path>, --html, or pipe to stdin.', {
        exit: ExitCode.InvalidInput,
      });
    }

    const body: BodyPart[] = [{ ContentType: 'HTML', Charset: 'utf-8', Content: html }];
    if (this.flags.text && this.flags.text.trim().length > 0) {
      body.push({ ContentType: 'PlainText', Charset: 'utf-8', Content: this.flags.text });
    }

    const { client } = this.requireClient();

    let template: TemplateDetail;
    try {
      const task = client.createTemplate({
        Name: this.args.name,
        Subject: this.flags.subject,
        Body: body,
        TemplateScope: this.flags.scope as TemplateScope,
      });
      template = this.interactive ? await withSpinner('Creating template…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    if (!this.jsonEnabled()) {
      this.log(`✓ Created template "${this.args.name}".`);
      this.log(`  Send with it: ${this.config.bin} emails send --template "${this.args.name}" --to <email>`);
    }

    return template ?? { Name: this.args.name };
  }

  /** Resolves HTML from --html, --html-file <path>, or stdin (--html-file -). */
  private readHtml(): string | undefined {
    if (this.flags.html) return this.flags.html;
    const file = this.flags['html-file'];
    if (!file) {
      // Allow a bare pipe without flags: read stdin when it's not a TTY.
      if (!process.stdin.isTTY) {
        try {
          return readFileSync(0, 'utf8');
        } catch {
          return undefined;
        }
      }
      return undefined;
    }
    try {
      return file === '-' ? readFileSync(0, 'utf8') : readFileSync(file, 'utf8');
    } catch (err) {
      this.error(
        `Cannot read HTML file ${file}: ${err instanceof Error ? err.message : String(err)}`,
        { exit: ExitCode.InvalidInput },
      );
    }
  }
}

import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { formatTemplateType } from '../../lib/template-type.js';
import { withSpinner } from '../../ui/spinner.js';
import type { TemplateDetail } from '../../api/types.js';

export default class TemplatesGet extends BaseCommand<typeof TemplatesGet> {
  static override summary = 'Show a single template, including its body.';

  static override examples = [
    '<%= config.bin %> templates get "My template"',
    '<%= config.bin %> templates get "My template" --body',
    '<%= config.bin %> templates get "My template" --json',
  ];

  static override args = {
    name: Args.string({ description: 'Template name.', required: true }),
  };

  static override flags = {
    body: Flags.boolean({
      summary: 'Print the full template body instead of just metadata.',
      default: false,
    }),
  };

  async run(): Promise<TemplateDetail> {
    const { client } = this.requireClient();

    let template: TemplateDetail;
    try {
      const task = client.getTemplate(this.args.name);
      template = this.interactive ? await withSpinner('Loading template…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    if (this.jsonEnabled()) {
      return template;
    }

    this.log(`Name:       ${template.Name}`);
    if (template.Subject) this.log(`Subject:    ${template.Subject}`);
    if (template.TemplateType) this.log(`Type:       ${formatTemplateType(template.TemplateType)}`);
    if (template.TemplateScope) this.log(`Scope:      ${template.TemplateScope}`);
    if (template.DateAdded) this.log(`Date added: ${template.DateAdded}`);

    const parts = template.Body ?? [];
    if (this.flags.body) {
      for (const part of parts) {
        this.log('');
        this.log(`--- ${part.ContentType} ---`);
        this.log(part.Content ?? '');
      }
    } else if (parts.length > 0) {
      this.log(`Body parts: ${parts.map((p) => p.ContentType).join(', ')} (use --body to print)`);
    }

    return template;
  }
}

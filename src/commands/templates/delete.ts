import { Args } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { withSpinner } from '../../ui/spinner.js';

interface DeleteResult {
  deleted: boolean;
  name: string;
}

export default class TemplatesDelete extends BaseCommand<typeof TemplatesDelete> {
  static override summary = 'Delete a template.';

  static override examples = [
    '<%= config.bin %> templates delete "My template"',
    '<%= config.bin %> templates delete "My template" --json',
  ];

  static override args = {
    name: Args.string({ description: 'Template name.', required: true }),
  };

  async run(): Promise<DeleteResult> {
    const { client } = this.requireClient();

    try {
      const task = client.deleteTemplate(this.args.name);
      if (this.interactive) {
        await withSpinner('Deleting template…', task);
      } else {
        await task;
      }
    } catch (err) {
      this.fail(err);
    }

    const result: DeleteResult = { deleted: true, name: this.args.name };
    if (!this.jsonEnabled()) {
      this.log(`✓ Deleted template "${this.args.name}".`);
    }
    return result;
  }
}

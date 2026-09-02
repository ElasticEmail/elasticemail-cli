import { Flags } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { ExitCode } from '../../lib/exit-codes.js';
import { paginationFlags, resolvePagination } from '../../lib/pagination.js';
import { renderTable } from '../../lib/table.js';
import { formatTemplateType } from '../../lib/template-type.js';
import { withSpinner } from '../../ui/spinner.js';
import { SENDABLE_TEMPLATE_TYPES, type Template, type TemplateScope } from '../../api/types.js';

interface TemplatesListResult {
  limit: number;
  offset: number;
  count: number;
  templates: Template[];
}

export default class TemplatesList extends BaseCommand<typeof TemplatesList> {
  static override summary = 'List your Elastic Email templates.';
  static override description =
    'By default only sendable email templates are shown ' +
    `(${SENDABLE_TEMPLATE_TYPES.join(', ')}). Use --all for every type, or --type to filter.`;

  static override examples = [
    '<%= config.bin %> templates list',
    '<%= config.bin %> templates list --page 2 --page-size 10',
    '<%= config.bin %> templates list --all',
    '<%= config.bin %> templates list --type RawHTML --scope Global --json',
  ];

  static override flags = {
    ...paginationFlags,
    scope: Flags.string({
      summary: 'Template scope filter.',
      options: ['Personal', 'Global'],
    }),
    type: Flags.string({
      summary: 'Filter by template type(s), comma-separated (e.g. RawHTML,DragDropEditor).',
      helpValue: '<types>',
      exclusive: ['all'],
    }),
    all: Flags.boolean({
      summary: 'Show every template type (including landing pages etc.).',
      default: false,
    }),
  };

  async run(): Promise<TemplatesListResult> {
    const { limit, offset, conflict } = resolvePagination(this.flags);
    if (conflict) {
      this.error(conflict, { exit: ExitCode.InvalidInput });
    }

    const { client } = this.requireClient();

    let templates: Template[];
    try {
      const templateTypes = this.flags.all
        ? undefined
        : this.flags.type
          ? this.flags.type.split(',').map((t) => t.trim()).filter(Boolean)
          : SENDABLE_TEMPLATE_TYPES;
      const task = client.listTemplates({
        limit,
        offset,
        scopeType: this.flags.scope as TemplateScope | undefined,
        templateTypes,
      });
      templates = this.interactive ? await withSpinner('Loading templates…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    const result: TemplatesListResult = { limit, offset, count: templates.length, templates };

    if (this.jsonEnabled()) {
      return result;
    }

    if (templates.length === 0) {
      this.log('No templates found for this page.');
      return result;
    }

    this.log(`Templates (showing ${templates.length}, offset ${offset}):`);
    this.log('');
    for (const line of renderTable(templates, [
      { header: 'Name', value: (t) => t.Name },
      { header: 'Type', value: (t) => formatTemplateType(t.TemplateType) },
      { header: 'Scope', value: (t) => t.TemplateScope },
      { header: 'Date added', value: (t) => t.DateAdded },
    ])) {
      this.log(line);
    }

    return result;
  }
}

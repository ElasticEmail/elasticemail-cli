import { Args } from '@oclif/core';
import { BaseCommand } from '../../lib/base-command.js';
import { withSpinner } from '../../ui/spinner.js';

interface DeleteResult {
  deleted: boolean;
  name: string;
}

export default class ListsDelete extends BaseCommand<typeof ListsDelete> {
  static override summary = 'Delete a contact list (contacts themselves are kept).';

  static override examples = [
    '<%= config.bin %> lists delete Newsletter',
    '<%= config.bin %> lists delete Newsletter --json',
  ];

  static override args = {
    name: Args.string({ description: 'Name of the list to delete.', required: true }),
  };

  async run(): Promise<DeleteResult> {
    const { client } = this.requireClient();

    try {
      const task = client.deleteList(this.args.name);
      if (this.interactive) {
        await withSpinner('Deleting list…', task);
      } else {
        await task;
      }
    } catch (err) {
      this.fail(err);
    }

    const result: DeleteResult = { deleted: true, name: this.args.name };
    if (!this.jsonEnabled()) {
      this.log(`✓ Deleted list "${this.args.name}".`);
    }
    return result;
  }
}

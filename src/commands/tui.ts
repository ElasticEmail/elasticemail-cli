import { BaseCommand } from '../lib/base-command.js';
import { ExitCode } from '../lib/exit-codes.js';
import { createClient } from '../api/client.js';
import { resolveApiKey } from '../config/api-key.js';
import { updateConfig } from '../config/config.js';

interface TuiResult {
  ok: boolean;
}

/**
 * Fully interactive, keyboard-driven mode. Also what a bare `elastic-email`
 * invocation runs on a TTY (see bin/run.js / bin/dev.js).
 */
export default class Tui extends BaseCommand<typeof Tui> {
  static override summary = 'Interactive mode — browse and act with the keyboard.';
  static override description =
    'Arrow keys navigate, Enter opens/selects, ←/→ switch pages, Esc goes back. ' +
    'Running `<%= config.bin %>` with no arguments on a terminal starts this mode.';

  static override examples = ['<%= config.bin %>', '<%= config.bin %> tui'];

  async run(): Promise<TuiResult> {
    if (!this.interactive) {
      this.error(
        'Interactive mode needs a real terminal (TTY) and cannot be combined with --json.',
        { exit: ExitCode.InvalidInput },
      );
    }

    this.showBanner();

    // Resolve the key; offer to set it up interactively when missing.
    const flagValue = (this.flags as Record<string, unknown>)['api-key'] as string | undefined;
    let { key } = resolveApiKey(flagValue);
    if (!key) {
      const { promptApiKey } = await import('../ui/ApiKeyForm.js');
      const entered = await promptApiKey();
      if (!entered) {
        this.error('No API key — cannot start interactive mode.', {
          exit: ExitCode.MissingApiKey,
        });
      }
      updateConfig({ apiKey: entered });
      key = entered;
      this.log('API key saved.\n');
    }

    const client = createClient(key);

    // Best-effort account lookup: the email feeds sender hints, and the
    // product type gates list-sending (campaigns are a Marketing feature).
    let accountEmail: string | undefined;
    let allowListSend = false;
    try {
      const general = (await client.getAccount()).GeneralInfo;
      accountEmail = general?.UserName;
      allowListSend = general?.ProductType === 'Marketing';
    } catch {
      accountEmail = undefined;
    }

    const { runTui } = await import('../ui/tui/App.js');
    await runTui(client, { accountEmail, allowListSend });

    return { ok: true };
  }
}

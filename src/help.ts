import { Help } from '@oclif/core';
import { printBanner } from './banner.js';

/**
 * Custom help renderer. On the root help screen (no command, or bare `--help`)
 * it prints the ASCII banner and a short getting-started footer — but only on a
 * real TTY and never in `--json` mode, so piped/CI output stays clean.
 *
 * Wired via the `oclif.helpClass` field in package.json. oclif applies its
 * tsPath remapping so `./dist/help` resolves to `./src/help.ts` in dev mode.
 */
export default class CustomHelp extends Help {
  private get jsonRequested(): boolean {
    return process.argv.includes('--json');
  }

  override async showRootHelp(): Promise<void> {
    printBanner({ isTty: Boolean(process.stdout.isTTY), json: this.jsonRequested });
    await super.showRootHelp();
    this.printGettingStarted();
  }

  /**
   * Root help shows a VERSION section that defaults to the full user-agent
   * string (`name/x.y.z platform-arch node-vNN`); shorten it to `bin/x.y.z`.
   */
  protected override formatRoot(): string {
    return super
      .formatRoot()
      .replace(this.config.userAgent, `${this.config.bin}/${this.config.version}`);
  }

  private printGettingStarted(): void {
    if (!process.stdout.isTTY || this.jsonRequested) return;
    const bin = this.config.bin;
    this.log('');
    this.log('GETTING STARTED');
    this.log(`  1. ${bin} auth set-key        Store your Elastic Email API key`);
    this.log(`  2. ${bin} emails send         Send your first email`);
    this.log('');
    this.log('  You can also set the ELASTIC_EMAIL_API_KEY environment variable.');
    this.log('  Add --json to any command for clean, machine-readable output.');
    this.log('');
  }
}

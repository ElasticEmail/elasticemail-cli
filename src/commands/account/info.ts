import { BaseCommand } from '../../lib/base-command.js';
import { withSpinner } from '../../ui/spinner.js';

interface AccountInfoResult {
  userName?: string;
  productType?: string;
  supportPlan?: string;
  dateCreated?: string;
  /** Maximum email size in MB. */
  emailSizeLimitMB?: number;
  /** Account-wide BCC — every sent email is silently copied to these address(es). */
  bccEmailAddresses?: string;
}

export default class AccountInfo extends BaseCommand<typeof AccountInfo> {
  static override summary = 'Show basic account information.';
  static override description =
    'Reports the account name, product type, support plan, creation date, and email ' +
    'size limit. For sending statistics use `account stats`.';

  static override examples = [
    '<%= config.bin %> account info',
    '<%= config.bin %> account info --json',
  ];

  async run(): Promise<AccountInfoResult> {
    const { client } = this.requireClient();

    let info;
    try {
      const task = client.getAccount();
      info = this.interactive ? await withSpinner('Loading account info…', task) : await task;
    } catch (err) {
      this.fail(err);
    }

    const general = info.GeneralInfo ?? {};
    const bccEmail = info.AdvancedOptions?.BccEmail?.trim();
    const result: AccountInfoResult = {
      userName: general.UserName,
      productType: general.ProductType,
      supportPlan: general.SupportPlan,
      dateCreated: general.DateCreated,
      emailSizeLimitMB: general.EmailSizeLimit,
      ...(bccEmail ? { bccEmailAddresses: bccEmail } : {}),
    };

    if (this.jsonEnabled()) {
      return result;
    }

    this.log(`Account:          ${result.userName ?? '-'}`);
    this.log(`Product type:     ${result.productType ?? '-'}`);
    this.log(`Support plan:     ${result.supportPlan ?? '-'}`);
    this.log(`Created:          ${result.dateCreated ?? '-'}`);
    this.log(
      `Email size limit: ${result.emailSizeLimitMB !== undefined ? `${result.emailSizeLimitMB} MB` : '-'}`,
    );
    if (result.bccEmailAddresses) {
      this.log(`BCC email address(es): ${result.bccEmailAddresses}`);
      this.log('  (account-wide setting — every sent email is also delivered there)');
    }

    return result;
  }
}

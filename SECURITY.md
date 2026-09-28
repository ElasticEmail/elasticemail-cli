# Security Policy

## Supported versions

Security fixes are released for the latest [npm release](https://www.npmjs.com/package/elastic-email-cli) of the CLI. Please update (`npm install -g elastic-email-cli@latest`) before reporting an issue.

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | :white_check_mark: |
| < 0.2   | :x:                |

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report them privately by one of these methods:

- [GitHub private vulnerability reporting](https://github.com/ElasticEmail/elasticemail-cli/security/advisories/new)
- Email **integrations@elasticemail.com** with the subject `Security: elasticemail-cli`

Please include:

- A description of the issue and its impact
- Steps to reproduce, or a proof of concept
- The affected version or commit

We will acknowledge your report, investigate, and keep you updated on the fix. Please give us reasonable time to release a fix before disclosing the issue publicly.

## How the CLI stores your API key

`elastic-email auth set-key` saves the key in `~/.elastic-email-cli/config.json` (or `$ELASTIC_EMAIL_CLI_CONFIG_DIR`). The file is created with mode `0600` and the directory with mode `0700`, so only your user can read them. In CI, prefer the `ELASTIC_EMAIL_API_KEY` environment variable from your secret store over the config file or the `--api-key` flag, which can end up in shell history and process listings.

The CLI never prints the full key. It is masked in `auth status` and left out of error output.

## API key safety

If you think an API key has been exposed (in a commit, log, issue or screenshot), revoke it right away in your [Elastic Email API settings](https://app.elasticemail.com/marketing/settings/new/manage-api) and create a new one.

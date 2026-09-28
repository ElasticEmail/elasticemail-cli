# Contributing to the Elastic Email CLI

Thanks for taking the time to contribute! This document explains how to report problems, suggest changes and submit pull requests.

## Reporting bugs

Search [existing issues](https://github.com/ElasticEmail/elasticemail-cli/issues) first. If nothing matches, open a new issue and include:

- CLI version (`elastic-email --version`)
- Node.js version (`node --version`) and operating system
- The exact command you ran, and whether it was interactive (TTY) or piped / `--json`
- The full error message and the exit code (`echo $?`)

**Never paste your API key** into an issue, log or code sample. The CLI masks it in its own output, so keep it that way when sharing terminal output.

Questions about your Elastic Email account, sending limits, deliverability or billing aren't handled in this repository. The preferred way to get help is the **chat widget on [elasticemail.com](https://elasticemail.com)**.

## Suggesting features

Open an issue describing the use case first and the solution second. It helps us decide whether the change belongs in the CLI, the API or the documentation.

## Security issues

Please do **not** report security vulnerabilities in public issues. Use [GitHub private vulnerability reporting](https://github.com/ElasticEmail/elasticemail-cli/security/advisories/new) or email **integrations@elasticemail.com** with the subject `Security: elasticemail-cli`.

## Development setup

Requirements: [Node.js](https://nodejs.org) 20 or later.

```bash
git clone https://github.com/ElasticEmail/elasticemail-cli.git
cd elasticemail-cli
npm install
./bin/dev.js --help          # run from TypeScript source, no build needed
npm test
npm run lint
```

To smoke-test without touching your real account, point the config dir at a temp folder and unset the API key:

```bash
ELASTIC_EMAIL_CLI_CONFIG_DIR=$(mktemp -d) ELASTIC_EMAIL_API_KEY= ./bin/dev.js contacts list
```

Architecture notes, the command pattern and known gotchas live in [CLAUDE.md](CLAUDE.md). Please read it before adding a command.

## Pull requests

1. Fork the repository and create a branch from `master` (`git checkout -b fix/short-description`).
2. Keep each change focused. One logical change per pull request.
3. Make sure `npm run build`, `npm test` and `npm run lint` pass.
4. Keep the `--json` / non-TTY output pipe- and CI-safe, and don't change [exit codes](README.md#exit-codes): scripts rely on them.
5. New destructive commands must ask for confirmation and support `--yes`.
6. Update [README.md](README.md) if your change affects how the CLI is used.
7. Open a pull request against `master`.

A maintainer will review your pull request and may ask for changes.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

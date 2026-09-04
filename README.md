<h1 align="center">
  Elastic Email CLI
</h1>
<p align="center">A command-line interface for the <a href="https://elasticemail.com/developers/api-documentation/rest-api">Elastic Email API</a>: send transactional emails and campaigns, manage templates, contacts, lists and segments, track delivery — interactively or fully scripted.

<p align="center">
<a href="http://www.opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-brightgreen.svg" alt="License: MIT"></a>
</p>


### Key Features

- **Interactive mode**. Run `elastic-email` with no arguments to get a keyboard-driven TUI: browse everything, pick with arrows, and send email through a guided wizard.
- **Script-friendly**. Every command supports `--json`, exit codes are stable, and piped/CI output carries no banner or decorations.
- **Full sending toolkit**. From transactional emails, saved templates, and campaigns to whole lists or segments.

### Requirements

- Node.js 20 or newer
- An [Elastic Email](https://elasticemail.com) account and API key (dashboard → Settings → API)


## Getting Started

```bash
npm install -g elastic-email-cli
elastic-email --help
```

or run it without installing:

```bash
npx elastic-email-cli --help
```

### Install from source

```bash
git clone https://github.com/your-org/elastic-email-cli.git
cd elastic-email-cli
npm install
npm run build
npm link                                # makes the elastic-email command available globally
elastic-email --help
```

### Authentication

The API key is resolved in this order: `--api-key` flag → `ELASTIC_EMAIL_API_KEY` environment variable → local config file.

```bash
elastic-email auth set-key              # interactive, masked prompt
elastic-email auth set-key <key>        # non-interactive (CI)
elastic-email auth set-key <key> --default-from sender@yourdomain.com
elastic-email auth status               # where the key comes from + live connection test
elastic-email auth clear                # remove the local config
```

> ⚠️ `auth set-key` stores the key in plaintext at `~/.elastic-email-cli/config.json`
> with `0600` permissions. Convenient, but not an OS keychain - treat the file as a
> secret and prefer the `ELASTIC_EMAIL_API_KEY` environment variable in shared or CI
> environments. The key is never printed to logs or errors (only a masked form).

## Interactive mode

A bare invocation in a terminal opens the interactive mode (also available as `elastic-email tui`):

```bash
elastic-email
```

- **↑/↓** move · **Enter** open/select · **←/→** pages · **Space** multi-select · **Esc** back · **q** quit.
- Browse templates, lists (and their contacts), contacts, segments (and their contacts), delivery events, verification results, sender domains, statistics, and account info.
- Guided send wizard: sender (with verified-domain hints), recipients - addresses, or multi-selected lists/segments on Marketing-plan accounts - content (text, HTML, or a saved template), review, send.
- Verify an email address interactively; **forget me** (`f` in Account info) removes the local config after confirmation.
- Prompts for an API key on first run.

In pipes, redirects, and CI (no TTY), a bare invocation prints plain help instead - interactive mode never breaks scripted usage.

## Demo

```bash
elastic-email auth set-key
elastic-email emails send --to you@example.com --subject "Hello" --text "It works!" --from me@yourdomain.com
elastic-email emails status <transactionid>
elastic-email templates create "Welcome" --html-file welcome.html --subject "Welcome!"
elastic-email emails send --to-list Newsletter --template "Welcome" --from me@yourdomain.com
```

## JSON output

Add `--json` to any command for clean, machine-readable output:

```bash
elastic-email account info --json
elastic-email emails send --to a@example.com --subject Hi --text Hello --from me@yourdomain.com --json | jq '.messageId'
```

## Dry run

`emails send --dry-run` validates the input and prints the exact request that would be sent — no API call is made:

```bash
elastic-email emails send --to a@example.com --subject Hi --text Hello --from me@yourdomain.com --dry-run
```

## Commands

### Auth

```bash
elastic-email auth set-key [key]        # store the API key (interactive without [key])
elastic-email auth status               # key source + live connection test
elastic-email auth clear                # remove the locally stored config
```

### Sending

```bash
elastic-email emails send --to <email> --subject <s> --text <t> --from <email>
                                        # send a transactional email
elastic-email emails send --to <email> --subject <s> --html "<b>Hi</b>" --from <email>
                                        # HTML body (combine with --text for both parts)
elastic-email emails send --to "a@x.com,b@x.com" ...
                                        # multiple recipients (or repeat --to)
elastic-email emails send --to <email> --template <name> --from <email>
                                        # send a saved template (--subject optional)
elastic-email emails send --to-list <list> --template <name> --from <email>
                                        # send to a whole list (creates an Active campaign)
elastic-email emails send               # interactive compose form on a TTY
elastic-email emails send ... --dry-run # validate + preview without sending
elastic-email emails status <transactionid>
                                        # delivery counts for a sent email
elastic-email emails status <transactionid> --recipients
                                        # include per-recipient address lists
```

`--from` is required for every send unless you configured a default sender
(`elastic-email auth set-key <key> --default-from sender@yourdomain.com`).

### Templates

```bash
elastic-email templates list            # sendable email templates
elastic-email templates list --all      # every type (landing pages etc.)
elastic-email templates get <name>      # metadata (--body prints the full body)
elastic-email templates create <name> --html-file <path>
                                        # create an HTML template ("-" reads stdin)
elastic-email templates create <name> --html "<h1>Hi</h1>" --subject <s>
elastic-email templates delete <name>
```

### Contacts & lists

```bash
elastic-email contacts list             # all contacts
elastic-email contacts get <email>
elastic-email contacts add <email> --first-name <n> --list <list>
elastic-email contacts add "a@x.com,b@x.com" --list <list>
                                        # comma-separated batch
elastic-email contacts delete <email>
elastic-email lists                     # your contact lists
elastic-email lists contacts <name>     # contacts that belong to a list
elastic-email lists create <name> --allow-unsubscribe
elastic-email lists delete <name>       # contacts themselves are kept
```

### Segments

```bash
elastic-email segments list             # segments with their rules
elastic-email segments contacts <name>  # contacts matching a segment
```

### Suppressions

```bash
elastic-email suppressions list         # all suppressed addresses
elastic-email suppressions list --type bounces --search <text>
elastic-email suppressions add <email> --type unsubscribes
elastic-email suppressions delete <email>
                                        # allow sending to the address again
```

### Delivery events & verification

```bash
elastic-email events list               # recent sends, opens, clicks, bounces...
elastic-email events list --from 2026-06-01T00:00:00 --limit 50
elastic-email verify <email>            # deliverability check for one address
elastic-email verifications list        # past verification results
```

### Domains & account

```bash
elastic-email domains list              # sender domains + SPF/DKIM/MX/DMARC status
elastic-email domains get <domain>
elastic-email account info              # account name, plan, limits, account-wide BCC
elastic-email account stats             # sending statistics (default: last 30 days)
elastic-email account stats --days 7
```

### Pagination

Every list command (`contacts list`, `templates list`, `segments list`, `events list`,
`suppressions list`, `lists`, ...) paginates the same way - fetch the next page by
incrementing `--page`:

```bash
elastic-email contacts list --page 1 --page-size 50   # first page (default: page 1, 20 items)
elastic-email contacts list --page 2 --page-size 50   # next page
elastic-email templates list --page 3 --page-size 10

elastic-email contacts list --limit 10 --offset 20    # or raw limit/offset style
```

An empty result means you've paged past the last item. In interactive mode
use **←/→** to switch pages.

## Exit codes

| Code | Meaning                                  |
| ---- | ---------------------------------------- |
| `0`  | Success                                  |
| `1`  | Unexpected/general error                 |
| `2`  | No API key found                         |
| `3`  | Invalid input (bad email, missing field) |
| `4`  | Elastic Email API / network error        |

## Configuration via env

```bash
ELASTIC_EMAIL_API_KEY                   # API key (overridden only by --api-key)
ELASTIC_EMAIL_CLI_CONFIG_DIR            # config directory (default ~/.elastic-email-cli)
```

## Shell autocomplete

```bash
elastic-email autocomplete              # install instructions
elastic-email autocomplete zsh          # or bash / fish
```

## Contributing

```bash
npm install
./bin/dev.js --help                     # run from TypeScript source, no build needed
npm run dev -- <command>                # same via npm (the -- is required)
npm test
```

Architecture notes, project layout, and development gotchas live in [CLAUDE.md](CLAUDE.md).

## Issues & Feedback
Feel free to [contact us](https://elasticemail.com/contact) if you encounter any issues with the library. Please leave comments, concerns and requests on the [Issues page](https://github.com/ElasticEmail/elasticemail-cli/issues).

## License

MIT

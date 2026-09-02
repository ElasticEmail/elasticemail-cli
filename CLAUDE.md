# CLAUDE.md

CLI for the Elastic Email REST API v4. TypeScript, pure ESM (`"type": "module"`),
Node 20+, oclif v4, React + Ink 5 for interactive TUI, axios for HTTP, Vitest.
End-user docs live in README.md; this file is for working on the code.

Naming: the npm package is `elastic-email-cli`, but the installed command is
`elastic-email` (`bin` + `oclif.bin` in package.json). Never hardcode the
command name in user-facing strings — use `this.config.bin` (commands) or
`<%= config.bin %>` (static examples). The config dir stays `~/.elastic-email-cli`.

## Commands

```bash
./bin/dev.js <cmd>     # run from TS source via tsx, no build — preferred
npm run dev -- <cmd>   # same; the `--` is REQUIRED or npm eats flags like --page
npm run build          # clean + tsc -> dist/
npm test               # Vitest (test/*.test.ts)
npm run lint           # ESLint (flat config)
./bin/run.js <cmd>     # run the compiled CLI
```

Smoke-test without touching the real account: set
`ELASTIC_EMAIL_CLI_CONFIG_DIR=$(mktemp -d)` (overrides `~/.elastic-email-cli`)
and unset `ELASTIC_EMAIL_API_KEY`, then assert on exit codes.

## Architecture

- `src/lib/base-command.ts` — every command extends `BaseCommand`. It provides
  the `--api-key` base flag, oclif's `--json` (`enableJsonFlag`), `this.interactive`
  (TTY && !json), `showBanner()`, `requireClient()` (key resolution + exit 2),
  and `fail(err)` (ApiError → exit 4, other → exit 1).
- `src/api/client.ts` — one method per endpoint, axios instance with the
  `X-ElasticEmail-ApiKey` header. Every method wraps errors in `toApiError`.
  `src/api/types.ts` holds request/response typings.
- `src/config/api-key.ts` — key resolution priority: `--api-key` flag >
  `ELASTIC_EMAIL_API_KEY` env > config file. Keep this order; it's documented.
- `src/config/config.ts` — config file written with mode 0600, dir 0700.
- `src/lib/` — pure helpers (validate, pagination, table, exit-codes), shared by
  commands, Ink forms, and tests. Keep new logic pure and here when possible.
- `src/ui/` — Ink components. Only ever rendered when `this.interactive`.
- `src/ui/tui/` — the fully interactive mode (`tui` command): `App.tsx` holds a
  screen stack (push/pop on Esc), `components.tsx` has the reusable `Menu`,
  `Browser` (paginated keyboard list), and `Detail` views, `SendWizard.tsx` is
  the step-machine send flow (sender w/ verified-domain hints from
  `src/lib/senders.ts`, addresses or list→campaign, text/HTML/template).
  Bare `elastic-email` on a TTY runs it — both `bin/run.js` and `bin/dev.js`
  inject `tui` into argv when invoked with no args and stdin+stdout are TTYs;
  non-TTY bare invocations still print plain help.
- `src/help.ts` — custom `Help` class (wired via `oclif.helpClass`); prints the
  figlet banner + getting-started footer on root help.

### Command pattern

Each command follows the same shape — copy an existing one (e.g.
`src/commands/contacts/list.ts`):

1. validate input → `this.error(msg, { exit: ExitCode.InvalidInput })`
2. `const { client } = this.requireClient()`
3. `this.interactive ? await withSpinner(label, task) : await task`, errors via `this.fail(err)`
4. return a JSON-serializable result; print human output only when `!this.jsonEnabled()`
5. list commands: spread `...paginationFlags`, use `resolvePagination()` and `renderTable()`

Exit codes (`src/lib/exit-codes.ts`): 0 ok, 1 general, 2 missing key, 3 invalid
input, 4 API/network error. Tests/CI rely on them.

## Hard-won gotchas (do not relearn these)

- **Never create `src/commands/index.ts`.** oclif v4 treats a root index command
  as a "single command CLI" (`SINGLE_COMMAND_CLI_SYMBOL`) and breaks all help
  with `MODULE_NOT_FOUND` warnings. Root-help customization belongs in
  `src/help.ts`. Nested `index.ts` (e.g. `commands/lists/index.ts`) is fine.
- **Positional args are mandatory metadata.** With `topicSeparator: " "`, a
  command that takes a positional value MUST declare it in `static args`,
  otherwise oclif glues the token into the command id
  (`auth set-key KEY` → "command auth:set-key:KEY not found").
- **`GET /templates` requires `scopeType`** — omitting it returns HTTP 400 (not
  401!). The client defaults it to `Personal`; `testConnection()` relies on this.
  When adding endpoints, check the generated-client docs for required params:
  https://github.com/ElasticEmail/elasticemail-javascript/tree/master/docs
- **No backticks in comments in `bin/dev.js`** (or any file tsx parses early) —
  tsx's lexer mistakes them for template literals → "Parse error".
- **API v4 JSON is PascalCase** (`Recipients`, `Content`, `Body`, `ListName`).
  Send body parts as `{ ContentType: 'HTML' | 'PlainText', Charset, Content }`.
  Array query params need `paramsSerializer: { indexes: null }` (see `addContacts`).
- **The v4 API has no account endpoint** — `account info` calls the legacy
  `GET /v3/account` (same `X-ElasticEmail-ApiKey` header works; the only v3
  call in the CLI, see `getAccount()`). Sending stats are v4 `GET /statistics`,
  exposed as `account stats`.
- The `--json` / non-TTY contract: no banner, no Ink, no decorations — output
  must stay pipe- and CI-safe. `shouldShowBanner()` in `src/banner.ts` is the
  single guard; it's unit-tested.
- **Never print the API key.** Use `maskApiKey()` for display and
  `formatApiError()` for errors (it appends the API's message but never
  headers/config). `toApiError` deliberately drops the axios config.
- **Only `SENDABLE_TEMPLATE_TYPES`** (RawHTML, DragDropEditor, TemplateEditor —
  see `src/api/types.ts`) can be email content; landing-page types can't be
  sent. Template lists/pickers filter to these server-side via repeated
  `templateTypes` query params (`templates list --all` disables the filter).
- **No segment-contacts endpoint in v4.** `GET /segments/{name}/contacts` is a
  404; segment membership is read via `GET /contacts?rule=<segment Rule>`
  (see `segments contacts` and the TUI segment screen).
- **Sending to a list = creating a campaign.** v4 has no "send to list"
  endpoint; `emails send --to-list` POSTs `/campaigns` with `Status: 'Active'`
  (starts sending immediately) and requires a saved template for content.
  Campaigns are a Marketing-plan feature — the TUI only offers "send to a
  whole list" when `GeneralInfo.ProductType === 'Marketing'`.
- **TUI screens of the same component type need unique `key` props.** The
  screen stack often renders two `Browser`s back-to-back (lists → contacts of
  a list); without a `key` React keeps the previous screen's state (rows!) and
  skips the refetch, so the new columns render `-` for every cell. `App.tsx`
  derives `screenKey` from the stack — keep passing it to every screen.
- **Don't truncate identifier columns** (names, emails) in `renderTable` /
  TUI `Browser` — users copy them into `get`/`delete`/`--template` commands.
  `maxWidth` is opt-in per column for long free-text only.
- `npm audit` shows dev-only vulns from the vitest/vite chain; they don't ship
  (`files` whitelist publishes only `/bin` + `/dist`). Don't `audit fix --force`.

## Releasing

`prepack` runs build + `oclif manifest`; `prepublishOnly` runs build + tests.
`oclif.manifest.json` is gitignored and generated at pack time.

## Summary

<!-- What does this PR change, and why? Link related issues: Fixes #123 -->

## Type of change

- [ ] Bug fix
- [ ] New or changed command / flag
- [ ] Interactive TUI
- [ ] Documentation
- [ ] Build / CI / tooling
- [ ] Other:

## Checklist

- [ ] `npm run build`, `npm test` and `npm run lint` pass
- [ ] I've run the affected commands (`./bin/dev.js <cmd>`), both interactively and with `--json`
- [ ] `--json` / non-TTY output stays pipe-safe and exit codes are unchanged
- [ ] New destructive commands ask for confirmation and support `--yes`
- [ ] README is updated if usage changed
- [ ] No API keys or other secrets are included

#!/usr/bin/env node
// Production entrypoint. Runs the compiled CLI from ./dist.
import { readFileSync } from 'node:fs';
import { execute } from '@oclif/core';

const firstArg = process.argv[2];

// Print a bare version instead of oclif's default
// "name/x.y.z platform-arch node-vNN" user-agent string.
if (firstArg === '--version' || firstArg === '-v' || firstArg === 'version') {
  const pjson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  console.log(pjson.version);
  process.exit(0);
}

// A bare invocation on a real terminal starts the interactive TUI. In pipes,
// redirects, and CI (no TTY) the default oclif help is shown instead, so
// scripted output stays clean.
if (process.argv.length === 2 && process.stdout.isTTY && process.stdin.isTTY) {
  process.argv.push('tui');
}

await execute({ dir: import.meta.url });

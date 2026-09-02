#!/usr/bin/env -S node --import tsx
// Development entrypoint. Runs the TypeScript sources directly via the tsx
// loader, with no separate build step. oclif development mode maps the compiled
// dist/commands path back to src/commands using the tsconfig outDir and rootDir,
// so .ts and .tsx command files are loaded straight from source.
import { readFileSync } from 'node:fs';
import { execute } from '@oclif/core';

const firstArg = process.argv[2];

// Print a bare version instead of oclif's default user-agent string
// (same behavior as bin/run.js).
if (firstArg === '--version' || firstArg === '-v' || firstArg === 'version') {
  const pjson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  console.log(pjson.version);
  process.exit(0);
}

// A bare invocation on a real terminal starts the interactive TUI (same
// behavior as bin/run.js).
if (process.argv.length === 2 && process.stdout.isTTY && process.stdin.isTTY) {
  process.argv.push('tui');
}

await execute({ development: true, dir: import.meta.url });

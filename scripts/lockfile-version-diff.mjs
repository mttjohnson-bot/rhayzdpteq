#!/usr/bin/env node
/**
 * Compare the installed package versions recorded in two package-lock.json
 * files and print the differences as a Markdown table.
 *
 * Used by the Audit Fix workflow to decide whether `npm audit fix` changed
 * anything. A plain `git diff` is not enough: an npm major other than the
 * one that wrote the lockfile can rewrite metadata (npm 10 strips the `libc`
 * fields npm 11 writes) without changing a single version, which made the
 * workflow report a fix when there was none.
 *
 * Usage: node scripts/lockfile-version-diff.mjs <before.json> <after.json>
 *
 * Prints nothing when no package version was added, removed or changed.
 * Exit codes:
 *   0 — Comparison completed (with or without differences)
 *   1 — Bad arguments or unreadable lockfile
 */

import { readFileSync } from 'node:fs';

const [beforePath, afterPath] = process.argv.slice(2);

if (!beforePath || !afterPath) {
  console.error('Usage: lockfile-version-diff.mjs <before.json> <after.json>');
  process.exit(1);
}

const packages = (path) => JSON.parse(readFileSync(path, 'utf8')).packages ?? {};

const before = packages(beforePath);
const after = packages(afterPath);

const rows = [];
for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
  const from = before[key]?.version;
  const to = after[key]?.version;
  if (from === to) continue;
  const name = key.replace(/^node_modules\//, '') || '(root)';
  rows.push(`| \`${name}\` | ${from ?? '—'} | ${to ?? '—'} |`);
}

if (rows.length > 0) {
  rows.sort();
  console.log('| Package | From | To |');
  console.log('| --- | --- | --- |');
  console.log(rows.join('\n'));
}

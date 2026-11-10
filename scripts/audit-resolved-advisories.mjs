#!/usr/bin/env node
/**
 * Compare two `npm audit --json` reports and print the advisories that the
 * first one has and the second one no longer does, as a Markdown table.
 *
 * Used by the Audit Fix workflow to decide whether `npm audit fix` actually
 * fixed anything. A changed package version is not enough: when an advisory
 * cannot be fixed within the existing semver ranges, `npm audit fix` still
 * moves every package on the vulnerable path to its newest in-range release.
 * The versions change, the advisory stays, and the workflow would propose
 * (and go red over) a "fix" that resolves nothing every time one of those
 * packages ships a patch.
 *
 * Usage: node scripts/audit-resolved-advisories.mjs <before.json> <after.json>
 *
 * Prints nothing when no advisory was resolved.
 * Exit codes:
 *   0 — Comparison completed (with or without resolved advisories)
 *   1 — Bad arguments, or a report that is unreadable or not an audit report
 */

import { readFileSync } from 'node:fs';

const [beforePath, afterPath] = process.argv.slice(2);

if (!beforePath || !afterPath) {
  console.error('Usage: audit-resolved-advisories.mjs <before.json> <after.json>');
  process.exit(1);
}

/**
 * Map of "<package>␟<advisory url>" → row data for every advisory in a report.
 *
 * Only `via` entries that are objects are advisories. String entries name
 * another vulnerable package in the chain and are reached on their own.
 */
const advisories = (path) => {
  let report;
  try {
    report = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`Cannot read audit report ${path}: ${err.message}`);
    process.exit(1);
  }
  // A failed audit (registry unreachable, bad lockfile) writes {"error": …}
  // with no vulnerabilities map. Treating that as "no advisories" would make
  // every advisory look resolved, so it must stop the run instead.
  if (!report || typeof report.vulnerabilities !== 'object' || report.error) {
    console.error(`${path} is not an npm audit report: ${JSON.stringify(report?.error ?? report)}`);
    process.exit(1);
  }

  const found = new Map();
  for (const vuln of Object.values(report.vulnerabilities)) {
    for (const via of vuln.via ?? []) {
      if (typeof via !== 'object' || via === null) continue;
      const id = via.url ?? String(via.source);
      found.set(`${vuln.name}␟${id}`, {
        name: vuln.name,
        severity: via.severity ?? vuln.severity,
        title: via.title ?? '',
        url: via.url ?? '',
      });
    }
  }
  return found;
};

const before = advisories(beforePath);
const after = advisories(afterPath);

const rows = [];
for (const [key, a] of before) {
  if (after.has(key)) continue;
  const advisory = a.url ? `[${a.title || a.url}](${a.url})` : a.title;
  rows.push(`| \`${a.name}\` | ${a.severity} | ${advisory} |`);
}

if (rows.length > 0) {
  rows.sort();
  console.log('| Package | Severity | Advisory |');
  console.log('| --- | --- | --- |');
  console.log(rows.join('\n'));
}

#!/usr/bin/env node
/**
 * Build-time asset manifest check.
 *
 * Scans TypeScript source files for asset path references (strings matching
 * 'assets/...') and verifies each one exists in the dist/ build output.
 *
 * This catches cases where code references an asset that was never generated
 * or copied to the build output — preventing silent 404s in production.
 *
 * Usage:
 *   node scripts/verify-build-assets.mjs
 *
 * Run after `npm run build` to validate the build output.
 *
 * Exit codes:
 *   0 — All referenced assets found in dist/
 *   1 — One or more referenced assets missing
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SRC_DIR = 'src';
const DIST_DIR = 'dist';

// Regex to find asset path strings in source code
// Matches strings like 'assets/characters/owl.glb' or "assets/something/file.ext"
const ASSET_PATH_RE = /['"`](assets\/[^'"`\s]+\.[a-z0-9]+)['"`]/g;

/**
 * Recursively collect all .ts files from a directory.
 */
function collectTsFiles(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsFiles(fullPath));
    } else if (entry.name.endsWith('.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

// Collect all asset paths referenced in source
const referencedAssets = new Map(); // path -> [source files]

for (const tsFile of collectTsFiles(SRC_DIR)) {
  const content = readFileSync(tsFile, 'utf-8');
  let match;
  while ((match = ASSET_PATH_RE.exec(content)) !== null) {
    const assetPath = match[1];
    if (!referencedAssets.has(assetPath)) {
      referencedAssets.set(assetPath, []);
    }
    referencedAssets.get(assetPath).push(tsFile);
  }
}

if (referencedAssets.size === 0) {
  console.log('verify-build-assets: No asset path references found in source — skipping.');
  process.exit(0);
}

// Check if dist/ exists
if (!existsSync(DIST_DIR)) {
  console.error('verify-build-assets: dist/ directory not found. Run `npm run build` first.');
  process.exit(1);
}

let missing = 0;
let found = 0;

console.log(`Checking ${referencedAssets.size} referenced asset path(s) against dist/...\n`);

for (const [assetPath, sourceFiles] of referencedAssets) {
  const distPath = join(DIST_DIR, assetPath);
  if (existsSync(distPath) && statSync(distPath).isFile()) {
    const size = statSync(distPath).size;
    const sizeKB = (size / 1024).toFixed(1);
    console.log(`  ✓ ${assetPath} (${sizeKB} KB)`);
    found++;
  } else {
    console.error(`  ✗ MISSING: ${assetPath}`);
    console.error(`    Referenced in: ${sourceFiles.join(', ')}`);
    missing++;
  }
}

console.log('');

if (missing > 0) {
  console.error(
    `verify-build-assets: ${missing} asset(s) referenced in source but missing from dist/.\n` +
      `Ensure the asset pipeline generates these files before building.\n` +
      `For .glb files, run: ./scripts/convert-models.sh\n`,
  );
  process.exit(1);
}

console.log(`verify-build-assets: All ${found} referenced asset(s) verified in dist/.`);

#!/usr/bin/env node
/**
 * Verify that all expected .glb model assets exist in public/assets/characters/.
 *
 * This script is called during CI (deploy and quality workflows) to catch
 * missing .glb files before they cause silent 404s in production.
 *
 * It reads the source .vox files from assets/characters/ and checks that a
 * corresponding .glb file AND -silhouette.glb file exist in
 * public/assets/characters/.
 *
 * Exit codes:
 *   0 — All expected .glb files found
 *   1 — One or more .glb files missing
 */

import { readdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const SRC_DIR = 'assets/characters';
const GLB_DIR = 'public/assets/characters';

const voxFiles = readdirSync(SRC_DIR).filter((f) => f.endsWith('.vox'));

if (voxFiles.length === 0) {
  console.log('verify-assets: No .vox source files found — skipping.');
  process.exit(0);
}

let missing = 0;

for (const voxFile of voxFiles) {
  const name = basename(voxFile, '.vox');
  const glbPath = join(GLB_DIR, `${name}.glb`);
  const silGlbPath = join(GLB_DIR, `${name}-silhouette.glb`);

  if (existsSync(glbPath)) {
    console.log(`  ✓ ${glbPath}`);
  } else {
    console.error(`  ✗ MISSING: ${glbPath} (source: ${join(SRC_DIR, voxFile)})`);
    missing++;
  }

  if (existsSync(silGlbPath)) {
    console.log(`  ✓ ${silGlbPath}`);
  } else {
    console.error(`  ✗ MISSING: ${silGlbPath} (source: ${join(SRC_DIR, voxFile)})`);
    missing++;
  }
}

if (missing > 0) {
  console.error(
    `\nverify-assets: ${missing} .glb file(s) missing. Run the model conversion pipeline:\n` +
      `  ./scripts/convert-models.mjs\n` +
      `Or trigger the "Convert Character Models" GitHub Actions workflow.\n`
  );
  process.exit(1);
}

console.log(`\nverify-assets: All ${voxFiles.length} model(s) and silhouette(s) verified.`);

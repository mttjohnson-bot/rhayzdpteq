#!/usr/bin/env bash
# Convert .vox character models to optimized .glb for Three.js
#
# Prerequisites:
#   - v-optimizer: https://github.com/nicholasgasior/v-optimizer
#   - gltfpack:    https://github.com/nicholasgasior/gltfpack (meshoptimizer)
#
# Usage:
#   ./scripts/convert-models.sh
#
# Reads .vox files from assets/characters/ and writes optimized .glb files
# to public/assets/characters/. Only processes files whose source has changed
# (based on md5 hash stored alongside the output).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SRC_DIR="$ROOT_DIR/assets/characters"
OUT_DIR="$ROOT_DIR/public/assets/characters"

mkdir -p "$OUT_DIR"

converted=0
skipped=0

for vox_file in "$SRC_DIR"/*.vox; do
  [ -f "$vox_file" ] || continue

  basename="$(basename "$vox_file" .vox)"
  raw_glb="$OUT_DIR/${basename}_raw.glb"
  final_glb="$OUT_DIR/${basename}.glb"
  hash_file="$OUT_DIR/${basename}.md5"

  # Compute hash of source .vox file
  current_hash="$(md5sum "$vox_file" | cut -d' ' -f1)"

  # Skip if output exists and hash matches
  if [ -f "$final_glb" ] && [ -f "$hash_file" ]; then
    stored_hash="$(cat "$hash_file")"
    if [ "$current_hash" = "$stored_hash" ]; then
      echo "  SKIP $basename.vox (unchanged)"
      skipped=$((skipped + 1))
      continue
    fi
  fi

  echo "  CONVERT $basename.vox → $basename.glb"

  # Step 1: v-optimizer converts .vox → raw .glb
  v-optimizer --input "$vox_file" --output "$raw_glb" --algorithm greedy

  # Step 2: gltfpack optimizes the raw .glb
  gltfpack -i "$raw_glb" -o "$final_glb" -cc -kn

  # Clean up intermediate file
  rm -f "$raw_glb"

  # Store hash for future skip checks
  echo "$current_hash" > "$hash_file"

  converted=$((converted + 1))
done

echo ""
echo "Done: $converted converted, $skipped skipped"

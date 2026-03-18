#!/usr/bin/env node
/**
 * Convert .vox character models to optimized .glb for Three.js.
 *
 * This is a self-contained Node.js script — no external tools required.
 * It parses MagicaVoxel .vox files, builds optimized mesh geometry with
 * neighbor-based face culling and vertex colors, and writes .glb output
 * using @gltf-transform/core.
 *
 * For each model it also generates a `-silhouette.glb` variant — the same
 * geometry scaled outward by 1.15× from center, with no colors or normals.
 * This silhouette mesh is used at runtime for the occlusion outline effect
 * (see OcclusionOutline.ts). Generating it at build time avoids expensive
 * geometry merging in the browser.
 *
 * Usage:
 *   node scripts/convert-models.mjs
 *
 * Reads .vox files from assets/characters/ and writes optimized .glb files
 * to public/assets/characters/. Only processes files whose source has changed
 * (based on MD5 hash stored alongside the output).
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { Document, NodeIO } from '@gltf-transform/core';

const SRC_DIR = 'assets/characters';
const OUT_DIR = 'public/assets/characters';

const OUTLINE_SCALE = 1.15;

// ── .vox parser ──

function defaultPalette() {
  const pal = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    pal[i * 4 + 0] = 255;
    pal[i * 4 + 1] = 255;
    pal[i * 4 + 2] = 255;
    pal[i * 4 + 3] = 255;
  }
  return pal;
}

function parseVox(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
  if (magic !== 'VOX ') throw new Error(`Not a .vox file (magic: ${magic})`);

  let offset = 8; // skip magic + version

  // MAIN chunk header
  offset += 4; // "MAIN"
  offset += 4; // content size
  offset += 4; // children size

  let sizeX = 0, sizeY = 0, sizeZ = 0;
  const voxels = [];
  let palette = defaultPalette();

  while (offset < buffer.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset), view.getUint8(offset + 1),
      view.getUint8(offset + 2), view.getUint8(offset + 3),
    );
    const contentSize = view.getInt32(offset + 4, true);
    const childrenSize = view.getInt32(offset + 8, true);
    offset += 12;

    if (chunkId === 'SIZE') {
      sizeX = view.getInt32(offset, true);
      sizeY = view.getInt32(offset + 4, true);
      sizeZ = view.getInt32(offset + 8, true);
    } else if (chunkId === 'XYZI') {
      const numVoxels = view.getInt32(offset, true);
      for (let i = 0; i < numVoxels; i++) {
        const base = offset + 4 + i * 4;
        voxels.push({
          x: view.getUint8(base),
          y: view.getUint8(base + 1),
          z: view.getUint8(base + 2),
          colorIndex: view.getUint8(base + 3),
        });
      }
    } else if (chunkId === 'RGBA') {
      palette = new Uint8Array(256 * 4);
      for (let i = 0; i < 255; i++) {
        const src = offset + i * 4;
        const dst = (i + 1) * 4;
        palette[dst + 0] = view.getUint8(src);
        palette[dst + 1] = view.getUint8(src + 1);
        palette[dst + 2] = view.getUint8(src + 2);
        palette[dst + 3] = view.getUint8(src + 3);
      }
    }

    offset += contentSize + childrenSize;
  }

  return { sizeX, sizeY, sizeZ, voxels, palette };
}

// ── Shared face definitions ──

const FACES = [
  { dir: [1, 0, 0], vertices: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
  { dir: [-1, 0, 0], vertices: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
  { dir: [0, 1, 0], vertices: [[0,1,0],[0,1,1],[1,1,1],[1,1,0]] },
  { dir: [0, -1, 0], vertices: [[0,0,1],[0,0,0],[1,0,0],[1,0,1]] },
  { dir: [0, 0, 1], vertices: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },
  { dir: [0, 0, -1], vertices: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] },
];

// ── Mesh builders ──

function buildMeshData(model) {
  const { voxels, palette, sizeX, sizeY } = model;

  const occupied = new Set();
  for (const v of voxels) {
    occupied.add(`${v.x},${v.y},${v.z}`);
  }

  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];
  let vertCount = 0;

  for (const v of voxels) {
    const ci = v.colorIndex;
    const r = palette[ci * 4] / 255;
    const g = palette[ci * 4 + 1] / 255;
    const b = palette[ci * 4 + 2] / 255;

    for (const face of FACES) {
      const [dx, dy, dz] = face.dir;
      if (occupied.has(`${v.x + dx},${v.y + dy},${v.z + dz}`)) continue;

      for (const [vx, vy, vz] of face.vertices) {
        // Apply MagicaVoxel Z-up → Y-up transform and centering
        const px = v.x + vx - sizeX / 2;
        const py = v.z + vz; // Z becomes Y
        const pz = -(v.y + vy - sizeY / 2); // Y becomes -Z
        positions.push(px, py, pz);

        // Transform normals the same way
        normals.push(dx, dz, -dy);
        colors.push(r, g, b);
      }

      indices.push(vertCount, vertCount + 1, vertCount + 2);
      indices.push(vertCount, vertCount + 2, vertCount + 3);
      vertCount += 4;
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(colors),
    indices: vertCount < 65536 ? new Uint16Array(indices) : new Uint32Array(indices),
  };
}

/**
 * Build silhouette mesh data — same geometry as the model but:
 *  - No colors or normals (the occlusion material is applied at runtime)
 *  - All vertices scaled outward from the bounding-box center by OUTLINE_SCALE
 */
function buildSilhouetteMeshData(model) {
  const { voxels, sizeX, sizeY } = model;

  const occupied = new Set();
  for (const v of voxels) {
    occupied.add(`${v.x},${v.y},${v.z}`);
  }

  const positions = [];
  const indices = [];
  let vertCount = 0;

  for (const v of voxels) {
    for (const face of FACES) {
      const [dx, dy, dz] = face.dir;
      if (occupied.has(`${v.x + dx},${v.y + dy},${v.z + dz}`)) continue;

      for (const [vx, vy, vz] of face.vertices) {
        const px = v.x + vx - sizeX / 2;
        const py = v.z + vz;
        const pz = -(v.y + vy - sizeY / 2);
        positions.push(px, py, pz);
      }

      indices.push(vertCount, vertCount + 1, vertCount + 2);
      indices.push(vertCount, vertCount + 2, vertCount + 3);
      vertCount += 4;
    }
  }

  // Scale outward from bounding-box center
  const posArray = new Float32Array(positions);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < posArray.length; i += 3) {
    minX = Math.min(minX, posArray[i]);     maxX = Math.max(maxX, posArray[i]);
    minY = Math.min(minY, posArray[i + 1]); maxY = Math.max(maxY, posArray[i + 1]);
    minZ = Math.min(minZ, posArray[i + 2]); maxZ = Math.max(maxZ, posArray[i + 2]);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  for (let i = 0; i < posArray.length; i += 3) {
    posArray[i]     = cx + (posArray[i]     - cx) * OUTLINE_SCALE;
    posArray[i + 1] = cy + (posArray[i + 1] - cy) * OUTLINE_SCALE;
    posArray[i + 2] = cz + (posArray[i + 2] - cz) * OUTLINE_SCALE;
  }

  return {
    positions: posArray,
    indices: vertCount < 65536 ? new Uint16Array(indices) : new Uint32Array(indices),
  };
}

// ── glTF builders ──

async function convertVoxToGlb(voxPath, glbPath) {
  const buffer = readFileSync(voxPath);
  const model = parseVox(buffer);
  const mesh = buildMeshData(model);

  const doc = new Document();
  const buf = doc.createBuffer();

  const positionAccessor = doc.createAccessor()
    .setType('VEC3')
    .setArray(mesh.positions)
    .setBuffer(buf);

  const normalAccessor = doc.createAccessor()
    .setType('VEC3')
    .setArray(mesh.normals)
    .setBuffer(buf);

  const colorAccessor = doc.createAccessor()
    .setType('VEC3')
    .setArray(mesh.colors)
    .setBuffer(buf);

  const indexAccessor = doc.createAccessor()
    .setType('SCALAR')
    .setArray(mesh.indices)
    .setBuffer(buf);

  const material = doc.createMaterial()
    .setRoughnessFactor(0.9)
    .setMetallicFactor(0.0);

  const prim = doc.createPrimitive()
    .setAttribute('POSITION', positionAccessor)
    .setAttribute('NORMAL', normalAccessor)
    .setAttribute('COLOR_0', colorAccessor)
    .setIndices(indexAccessor)
    .setMaterial(material);

  const gltfMesh = doc.createMesh().addPrimitive(prim);
  const node = doc.createNode().setMesh(gltfMesh);
  const scene = doc.createScene().addChild(node);
  doc.getRoot().setDefaultScene(scene);

  const io = new NodeIO();
  const glb = await io.writeBinary(doc);
  writeFileSync(glbPath, Buffer.from(glb));
}

async function convertVoxToSilhouetteGlb(voxPath, silGlbPath) {
  const buffer = readFileSync(voxPath);
  const model = parseVox(buffer);
  const mesh = buildSilhouetteMeshData(model);

  const doc = new Document();
  const buf = doc.createBuffer();

  const positionAccessor = doc.createAccessor()
    .setType('VEC3')
    .setArray(mesh.positions)
    .setBuffer(buf);

  const indexAccessor = doc.createAccessor()
    .setType('SCALAR')
    .setArray(mesh.indices)
    .setBuffer(buf);

  // No material, no normals, no colors — applied at runtime
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', positionAccessor)
    .setIndices(indexAccessor);

  const gltfMesh = doc.createMesh().addPrimitive(prim);
  const node = doc.createNode().setMesh(gltfMesh);
  const scene = doc.createScene().addChild(node);
  doc.getRoot().setDefaultScene(scene);

  const io = new NodeIO();
  const glb = await io.writeBinary(doc);
  writeFileSync(silGlbPath, Buffer.from(glb));
}

// ── Main ──

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const voxFiles = readdirSync(SRC_DIR).filter(f => f.endsWith('.vox'));
  if (voxFiles.length === 0) {
    console.log('No .vox files found in', SRC_DIR);
    return;
  }

  let converted = 0;
  let skipped = 0;

  for (const voxFile of voxFiles) {
    const name = basename(voxFile, '.vox');
    const voxPath = join(SRC_DIR, voxFile);
    const glbPath = join(OUT_DIR, `${name}.glb`);
    const silGlbPath = join(OUT_DIR, `${name}-silhouette.glb`);
    const hashPath = join(OUT_DIR, `${name}.md5`);

    // Compute hash
    const content = readFileSync(voxPath);
    const currentHash = createHash('md5').update(content).digest('hex');

    // Skip if unchanged and both output files exist
    if (existsSync(glbPath) && existsSync(silGlbPath) && existsSync(hashPath)) {
      const storedHash = readFileSync(hashPath, 'utf-8').trim();
      if (currentHash === storedHash) {
        console.log(`  SKIP ${voxFile} (unchanged)`);
        skipped++;
        continue;
      }
    }

    console.log(`  CONVERT ${voxFile} → ${name}.glb + ${name}-silhouette.glb`);
    await convertVoxToGlb(voxPath, glbPath);
    await convertVoxToSilhouetteGlb(voxPath, silGlbPath);
    writeFileSync(hashPath, currentHash);
    converted++;
  }

  console.log(`\nDone: ${converted} converted, ${skipped} skipped`);
}

main().catch(err => {
  console.error('Conversion failed:', err);
  process.exit(1);
});

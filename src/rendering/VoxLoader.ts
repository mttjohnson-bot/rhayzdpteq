/**
 * Runtime loader for MagicaVoxel .vox files.
 * Parses the binary format and produces a merged Three.js mesh
 * with one voxel = one unit cube, colored per-voxel from the embedded palette.
 */

import * as THREE from 'three';

interface VoxModel {
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  voxels: { x: number; y: number; z: number; colorIndex: number }[];
  palette: Uint8Array; // 256 * 4 (RGBA)
}

/** Default MagicaVoxel palette (used when no RGBA chunk is present). */
function defaultPalette(): Uint8Array {
  const pal = new Uint8Array(256 * 4);
  // Index 0 is unused; fill with white as a safe default
  for (let i = 0; i < 256; i++) {
    pal[i * 4 + 0] = 255;
    pal[i * 4 + 1] = 255;
    pal[i * 4 + 2] = 255;
    pal[i * 4 + 3] = 255;
  }
  return pal;
}

/**
 * Parse a .vox file buffer into a VoxModel.
 */
function parseVox(buffer: ArrayBuffer): VoxModel {
  const view = new DataView(buffer);
  // Magic "VOX "
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  if (magic !== 'VOX ') throw new Error(`Not a .vox file (magic: ${magic})`);
  let offset = 8; // skip magic + version

  // MAIN chunk header
  offset += 4; // "MAIN"
  offset += 4; // content size (0 for MAIN)
  offset += 4; // children size

  let sizeX = 0,
    sizeY = 0,
    sizeZ = 0;
  const voxels: VoxModel['voxels'] = [];
  let palette = defaultPalette();

  while (offset < buffer.byteLength) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
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
        const dst = (i + 1) * 4; // palette indices are 1-based in XYZI
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

/**
 * Build a Three.js Group from parsed vox data.
 * Uses merged BufferGeometry with per-face vertex colors for performance.
 */
function buildMesh(model: VoxModel): THREE.Group {
  const { voxels, palette, sizeX, sizeY } = model;

  // Build occupancy set for face culling (skip faces between adjacent voxels)
  const occupied = new Set<string>();
  for (const v of voxels) {
    occupied.add(`${v.x},${v.y},${v.z}`);
  }

  // Six face directions with their normal, and the 4 vertex offsets for each face
  const faces: {
    dir: [number, number, number];
    vertices: [number, number, number][];
  }[] = [
    {
      dir: [1, 0, 0],
      vertices: [
        [1, 0, 0],
        [1, 1, 0],
        [1, 1, 1],
        [1, 0, 1],
      ],
    },
    {
      dir: [-1, 0, 0],
      vertices: [
        [0, 0, 1],
        [0, 1, 1],
        [0, 1, 0],
        [0, 0, 0],
      ],
    },
    {
      dir: [0, 1, 0],
      vertices: [
        [0, 1, 0],
        [0, 1, 1],
        [1, 1, 1],
        [1, 1, 0],
      ],
    },
    {
      dir: [0, -1, 0],
      vertices: [
        [0, 0, 1],
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
      ],
    },
    {
      dir: [0, 0, 1],
      vertices: [
        [0, 0, 1],
        [1, 0, 1],
        [1, 1, 1],
        [0, 1, 1],
      ],
    },
    {
      dir: [0, 0, -1],
      vertices: [
        [1, 0, 0],
        [0, 0, 0],
        [0, 1, 0],
        [1, 1, 0],
      ],
    },
  ];

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  let vertCount = 0;

  for (const v of voxels) {
    const ci = v.colorIndex;
    const r = palette[ci * 4] / 255;
    const g = palette[ci * 4 + 1] / 255;
    const b = palette[ci * 4 + 2] / 255;

    for (const face of faces) {
      const [dx, dy, dz] = face.dir;
      const nx = v.x + dx;
      const ny = v.y + dy;
      const nz = v.z + dz;

      // Skip face if neighbor exists
      if (occupied.has(`${nx},${ny},${nz}`)) continue;

      // Add 4 vertices for this face
      for (const [vx, vy, vz] of face.vertices) {
        positions.push(v.x + vx, v.y + vy, v.z + vz);
        normals.push(dx, dy, dz);
        colors.push(r, g, b);
      }

      // Two triangles per face
      indices.push(vertCount, vertCount + 1, vertCount + 2);
      indices.push(vertCount, vertCount + 2, vertCount + 3);
      vertCount += 4;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);

  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;

  // Center the model at origin and orient: MagicaVoxel Z-up → Three.js Y-up
  const group = new THREE.Group();
  // MagicaVoxel uses Z-up, so rotate -90° around X to get Y-up
  mesh.rotation.x = -Math.PI / 2;
  // Center in model space
  mesh.position.set(-sizeX / 2, 0, sizeY / 2);
  group.add(mesh);

  return group;
}

/**
 * Load a .vox file from a URL and return a Three.js Group.
 */
export async function loadVoxModel(url: string): Promise<THREE.Group> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  const model = parseVox(buffer);
  return buildMesh(model);
}

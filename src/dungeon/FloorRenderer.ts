import * as THREE from 'three';
import { DungeonData, TileType } from './DungeonGenerator';
import { TILE_SIZE, WALL_HEIGHT, COLORS } from '../utils/constants';

export interface DungeonMeshData {
  group: THREE.Group;
  entranceWorldPos: { x: number; z: number };
  exitWorldPos: { x: number; z: number };
  /** Boundary for player movement (world coords) */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export function buildDungeonMesh(dungeon: DungeonData): DungeonMeshData {
  const group = new THREE.Group();

  // Center the dungeon around world origin
  const offsetX = -(dungeon.width * TILE_SIZE) / 2;
  const offsetZ = -(dungeon.height * TILE_SIZE) / 2;

  // Batch geometry for performance: collect all tiles by type
  const floorPositions: THREE.Vector3[] = [];
  const wallPositions: THREE.Vector3[] = [];
  const doorPositions: THREE.Vector3[] = [];
  const exitPositions: THREE.Vector3[] = [];
  const entrancePositions: THREE.Vector3[] = [];

  for (let z = 0; z < dungeon.height; z++) {
    for (let x = 0; x < dungeon.width; x++) {
      const tile = dungeon.tiles[z][x];
      const worldX = x * TILE_SIZE + offsetX + TILE_SIZE / 2;
      const worldZ = z * TILE_SIZE + offsetZ + TILE_SIZE / 2;

      switch (tile) {
        case TileType.Floor:
          floorPositions.push(new THREE.Vector3(worldX, 0, worldZ));
          break;
        case TileType.Wall:
          wallPositions.push(new THREE.Vector3(worldX, 0, worldZ));
          break;
        case TileType.Door:
          doorPositions.push(new THREE.Vector3(worldX, 0, worldZ));
          break;
        case TileType.Exit:
          exitPositions.push(new THREE.Vector3(worldX, 0, worldZ));
          floorPositions.push(new THREE.Vector3(worldX, 0, worldZ));
          break;
        case TileType.Entrance:
          entrancePositions.push(new THREE.Vector3(worldX, 0, worldZ));
          floorPositions.push(new THREE.Vector3(worldX, 0, worldZ));
          break;
      }
    }
  }

  // Build batched floor mesh
  if (floorPositions.length > 0) {
    const mesh = createBatchedBoxes(
      floorPositions,
      TILE_SIZE, 0.2, TILE_SIZE,
      0, -0.1, 0,
      COLORS.floor,
      false, true,
    );
    group.add(mesh);
  }

  // Walls
  if (wallPositions.length > 0) {
    const mesh = createBatchedBoxes(
      wallPositions,
      TILE_SIZE, WALL_HEIGHT, TILE_SIZE,
      0, WALL_HEIGHT / 2, 0,
      COLORS.wall,
      true, true,
    );
    group.add(mesh);

    // Wall tops (slightly lighter)
    const topMesh = createBatchedBoxes(
      wallPositions,
      TILE_SIZE, 0.15, TILE_SIZE,
      0, WALL_HEIGHT + 0.075, 0,
      COLORS.wallTop,
      false, false,
    );
    group.add(topMesh);
  }

  // Doors (floor tile with different color)
  if (doorPositions.length > 0) {
    const mesh = createBatchedBoxes(
      doorPositions,
      TILE_SIZE, 0.2, TILE_SIZE,
      0, -0.1, 0,
      0x6a5a4a,
      false, true,
    );
    group.add(mesh);
  }

  // Exit marker
  let exitWorldPos = { x: 0, z: 0 };
  if (exitPositions.length > 0) {
    const pos = exitPositions[0];
    exitWorldPos = { x: pos.x, z: pos.z };

    const exitGeo = new THREE.BoxGeometry(TILE_SIZE * 0.8, 0.15, TILE_SIZE * 0.8);
    const exitMat = new THREE.MeshBasicMaterial({
      color: 0x44ff44,
      transparent: true,
      opacity: 0.6,
    });
    const exitMesh = new THREE.Mesh(exitGeo, exitMat);
    exitMesh.position.set(pos.x, 0.1, pos.z);
    group.add(exitMesh);

    // Upward arrow pillar to make exit visible
    const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 6);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: 0x44ff44,
      transparent: true,
      opacity: 0.3,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(pos.x, 0.95, pos.z);
    group.add(pillar);
  }

  // Entrance marker
  let entranceWorldPos = { x: 0, z: 0 };
  if (entrancePositions.length > 0) {
    const pos = entrancePositions[0];
    entranceWorldPos = { x: pos.x, z: pos.z };

    const entGeo = new THREE.BoxGeometry(TILE_SIZE * 0.8, 0.15, TILE_SIZE * 0.8);
    const entMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.6,
    });
    const entMesh = new THREE.Mesh(entGeo, entMat);
    entMesh.position.set(pos.x, 0.1, pos.z);
    group.add(entMesh);
  }

  // Compute walkable bounds
  const bounds = computeWalkableBounds(dungeon, offsetX, offsetZ);

  return { group, entranceWorldPos, exitWorldPos, bounds };
}

function createBatchedBoxes(
  positions: THREE.Vector3[],
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  offX: number,
  offY: number,
  offZ: number,
  color: number,
  castShadow: boolean,
  receiveShadow: boolean,
): THREE.InstancedMesh {
  const geometry = new THREE.BoxGeometry(sizeX, sizeY, sizeZ);
  const material = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.InstancedMesh(geometry, material, positions.length);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;

  const matrix = new THREE.Matrix4();
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    matrix.setPosition(p.x + offX, p.y + offY, p.z + offZ);
    mesh.setMatrixAt(i, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  return mesh;
}

function computeWalkableBounds(
  dungeon: DungeonData,
  offsetX: number,
  offsetZ: number,
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

  for (let z = 0; z < dungeon.height; z++) {
    for (let x = 0; x < dungeon.width; x++) {
      const tile = dungeon.tiles[z][x];
      if (tile === TileType.Floor || tile === TileType.Door ||
          tile === TileType.Exit || tile === TileType.Entrance) {
        const wx = x * TILE_SIZE + offsetX;
        const wz = z * TILE_SIZE + offsetZ;
        minX = Math.min(minX, wx);
        maxX = Math.max(maxX, wx + TILE_SIZE);
        minZ = Math.min(minZ, wz);
        maxZ = Math.max(maxZ, wz + TILE_SIZE);
      }
    }
  }

  return { minX, maxX, minZ, maxZ };
}

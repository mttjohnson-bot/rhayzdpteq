import * as THREE from 'three';
import { TILE_SIZE, WALL_HEIGHT, HUB_WIDTH, HUB_DEPTH, COLORS } from '../utils/constants';

export interface PortalInfo {
  x: number;
  z: number;
  mesh: THREE.Mesh;
}

/**
 * Builds the fixed hub scene geometry.
 * Returns a group containing all hub meshes and the portal location.
 */
export interface LibraryDoorInfo {
  x: number;
  z: number;
}

export interface VaultInfo {
  x: number;
  z: number;
}

export function createHubScene(): {
  group: THREE.Group;
  portal: PortalInfo;
  libraryDoor: LibraryDoorInfo;
  vault: VaultInfo;
} {
  const group = new THREE.Group();

  const halfW = (HUB_WIDTH * TILE_SIZE) / 2;
  const halfD = (HUB_DEPTH * TILE_SIZE) / 2;

  // --- Floor ---
  const floorGeo = new THREE.BoxGeometry(HUB_WIDTH * TILE_SIZE, 0.2, HUB_DEPTH * TILE_SIZE);
  const floorMat = new THREE.MeshLambertMaterial({ color: COLORS.hub_floor });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.receiveShadow = true;
  floor.position.y = -0.1;
  group.add(floor);

  // --- Floor accent tiles (checkerboard pattern) ---
  const accentGeo = new THREE.BoxGeometry(TILE_SIZE * 0.95, 0.05, TILE_SIZE * 0.95);
  const accentMat = new THREE.MeshLambertMaterial({ color: COLORS.hub_accent });
  for (let x = 0; x < HUB_WIDTH; x++) {
    for (let z = 0; z < HUB_DEPTH; z++) {
      if ((x + z) % 2 === 0) continue;
      const tile = new THREE.Mesh(accentGeo, accentMat);
      tile.position.set(
        (x - HUB_WIDTH / 2 + 0.5) * TILE_SIZE,
        0.01,
        (z - HUB_DEPTH / 2 + 0.5) * TILE_SIZE,
      );
      tile.receiveShadow = true;
      group.add(tile);
    }
  }

  // --- Walls ---
  const wallMat = new THREE.MeshLambertMaterial({ color: COLORS.wall });

  const buildWall = (width: number, depth: number, x: number, z: number) => {
    const geo = new THREE.BoxGeometry(width, WALL_HEIGHT, depth);
    const wall = new THREE.Mesh(geo, wallMat);
    wall.position.set(x, WALL_HEIGHT / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);
  };

  // North wall
  buildWall(HUB_WIDTH * TILE_SIZE + TILE_SIZE, TILE_SIZE, 0, -halfD - TILE_SIZE / 2);
  // South wall
  buildWall(HUB_WIDTH * TILE_SIZE + TILE_SIZE, TILE_SIZE, 0, halfD + TILE_SIZE / 2);
  // West wall
  buildWall(TILE_SIZE, HUB_DEPTH * TILE_SIZE, -halfW - TILE_SIZE / 2, 0);
  // East wall — two segments with a 3-tile door gap at center (z = -1.5 to +1.5)
  // Each segment is 6 tiles deep, centered at ±4.5
  buildWall(TILE_SIZE, 6 * TILE_SIZE, halfW + TILE_SIZE / 2, -4.5);
  buildWall(TILE_SIZE, 6 * TILE_SIZE, halfW + TILE_SIZE / 2, 4.5);

  // Library door arch — decorative lintel above the gap
  const archGeo = new THREE.BoxGeometry(TILE_SIZE * 1.1, TILE_SIZE * 0.3, 3 * TILE_SIZE + 0.1);
  const archMat = new THREE.MeshLambertMaterial({ color: COLORS.wallTop });
  const arch = new THREE.Mesh(archGeo, archMat);
  arch.position.set(halfW + TILE_SIZE / 2, WALL_HEIGHT - 0.15, 0);
  arch.castShadow = true;
  group.add(arch);

  // --- Decorative pillars at corners ---
  const pillarGeo = new THREE.BoxGeometry(TILE_SIZE * 0.8, WALL_HEIGHT * 1.3, TILE_SIZE * 0.8);
  const pillarMat = new THREE.MeshLambertMaterial({ color: COLORS.wallTop });
  const pillarPositions = [
    [-halfW + TILE_SIZE, 0, -halfD + TILE_SIZE],
    [halfW - TILE_SIZE, 0, -halfD + TILE_SIZE],
    [-halfW + TILE_SIZE, 0, halfD - TILE_SIZE],
    [halfW - TILE_SIZE, 0, halfD - TILE_SIZE],
  ];
  for (const [px, , pz] of pillarPositions) {
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.set(px, (WALL_HEIGHT * 1.3) / 2, pz);
    pillar.castShadow = true;
    group.add(pillar);
  }

  // --- Portal (north center) ---
  const portalX = 0;
  const portalZ = -halfD + TILE_SIZE * 1.5;

  // Portal base
  const portalBaseGeo = new THREE.CylinderGeometry(TILE_SIZE * 0.8, TILE_SIZE * 0.9, 0.3, 8);
  const portalBaseMat = new THREE.MeshLambertMaterial({ color: COLORS.hub_accent });
  const portalBase = new THREE.Mesh(portalBaseGeo, portalBaseMat);
  portalBase.position.set(portalX, 0.15, portalZ);
  group.add(portalBase);

  // Portal glow column
  const portalGeo = new THREE.CylinderGeometry(
    TILE_SIZE * 0.5,
    TILE_SIZE * 0.5,
    WALL_HEIGHT * 1.5,
    8,
  );
  const portalMat = new THREE.MeshBasicMaterial({
    color: COLORS.portal,
    transparent: true,
    opacity: 0.4,
  });
  const portalMesh = new THREE.Mesh(portalGeo, portalMat);
  portalMesh.position.set(portalX, WALL_HEIGHT * 0.75, portalZ);
  group.add(portalMesh);

  // Portal top ring
  const ringGeo = new THREE.TorusGeometry(TILE_SIZE * 0.55, 0.08, 8, 16);
  const ringMat = new THREE.MeshBasicMaterial({ color: COLORS.portalGlow });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(portalX, WALL_HEIGHT * 1.5, portalZ);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  // --- Vault chest (west wall center) ---
  const vaultX = -halfW + TILE_SIZE * 1.5;
  const vaultZ = 0;

  // Chest body
  const chestGeo = new THREE.BoxGeometry(TILE_SIZE * 0.9, TILE_SIZE * 0.6, TILE_SIZE * 0.7);
  const chestMat = new THREE.MeshLambertMaterial({ color: 0x6b5b3a });
  const chest = new THREE.Mesh(chestGeo, chestMat);
  chest.position.set(vaultX, TILE_SIZE * 0.3, vaultZ);
  chest.castShadow = true;
  group.add(chest);

  // Chest lid (slightly offset upward)
  const lidGeo = new THREE.BoxGeometry(TILE_SIZE * 0.95, TILE_SIZE * 0.15, TILE_SIZE * 0.75);
  const lidMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
  const lid = new THREE.Mesh(lidGeo, lidMat);
  lid.position.set(vaultX, TILE_SIZE * 0.68, vaultZ);
  lid.castShadow = true;
  group.add(lid);

  // Metal band on chest
  const bandGeo = new THREE.BoxGeometry(TILE_SIZE * 0.95, TILE_SIZE * 0.08, TILE_SIZE * 0.72);
  const bandMat = new THREE.MeshLambertMaterial({ color: 0x888899 });
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.position.set(vaultX, TILE_SIZE * 0.45, vaultZ);
  group.add(band);

  return {
    group,
    portal: { x: portalX, z: portalZ, mesh: portalMesh },
    libraryDoor: { x: halfW + TILE_SIZE / 2, z: 0 },
    vault: { x: vaultX, z: vaultZ },
  };
}

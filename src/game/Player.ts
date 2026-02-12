import * as THREE from 'three';
import { PLAYER_SPEED, PLAYER_SIZE, PLAYER_HEIGHT, COLORS, TILE_SIZE } from '../utils/constants';
import { clamp } from '../utils/math';
import { InputManager } from './InputManager';
import { DungeonData, TileType } from '../dungeon/DungeonGenerator';

export class Player {
  readonly mesh: THREE.Mesh;
  readonly position: THREE.Vector3;

  // Boundaries the player is confined to (set by the scene)
  private bounds = { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity };

  // Tile-based collision data (set when entering a dungeon)
  private dungeonData: DungeonData | null = null;
  private dungeonOffsetX = 0;
  private dungeonOffsetZ = 0;

  constructor() {
    const geometry = new THREE.BoxGeometry(PLAYER_SIZE, PLAYER_HEIGHT, PLAYER_SIZE);
    const material = new THREE.MeshLambertMaterial({ color: COLORS.player });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.position.y = PLAYER_HEIGHT / 2;
    this.position = this.mesh.position;
  }

  setBounds(minX: number, maxX: number, minZ: number, maxZ: number): void {
    this.bounds = { minX, maxX, minZ, maxZ };
  }

  setDungeonCollision(dungeon: DungeonData | null): void {
    this.dungeonData = dungeon;
    if (dungeon) {
      this.dungeonOffsetX = -(dungeon.width * TILE_SIZE) / 2;
      this.dungeonOffsetZ = -(dungeon.height * TILE_SIZE) / 2;
    }
  }

  /** Teleport to a position (no interpolation) */
  teleportTo(x: number, z: number): void {
    this.position.x = x;
    this.position.z = z;
    this.position.y = PLAYER_HEIGHT / 2;
  }

  update(dt: number, input: InputManager): void {
    const move = input.getMovement();
    if (move.x === 0 && move.z === 0) return;

    // Rotate movement to match isometric camera orientation (-45° to align screen axes to world)
    const angle = -Math.PI / 4;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const worldX = move.x * cos - move.z * sin;
    const worldZ = move.x * sin + move.z * cos;

    const half = PLAYER_SIZE / 2;
    const newX = this.position.x + worldX * PLAYER_SPEED * dt;
    const newZ = this.position.z + worldZ * PLAYER_SPEED * dt;

    if (this.dungeonData) {
      // Tile-based collision: try X and Z independently for wall sliding
      if (this.isWalkable(newX, this.position.z)) {
        this.position.x = newX;
      }
      if (this.isWalkable(this.position.x, newZ)) {
        this.position.z = newZ;
      }
    } else {
      // Simple bounds clamping (hub)
      this.position.x = clamp(newX, this.bounds.minX + half, this.bounds.maxX - half);
      this.position.z = clamp(newZ, this.bounds.minZ + half, this.bounds.maxZ - half);
    }
  }

  /** Check if a world position is on a walkable tile */
  private isWalkable(worldX: number, worldZ: number): boolean {
    if (!this.dungeonData) return true;

    const half = PLAYER_SIZE / 2;
    // Check all 4 corners of the player's footprint
    const corners = [
      [worldX - half, worldZ - half],
      [worldX + half, worldZ - half],
      [worldX - half, worldZ + half],
      [worldX + half, worldZ + half],
    ];

    for (const [cx, cz] of corners) {
      const tileX = Math.floor((cx - this.dungeonOffsetX) / TILE_SIZE);
      const tileZ = Math.floor((cz - this.dungeonOffsetZ) / TILE_SIZE);

      if (tileX < 0 || tileX >= this.dungeonData.width ||
          tileZ < 0 || tileZ >= this.dungeonData.height) {
        return false;
      }

      const tile = this.dungeonData.tiles[tileZ][tileX];
      if (tile === TileType.Empty || tile === TileType.Wall) {
        return false;
      }
    }

    return true;
  }

  /** Check if player is within range of a world position */
  isNear(x: number, z: number, range: number = TILE_SIZE * 1.5): boolean {
    const dx = this.position.x - x;
    const dz = this.position.z - z;
    return Math.sqrt(dx * dx + dz * dz) < range;
  }
}

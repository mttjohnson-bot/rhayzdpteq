import * as THREE from 'three';
import { PLAYER_SPEED, PLAYER_SIZE, PLAYER_HEIGHT, COLORS, TILE_SIZE } from '../utils/constants';
import { clamp } from '../utils/math';
import { InputManager } from './InputManager';

export class Player {
  readonly mesh: THREE.Mesh;
  readonly position: THREE.Vector3;

  // Boundaries the player is confined to (set by the scene)
  private bounds = { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity };

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
    this.position.x = clamp(
      this.position.x + worldX * PLAYER_SPEED * dt,
      this.bounds.minX + half,
      this.bounds.maxX - half,
    );
    this.position.z = clamp(
      this.position.z + worldZ * PLAYER_SPEED * dt,
      this.bounds.minZ + half,
      this.bounds.maxZ - half,
    );
  }

  /** Check if player is within range of a world position */
  isNear(x: number, z: number, range: number = TILE_SIZE * 1.5): boolean {
    const dx = this.position.x - x;
    const dz = this.position.z - z;
    return Math.sqrt(dx * dx + dz * dz) < range;
  }
}

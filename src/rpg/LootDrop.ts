/**
 * Visual loot drops in the dungeon world.
 *
 * When an enemy dies, items spawn as small glowing cubes on the ground.
 * The player walks over them to pick up (auto-pickup within range).
 */

import * as THREE from 'three';
import { Item, rarityColor } from './LootTable';
import { events } from '../utils/EventBus';

const PICKUP_RANGE = 1.2;
const BOB_SPEED = 3;
const BOB_HEIGHT = 0.15;

interface WorldDrop {
  item: Item;
  mesh: THREE.Mesh;
  baseY: number;
  timer: number;
}

export class LootDropManager {
  private drops: WorldDrop[] = [];
  private scene: THREE.Scene | null = null;

  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  /** Spawn a loot drop at world position */
  spawnDrop(item: Item, x: number, z: number): void {
    if (!this.scene) return;

    const color = rarityColor(item.rarity);
    const size = 0.25;
    const geo = new THREE.BoxGeometry(size, size, size);
    const mat = new THREE.MeshLambertMaterial({
      color: new THREE.Color(color).getHex(),
      emissive: new THREE.Color(color).getHex(),
      emissiveIntensity: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);

    // Offset slightly so drops don't stack exactly
    const offsetX = (Math.random() - 0.5) * 0.6;
    const offsetZ = (Math.random() - 0.5) * 0.6;
    mesh.position.set(x + offsetX, 0.3, z + offsetZ);
    mesh.castShadow = true;

    this.scene.add(mesh);
    this.drops.push({
      item,
      mesh,
      baseY: 0.3,
      timer: Math.random() * Math.PI * 2, // random phase
    });
  }

  /** Update bobbing animation and check pickup */
  update(dt: number, playerX: number, playerZ: number): void {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      drop.timer += dt * BOB_SPEED;
      drop.mesh.position.y = drop.baseY + Math.sin(drop.timer) * BOB_HEIGHT;
      drop.mesh.rotation.y += dt * 2;

      // Check pickup range
      const dx = drop.mesh.position.x - playerX;
      const dz = drop.mesh.position.z - playerZ;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < PICKUP_RANGE) {
        events.emit('lootPickup', drop.item);
        this.removeDrop(i);
      }
    }
  }

  private removeDrop(index: number): void {
    const drop = this.drops[index];
    if (this.scene) {
      this.scene.remove(drop.mesh);
    }
    drop.mesh.geometry.dispose();
    (drop.mesh.material as THREE.Material).dispose();
    this.drops.splice(index, 1);
  }

  /** Clean up all drops */
  clear(): void {
    while (this.drops.length > 0) {
      this.removeDrop(this.drops.length - 1);
    }
  }
}

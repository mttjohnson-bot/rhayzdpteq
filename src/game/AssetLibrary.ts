/**
 * Asset Library scene — a hand-built multi-room space for inspecting all visual game assets.
 *
 * Layout (top-down, positive X is east, negative Z is north):
 *
 *   Hub → [entry corridor] → [Entry Hall] ──── east corr ────→ [Structure Wing]
 *                                 |        |
 *                           north corr  south corr
 *                                 |        |
 *                          [Enemy Wing]  [Items Wing]
 *
 * Assets sit on pedestals sorted by stable string keys so positions never change
 * as new assets are added — new entries always append to the end of their section.
 */

import * as THREE from 'three';
import {
  TILE_SIZE,
  WALL_HEIGHT,
  ENEMY_TYPES,
  ENEMY_HP,
  ENEMY_SPEED,
  ENEMY_ATTACK_DAMAGE,
  CAPTAIN_HP_MULT,
  CAPTAIN_DMG_MULT,
  CAPTAIN_SCALE,
  type EnemyTypeId,
} from '../utils/constants';
import { TestDummy } from '../combat/TestDummy';
import { getFloorConfig } from '../dungeon/FloorConfig';
import { buildEnemyDisplayMesh } from '../combat/Enemy';
import { buildBossDisplayMesh } from '../combat/Boss';
import { type ItemRarity, type ConsumeEffect, rarityColor } from '../rpg/LootTable';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export type LibraryAssetCategory =
  | 'enemy_mob'
  | 'enemy_captain'
  | 'enemy_boss'
  | 'item_weapon'
  | 'item_armor'
  | 'item_ring'
  | 'item_potion'
  | 'structure'
  | 'npc';

export interface LibraryAssetStats {
  rows: Array<{ label: string; value: string }>;
  /** CSS hex color string for the dialog accent border */
  accentColor?: string;
  flavorText?: string;
}

export interface LibraryAsset {
  /** Stable sort key — determines grid position permanently */
  key: string;
  name: string;
  category: LibraryAssetCategory;
  /** World-space pedestal center (y = 0) */
  position: { x: number; z: number };
  /** The Three.js group that rotates each frame */
  displayMesh: THREE.Group;
  /** Pedestal mesh whose material color swaps on highlight */
  pedestalMesh: THREE.Mesh;
  stats: LibraryAssetStats;
}

// ---------------------------------------------------------------------------
// Helpers — item & structure display mesh builders
// ---------------------------------------------------------------------------

function toHex(n: number): string {
  return '#' + n.toString(16).padStart(6, '0');
}

export const RARITY_HEX: Record<ItemRarity, number> = {
  common: 0xaaaaaa,
  uncommon: 0x44cc44,
  rare: 0x4488ff,
  epic: 0xcc44ff,
};

export function buildWeaponDisplayMesh(category: string, rarity: ItemRarity): THREE.Group {
  const group = new THREE.Group();
  const color = RARITY_HEX[rarity];
  const mat = new THREE.MeshLambertMaterial({ color });
  const handleMat = new THREE.MeshLambertMaterial({ color: 0x6a4420 });

  // Blade / shaft — chunky voxel proportions for isometric visibility
  const bladeH = category === 'spear' ? 1.1 : category === 'dagger' ? 0.55 : 0.8;
  const bladeW = category === 'axe' ? 0.22 : category === 'mace' ? 0.2 : 0.12;
  const bladeGeo = new THREE.BoxGeometry(bladeW, bladeH, 0.1);
  const blade = new THREE.Mesh(bladeGeo, mat);
  blade.position.y = bladeH / 2 + 0.18;
  blade.castShadow = true;
  group.add(blade);

  // Handle below the guard
  const handleGeo = new THREE.BoxGeometry(0.09, 0.22, 0.09);
  const handle = new THREE.Mesh(handleGeo, handleMat);
  handle.position.y = 0.02;
  group.add(handle);

  if (category === 'sword' || category === 'dagger' || category === 'spear') {
    // Crossguard
    const guardGeo = new THREE.BoxGeometry(0.36, 0.08, 0.1);
    const guard = new THREE.Mesh(guardGeo, mat);
    guard.position.y = 0.18;
    group.add(guard);
  } else if (category === 'axe') {
    // Axe head
    const headGeo = new THREE.BoxGeometry(0.34, 0.28, 0.1);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0.14, bladeH + 0.08, 0);
    head.castShadow = true;
    group.add(head);
  } else if (category === 'mace') {
    // Mace head
    const headGeo = new THREE.BoxGeometry(0.28, 0.24, 0.28);
    const headMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = bladeH + 0.08;
    head.castShadow = true;
    group.add(head);
  }

  return group;
}

export function buildArmorDisplayMesh(rarity: ItemRarity): THREE.Group {
  const group = new THREE.Group();
  const color = RARITY_HEX[rarity];
  const mat = new THREE.MeshLambertMaterial({ color });

  // Chest piece
  const chestGeo = new THREE.BoxGeometry(0.44, 0.5, 0.12);
  const chest = new THREE.Mesh(chestGeo, mat);
  chest.position.y = 0.35;
  group.add(chest);

  // Shoulder pads
  const padGeo = new THREE.BoxGeometry(0.14, 0.14, 0.12);
  const lPad = new THREE.Mesh(padGeo, mat);
  lPad.position.set(-0.28, 0.58, 0);
  group.add(lPad);
  const rPad = new THREE.Mesh(padGeo, mat);
  rPad.position.set(0.28, 0.58, 0);
  group.add(rPad);

  return group;
}

export function buildRingDisplayMesh(rarity: ItemRarity): THREE.Group {
  const group = new THREE.Group();
  const color = RARITY_HEX[rarity];
  const mat = new THREE.MeshLambertMaterial({ color });
  const geo = new THREE.TorusGeometry(0.2, 0.055, 6, 12);
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.25;
  group.add(ring);
  return group;
}

const POTION_COLORS: Record<ConsumeEffect, number> = {
  heal: 0xcc3333,
  manaShield: 0x3344cc,
  speedBoost: 0x33cccc,
  strengthBoost: 0xcc8833,
};

function buildPotionDisplayMesh(effect: ConsumeEffect): THREE.Group {
  const group = new THREE.Group();
  const color = POTION_COLORS[effect];
  const mat = new THREE.MeshLambertMaterial({ color });

  // Bottle body
  const bodyGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.38, 6);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 0.24;
  group.add(body);

  // Stopper
  const stopGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 5);
  const stopMat = new THREE.MeshLambertMaterial({ color: 0x886644 });
  const stop = new THREE.Mesh(stopGeo, stopMat);
  stop.position.y = 0.48;
  group.add(stop);

  return group;
}

function buildStructureDisplayMesh(
  tileType: 'floor' | 'wall' | 'door',
  floorColor: number,
  wallColor: number,
  wallTopColor: number,
  doorColor: number,
): THREE.Group {
  const group = new THREE.Group();

  if (tileType === 'floor') {
    const geo = new THREE.BoxGeometry(0.88, 0.18, 0.88);
    const mat = new THREE.MeshLambertMaterial({ color: floorColor });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.09;
    group.add(mesh);
  } else if (tileType === 'wall') {
    const bodyGeo = new THREE.BoxGeometry(0.72, 1.3, 0.72);
    const bodyMat = new THREE.MeshLambertMaterial({ color: wallColor });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.65;
    group.add(body);
    const capGeo = new THREE.BoxGeometry(0.78, 0.14, 0.78);
    const capMat = new THREE.MeshLambertMaterial({ color: wallTopColor });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 1.37;
    group.add(cap);
  } else {
    // door — wall with colored overlay panel
    const bodyGeo = new THREE.BoxGeometry(0.72, 1.3, 0.72);
    const bodyMat = new THREE.MeshLambertMaterial({ color: wallColor });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.65;
    group.add(body);
    const panelGeo = new THREE.BoxGeometry(0.32, 0.95, 0.08);
    const panelMat = new THREE.MeshLambertMaterial({ color: doorColor });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, 0.6, -0.38);
    group.add(panel);
  }

  return group;
}

function buildNpcDisplayMesh(): THREE.Group {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xddbb88 });
  const clothMat = new THREE.MeshLambertMaterial({ color: 0x6644aa });

  // Body
  const bodyGeo = new THREE.BoxGeometry(0.38, 0.55, 0.22);
  const body = new THREE.Mesh(bodyGeo, clothMat);
  body.position.y = 0.48;
  group.add(body);

  // Head
  const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 0.9;
  group.add(head);

  // Question mark hat (cone)
  const hatGeo = new THREE.ConeGeometry(0.12, 0.25, 5);
  const hatMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
  const hat = new THREE.Mesh(hatGeo, hatMat);
  hat.position.y = 1.17;
  group.add(hat);

  return group;
}

// ---------------------------------------------------------------------------
// AssetLibrary class
// ---------------------------------------------------------------------------

/** Wall and floor color palette for the library rooms */
const LIB_FLOOR_COLOR = 0x484040;
const LIB_FLOOR_ACCENT = 0x5a5050;
const LIB_WALL_COLOR = 0x6a5a5a;

const PEDESTAL_COLOR = 0x8b7355;
const PEDESTAL_HIGHLIGHT = 0xffd700;
const HIGHLIGHT_RANGE = 4.0;
const HIGHLIGHT_DOT_MIN = 0.65; // ~49° half-cone
const ROTATION_SPEED = 0.5; // rad/s

export class AssetLibrary {
  readonly group: THREE.Group;
  private assets: LibraryAsset[] = [];
  private highlightedAsset: LibraryAsset | null = null;
  private testDummies: TestDummy[] = [];

  constructor() {
    this.group = new THREE.Group();
    this._buildEntryCorridor();
    this._buildEntryHall();
    this._buildNorthCorridor();
    this._buildEnemyWing();
    this._buildSouthCorridor();
    this._buildItemsWing();
    this._buildEastCorridor();
    this._buildStructureWing();
    this._buildTrainingArea();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  update(dt: number, playerX: number, playerZ: number, facingAngle: number): void {
    // Rotate all display meshes
    for (const asset of this.assets) {
      asset.displayMesh.rotation.y += ROTATION_SPEED * dt;
    }
    // Update test dummy hit-flash timers
    for (const dummy of this.testDummies) {
      dummy.update(dt);
    }
    this._updateHighlight(playerX, playerZ, facingAngle);
  }

  getHighlightedAsset(): LibraryAsset | null {
    return this.highlightedAsset;
  }

  getTestDummies(): TestDummy[] {
    return this.testDummies;
  }

  // -------------------------------------------------------------------------
  // Highlight algorithm
  // -------------------------------------------------------------------------

  private _updateHighlight(playerX: number, playerZ: number, facingAngle: number): void {
    // facingAngle = Math.atan2(moveZ, moveX) — standard math convention
    const fx = Math.cos(facingAngle);
    const fz = Math.sin(facingAngle);

    let best: LibraryAsset | null = null;
    let bestScore = -Infinity;

    for (const asset of this.assets) {
      const dx = asset.position.x - playerX;
      const dz = asset.position.z - playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist > HIGHLIGHT_RANGE || dist < 0.01) continue;

      const dot = (fx * dx + fz * dz) / dist;
      if (dot < HIGHLIGHT_DOT_MIN) continue;

      // Higher score = more directly faced AND closer
      const score = dot - dist * 0.05;
      if (score > bestScore) {
        bestScore = score;
        best = asset;
      }
    }

    if (best !== this.highlightedAsset) {
      if (this.highlightedAsset) {
        (this.highlightedAsset.pedestalMesh.material as THREE.MeshLambertMaterial)
          .color.setHex(PEDESTAL_COLOR);
      }
      if (best) {
        (best.pedestalMesh.material as THREE.MeshLambertMaterial)
          .color.setHex(PEDESTAL_HIGHLIGHT);
      }
      this.highlightedAsset = best;
    }
  }

  // -------------------------------------------------------------------------
  // Room geometry builders
  // -------------------------------------------------------------------------

  /** Entry corridor connecting hub east wall to entry hall (x=8.5→11.5, z=±1.5) */
  private _buildEntryCorridor(): void {
    this._buildFloor(3, 3, 10, 0);
    // Side walls (north and south of corridor)
    this._buildWall(3.2, 1, 10, -2);
    this._buildWall(3.2, 1, 10, 2);
  }

  /** Entry hall: 15×12 floor centered at (19, 0) */
  private _buildEntryHall(): void {
    this._buildFloor(15, 12, 19, 0);

    // West wall — two segments (corridor gap at z=±1.5)
    this._buildWall(1, 4.5, 11, -3.75);  // south of corridor
    this._buildWall(1, 4.5, 11, 3.75);   // north of corridor

    // East wall — two segments (east corridor gap at z=±1.5)
    this._buildWall(1, 4.5, 27, -3.75);
    this._buildWall(1, 4.5, 27, 3.75);

    // North wall — two segments (north corridor gap at x=17→20)
    this._buildWall(5.5, 1, 14.25, -6.5);  // west portion
    this._buildWall(6.5, 1, 23.25, -6.5);  // east portion

    // South wall — two segments (south corridor gap at x=17→20)
    this._buildWall(5.5, 1, 14.25, 6.5);
    this._buildWall(6.5, 1, 23.25, 6.5);

    // NPC section — two pedestals in northeast corner of entry hall
    this._addNpcSection();
  }

  /** North corridor connecting entry hall to enemy wing (x=17→20, z=-9→-6) */
  private _buildNorthCorridor(): void {
    this._buildFloor(3, 3, 18.5, -7.5);
    this._buildWall(1, 3.2, 16.5, -7.5);
    this._buildWall(1, 3.2, 20.5, -7.5);
  }

  /** Enemy wing: 24×14 floor centered at (23.5, -16) */
  private _buildEnemyWing(): void {
    this._buildFloor(24, 14, 23.5, -16);

    // West wall
    this._buildWall(1, 14, 11, -16);
    // East wall
    this._buildWall(1, 14, 36, -16);
    // North wall (solid)
    this._buildWall(24, 1, 23.5, -23.5);
    // South wall — two segments around corridor opening at x=17→20
    this._buildWall(5.5, 1, 14.25, -9.5);
    this._buildWall(15.5, 1, 27.75, -9.5);

    this._addEnemySection();
  }

  /** South corridor connecting entry hall to items wing (x=17→20, z=6→9) */
  private _buildSouthCorridor(): void {
    this._buildFloor(3, 3, 18.5, 7.5);
    this._buildWall(1, 3.2, 16.5, 7.5);
    this._buildWall(1, 3.2, 20.5, 7.5);
  }

  /** Items wing: 24×14 floor centered at (23.5, +16) */
  private _buildItemsWing(): void {
    this._buildFloor(24, 14, 23.5, 16);

    this._buildWall(1, 14, 11, 16);
    this._buildWall(1, 14, 36, 16);
    this._buildWall(24, 1, 23.5, 23.5);
    // North wall — two segments around corridor opening at x=17→20
    this._buildWall(5.5, 1, 14.25, 9.5);
    this._buildWall(15.5, 1, 27.75, 9.5);

    this._addItemsSection();
  }

  /** East corridor connecting entry hall to structure wing (x=26.5→29.5, z=±1.5) */
  private _buildEastCorridor(): void {
    this._buildFloor(3, 3, 28, 0);
    this._buildWall(3.2, 1, 28, -2);
    this._buildWall(3.2, 1, 28, 2);
  }

  /** Structure wing: 20×12 floor centered at (39.5, 0) */
  private _buildStructureWing(): void {
    this._buildFloor(20, 12, 39.5, 0);

    // West wall — two segments around east corridor gap at z=±1.5
    this._buildWall(1, 4.5, 29, -3.75);
    this._buildWall(1, 4.5, 29, 3.75);

    // East wall (solid)
    this._buildWall(1, 12, 50, 0);
    // North wall (solid)
    this._buildWall(20, 1, 39.5, -6.5);
    // South wall (solid)
    this._buildWall(20, 1, 39.5, 6.5);

    this._addStructureSection();
  }

  // -------------------------------------------------------------------------
  // Training area (test dummies)
  // -------------------------------------------------------------------------

  /**
   * Build three attackable training dummies in the Entry Hall.
   *
   * Layout:
   *   - Dummy 1 (solo): x=14.5, z=0    — for single-target & range testing
   *   - Dummy 2 (pair): x=17.5, z=-0.5 — pair for AoE / cleave testing
   *   - Dummy 3 (pair): x=17.5, z=+0.5 — pair for AoE / cleave testing
   *
   * A raised training platform visually marks the area.
   */
  private _buildTrainingArea(): void {
    // Raised platform under the training area
    const platGeo = new THREE.BoxGeometry(6, 0.08, 5);
    const platMat = new THREE.MeshLambertMaterial({ color: 0x5c4433 });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.set(16, 0.04, 0);
    platform.receiveShadow = true;
    this.group.add(platform);

    // Border ring around platform
    const borderGeo = new THREE.BoxGeometry(6.3, 0.04, 5.3);
    const borderMat = new THREE.MeshLambertMaterial({ color: 0x7a6a55 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(16, 0.01, 0);
    border.receiveShadow = true;
    this.group.add(border);

    // "TRAINING" sign post behind the dummies
    const signPostGeo = new THREE.BoxGeometry(0.08, 1.6, 0.08);
    const signPostMat = new THREE.MeshLambertMaterial({ color: 0x6a5010 });
    const signPost = new THREE.Mesh(signPostGeo, signPostMat);
    signPost.position.set(19.2, 0.8, 0);
    this.group.add(signPost);

    const signGeo = new THREE.BoxGeometry(1.8, 0.5, 0.06);
    const signMat = new THREE.MeshLambertMaterial({ color: 0x5c4433 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(19.2, 1.5, 0);
    this.group.add(sign);

    // Create the three test dummies
    const positions: Array<[number, number]> = [
      [14.5, 0],     // solo dummy — single-target & range testing
      [17.5, -0.5],  // pair dummy — AoE testing
      [17.5, 0.5],   // pair dummy — AoE testing
    ];

    for (const [x, z] of positions) {
      const dummy = new TestDummy(x, z);
      this.testDummies.push(dummy);
      this.group.add(dummy.mesh);
    }
  }

  // -------------------------------------------------------------------------
  // Asset section builders
  // -------------------------------------------------------------------------

  private _addNpcSection(): void {
    // Merchant vendor placeholder
    this._addAsset(
      { x: 24, z: -3 },
      {
        key: 'npc_merchant',
        name: 'Merchant Vendor',
        category: 'npc',
        displayMesh: buildNpcDisplayMesh(),
        stats: {
          rows: [
            { label: 'Role', value: 'Merchant' },
            { label: 'Location', value: 'Hub' },
            { label: 'Status', value: 'Coming soon' },
            { label: 'Function', value: 'Buy & sell items' },
          ],
          accentColor: '#ffcc44',
          flavorText: 'A mysterious vendor who deals in all manner of adventuring supplies.',
        },
      },
    );
  }

  private _addEnemySection(): void {
    // Sorted alphabetically by typeId — order never changes
    const sortedTypes = (Object.keys(ENEMY_TYPES) as EnemyTypeId[]).sort();

    // Row 1: Regular mobs — z = -11.5, x starting at 14 with spacing 2.5
    sortedTypes.forEach((typeId, i) => {
      const pos = { x: 14 + i * 2.5, z: -11.5 };
      this._addAsset(pos, {
        key: `mob_${typeId}`,
        name: ENEMY_TYPES[typeId].name,
        category: 'enemy_mob',
        displayMesh: buildEnemyDisplayMesh(typeId, false),
        stats: this._enemyStats(typeId, false),
      });
    });

    // Row 2: Captain variants — z = -14.5
    sortedTypes.forEach((typeId, i) => {
      const type = ENEMY_TYPES[typeId];
      const pos = { x: 14 + i * 2.5, z: -14.5 };
      this._addAsset(pos, {
        key: `captain_${typeId}`,
        name: `${type.name} Captain`,
        category: 'enemy_captain',
        displayMesh: buildEnemyDisplayMesh(typeId, true),
        stats: this._enemyStats(typeId, true),
      });
    });

    // Row 3: Bosses sorted by floor number — z = -18.5, spacing 3.0
    for (let floor = 1; floor <= 5; floor++) {
      const config = getFloorConfig(floor).boss;
      const pos = { x: 13 + (floor - 1) * 3.0, z: -18.5 };
      this._addAsset(pos, {
        key: `boss_floor${floor}`,
        name: config.name,
        category: 'enemy_boss',
        displayMesh: buildBossDisplayMesh(config),
        stats: this._bossStats(config, floor),
      });
    }
  }

  private _addItemsSection(): void {
    // Weapon categories sorted alphabetically
    const weaponCategories = ['axe', 'dagger', 'mace', 'spear', 'sword'];
    const rarities: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic'];

    // Weapons: 5 types × 4 rarities, laid out as rows=rarity, cols=category
    weaponCategories.forEach((cat, ci) => {
      rarities.forEach((rarity, ri) => {
        const pos = { x: 14 + ci * 2.0, z: 11 + ri * 2.5 };
        this._addAsset(pos, {
          key: `weapon_${cat}_${rarity}`,
          name: `${this._capitalize(rarity)} ${this._capitalize(cat)}`,
          category: 'item_weapon',
          displayMesh: buildWeaponDisplayMesh(cat, rarity),
          stats: this._weaponStats(cat, rarity),
        });
      });
    });

    // Armor: 4 rarities, single column at x=26
    rarities.forEach((rarity, ri) => {
      const pos = { x: 26, z: 11 + ri * 2.5 };
      this._addAsset(pos, {
        key: `armor_${rarity}`,
        name: `${this._capitalize(rarity)} Armor`,
        category: 'item_armor',
        displayMesh: buildArmorDisplayMesh(rarity),
        stats: this._armorStats(rarity),
      });
    });

    // Rings: 4 rarities, single column at x=28
    rarities.forEach((rarity, ri) => {
      const pos = { x: 28, z: 11 + ri * 2.5 };
      this._addAsset(pos, {
        key: `ring_${rarity}`,
        name: `${this._capitalize(rarity)} Ring`,
        category: 'item_ring',
        displayMesh: buildRingDisplayMesh(rarity),
        stats: this._ringStats(rarity),
      });
    });

    // Potions: 4 types, single row at z=21, spacing 2.0
    const potionDefs: Array<{ effect: ConsumeEffect; name: string }> = [
      { effect: 'heal', name: 'Health Potion' },
      { effect: 'manaShield', name: 'Shield Draught' },
      { effect: 'speedBoost', name: 'Speed Elixir' },
      { effect: 'strengthBoost', name: 'Might Tonic' },
    ];
    potionDefs.forEach((p, i) => {
      const pos = { x: 14 + i * 2.5, z: 21 };
      this._addAsset(pos, {
        key: `potion_${p.effect}`,
        name: p.name,
        category: 'item_potion',
        displayMesh: buildPotionDisplayMesh(p.effect),
        stats: this._potionStats(p.effect, p.name),
      });
    });
  }

  private _addStructureSection(): void {
    // 5 floor themes × 3 tile types
    // Columns = floor themes (x: 31, 34, 37, 40, 43)
    // Rows = tile types (z: -3=floor, 0=wall, +3=door)
    const tileTypes: Array<'floor' | 'wall' | 'door'> = ['floor', 'wall', 'door'];

    for (let floorNum = 1; floorNum <= 5; floorNum++) {
      const config = getFloorConfig(floorNum);
      const theme = config.theme;
      const cx = 31 + (floorNum - 1) * 3;

      tileTypes.forEach((tileType, ti) => {
        const cz = -3 + ti * 3;
        this._addAsset(
          { x: cx, z: cz },
          {
            key: `structure_${floorNum}_${tileType}`,
            name: `${theme.name} — ${this._capitalize(tileType)}`,
            category: 'structure',
            displayMesh: buildStructureDisplayMesh(
              tileType,
              theme.floorColor,
              theme.wallColor,
              theme.wallTopColor,
              theme.doorColor,
            ),
            stats: {
              rows: [
                { label: 'Theme', value: theme.name },
                { label: 'Floor', value: `Dungeon Floor ${floorNum}` },
                { label: 'Tile type', value: this._capitalize(tileType) },
                { label: 'Floor color', value: toHex(theme.floorColor) },
                { label: 'Wall color', value: toHex(theme.wallColor) },
                { label: 'Door color', value: toHex(theme.doorColor) },
                { label: 'Fog color', value: toHex(theme.fogColor) },
              ],
              accentColor: toHex(theme.wallColor),
              flavorText: `Visual theme for ${theme.name}. Used on dungeon floor ${floorNum}.`,
            },
          },
        );
      });
    }
  }

  // -------------------------------------------------------------------------
  // Pedestal + asset placement
  // -------------------------------------------------------------------------

  private _addAsset(
    pos: { x: number; z: number },
    data: Omit<LibraryAsset, 'position' | 'pedestalMesh'>,
  ): void {
    // Pedestal
    const pedGeo = new THREE.CylinderGeometry(0.5, 0.55, 0.25, 8);
    const pedMat = new THREE.MeshLambertMaterial({ color: PEDESTAL_COLOR });
    const pedestalMesh = new THREE.Mesh(pedGeo, pedMat);
    pedestalMesh.position.set(pos.x, 0.125, pos.z);
    pedestalMesh.castShadow = true;
    this.group.add(pedestalMesh);

    // Display mesh — sits on top of pedestal
    data.displayMesh.position.set(pos.x, 0.4, pos.z);
    this.group.add(data.displayMesh);

    this.assets.push({ ...data, position: pos, pedestalMesh });
  }

  // -------------------------------------------------------------------------
  // Floor and wall geometry
  // -------------------------------------------------------------------------

  private _buildFloor(width: number, depth: number, cx: number, cz: number): void {
    // Base slab
    const geo = new THREE.BoxGeometry(width, 0.2, depth);
    const mat = new THREE.MeshLambertMaterial({ color: LIB_FLOOR_COLOR });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, -0.1, cz);
    mesh.receiveShadow = true;
    this.group.add(mesh);

    // Checkerboard accent tiles
    const accentGeo = new THREE.BoxGeometry(TILE_SIZE * 0.94, 0.05, TILE_SIZE * 0.94);
    const accentMat = new THREE.MeshLambertMaterial({ color: LIB_FLOOR_ACCENT });
    const cols = Math.round(width);
    const rows = Math.round(depth);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if ((c + r) % 2 === 0) continue;
        const tile = new THREE.Mesh(accentGeo, accentMat);
        tile.position.set(cx - width / 2 + c + 0.5, 0.01, cz - depth / 2 + r + 0.5);
        tile.receiveShadow = true;
        this.group.add(tile);
      }
    }
  }

  private _buildWall(width: number, depth: number, cx: number, cz: number): void {
    const geo = new THREE.BoxGeometry(width, WALL_HEIGHT, depth);
    const mat = new THREE.MeshLambertMaterial({ color: LIB_WALL_COLOR });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(cx, WALL_HEIGHT / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  // -------------------------------------------------------------------------
  // Stats builders
  // -------------------------------------------------------------------------

  private _enemyStats(typeId: EnemyTypeId, isCaptain: boolean): LibraryAssetStats {
    const type = ENEMY_TYPES[typeId];
    const capHp = isCaptain ? CAPTAIN_HP_MULT : 1;
    const capDmg = isCaptain ? CAPTAIN_DMG_MULT : 1;
    const baseHp = Math.round(ENEMY_HP * type.hpMult * capHp);
    const baseDmg = Math.round(ENEMY_ATTACK_DAMAGE * type.dmgMult * capDmg);
    const speed = (ENEMY_SPEED * type.speedMult).toFixed(1);
    return {
      rows: [
        { label: 'Type', value: isCaptain ? `${type.name} Captain` : type.name },
        { label: 'Base HP', value: String(baseHp) },
        { label: 'Base Damage', value: String(baseDmg) },
        { label: 'Speed', value: speed },
        { label: 'Attack Range', value: `${type.attackRange.toFixed(1)} tiles` },
        { label: 'Attack Cooldown', value: `${type.attackCooldown.toFixed(1)}s` },
        { label: 'Size Scale', value: `${type.bodyScale.toFixed(2)}× ${isCaptain ? `(×${CAPTAIN_SCALE} captain)` : ''}`.trim() },
      ],
      accentColor: toHex(type.color),
      flavorText: isCaptain
        ? `An elite ${type.name.toLowerCase()} — tougher and more dangerous than the common variant.`
        : undefined,
    };
  }

  private _bossStats(config: import('../dungeon/FloorConfig').BossConfig, floorNum: number): LibraryAssetStats {
    return {
      rows: [
        { label: 'Name', value: config.name },
        { label: 'Floor', value: String(floorNum) },
        { label: 'Base HP', value: String(Math.round(ENEMY_HP * config.hpMultiplier)) },
        { label: 'Damage Mult', value: `×${config.dmgMultiplier.toFixed(1)}` },
        { label: 'Speed', value: config.speed.toFixed(1) },
        { label: 'Attack Cooldown', value: `${config.attackCooldown.toFixed(1)}s` },
        { label: 'Scale', value: config.scale.toFixed(1) },
        { label: 'Abilities', value: config.abilities.join(', ') },
      ],
      accentColor: toHex(config.color),
      flavorText: `The boss of Floor ${floorNum}. Defeat it to unlock the floor exit.`,
    };
  }

  private _weaponStats(category: string, rarity: ItemRarity): LibraryAssetStats {
    const mult = { common: 1, uncommon: 1.5, rare: 2, epic: 3 }[rarity];
    const floor = 3; // representative mid-game floor
    const flatDmg = Math.round((3 + floor * 2) * mult);
    const details: string[] = [`+${flatDmg} damage`];

    switch (category) {
      case 'sword': if (rarity !== 'common') details.push(`+${Math.round((1 + floor * 0.5) * (mult - 0.5))} strength`); break;
      case 'axe': details[0] = `+${Math.round(flatDmg * 1.15)} damage`; if (rarity !== 'common') details.push(`+${(0.01 * mult * 100).toFixed(1)}% crit`); break;
      case 'mace': if (rarity !== 'common') details.push(`+${Math.round((1 + floor * 0.3) * (mult - 0.5))} defense`); break;
      case 'dagger': details[0] = `+${Math.round(flatDmg * 0.85)} damage`; details.push(`+${(0.03 * mult * 100).toFixed(0)}% atk speed`); if (rarity !== 'common') details.push(`+${(0.02 * mult * 100).toFixed(1)}% crit`); break;
      case 'spear': if (rarity !== 'common') details.push(`+${Math.round((2 + floor * 0.4) * (mult - 0.5))} strength`); break;
    }

    return {
      rows: [
        { label: 'Category', value: this._capitalize(category) },
        { label: 'Slot', value: 'Weapon' },
        { label: 'Rarity', value: this._capitalize(rarity) },
        { label: 'Stats (fl.3)', value: details.join(', ') },
        { label: 'Drops from', value: 'Enemies, bosses, chests' },
      ],
      accentColor: rarityColor(rarity),
      flavorText: this._rarityFlavor(rarity),
    };
  }

  private _armorStats(rarity: ItemRarity): LibraryAssetStats {
    const mult = { common: 1, uncommon: 1.5, rare: 2, epic: 3 }[rarity];
    const floor = 3;
    const def = Math.round((2 + floor * 1.5) * mult);
    const hp = Math.round((5 + floor * 3) * mult);
    const rows: Array<{ label: string; value: string }> = [
      { label: 'Slot', value: 'Armor' },
      { label: 'Rarity', value: this._capitalize(rarity) },
      { label: 'Defense (fl.3)', value: `+${def}` },
      { label: 'Max HP (fl.3)', value: `+${hp}` },
    ];
    if (rarity !== 'common') rows.push({ label: 'Vitality', value: `+${Math.round((1 + floor * 0.3) * (mult - 0.5))}` });
    if (rarity === 'epic') rows.push({ label: 'HP Regen', value: '+0.5/s' });
    return {
      rows,
      accentColor: rarityColor(rarity),
      flavorText: this._rarityFlavor(rarity),
    };
  }

  private _ringStats(rarity: ItemRarity): LibraryAssetStats {
    const mult = { common: 1, uncommon: 1.5, rare: 2, epic: 3 }[rarity];
    const floor = 3;
    const statVal = Math.round((2 + floor * 0.5) * mult);
    const rows: Array<{ label: string; value: string }> = [
      { label: 'Slot', value: 'Ring' },
      { label: 'Rarity', value: this._capitalize(rarity) },
      { label: 'Primary Stat', value: `+${statVal} (agility / luck / strength / vitality)` },
    ];
    if (rarity !== 'common') rows.push({ label: 'Crit Chance', value: `+${(0.01 * mult * 100).toFixed(1)}%` });
    if (rarity === 'rare' || rarity === 'epic') rows.push({ label: 'Move Speed', value: `+${(0.03 * mult * 100).toFixed(0)}%` });
    return {
      rows,
      accentColor: rarityColor(rarity),
      flavorText: this._rarityFlavor(rarity),
    };
  }

  private _potionStats(effect: ConsumeEffect, name: string): LibraryAssetStats {
    const floor = 3;
    const infoMap: Record<ConsumeEffect, { effect: string; value: string; duration: string; rarity: string }> = {
      heal:          { effect: 'Restore health',        value: `${30 + floor * 10} HP`,       duration: 'Instant',  rarity: 'Common' },
      manaShield:    { effect: 'Absorb incoming damage', value: `${40 + floor * 8} shield HP`, duration: '20s',      rarity: 'Rare' },
      speedBoost:    { effect: 'Increase move speed',   value: '+50% speed',                   duration: '10s',      rarity: 'Uncommon' },
      strengthBoost: { effect: 'Increase attack damage', value: `+${10 + floor * 3} flat dmg`, duration: '15s',      rarity: 'Uncommon' },
    };
    const info = infoMap[effect];
    return {
      rows: [
        { label: 'Name', value: name },
        { label: 'Rarity', value: info.rarity },
        { label: 'Effect', value: info.effect },
        { label: 'Value (fl.3)', value: info.value },
        { label: 'Duration', value: info.duration },
        { label: 'Drops from', value: 'Enemies, chests, bosses' },
      ],
      accentColor: toHex(POTION_COLORS[effect]),
    };
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  private _capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private _rarityFlavor(rarity: ItemRarity): string {
    const map: Record<ItemRarity, string> = {
      common: 'A common find in any dungeon.',
      uncommon: 'Better craftsmanship than most.',
      rare: 'Prized by seasoned adventurers.',
      epic: 'A legendary artifact of immense power.',
    };
    return map[rarity];
  }
}

/**
 * Asset Library scene — a hand-built multi-room space for inspecting all visual game assets.
 *
 * Layout (top-down, positive X is east, negative Z is north):
 *
 *                  [NPC Room]          [Enemy Wing]               [Structure Wing]
 *                      |                    |                           |
 *   Hub → [entry] → ════[wide corridor]══════════════════════════════════════ [end]
 *                      |                    |                           |
 *                 [Player Chars]       [Training Room]              [Items Wing]
 *
 * The main corridor runs east from the hub entry, with rooms branching off
 * north and south via short connector corridors.  This spine-and-branch layout
 * makes it easy to add new rooms — just extend the corridor and add a branch.
 *
 * Assets sit on pedestals sorted by stable string keys so positions never change
 * as new assets are added — new entries always append to the end of their section.
 */

import * as THREE from 'three';
import {
  TILE_SIZE,
  WALL_HEIGHT,
  PLAYER_SIZE,
  PLAYER_HEIGHT,
  COLORS,
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
import { ObstacleType } from '../dungeon/DungeonGenerator';
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
  | 'obstacle'
  | 'npc'
  | 'player_character';

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

export function buildObstacleDisplayMesh(type: ObstacleType): THREE.Group {
  const group = new THREE.Group();

  switch (type) {
    case ObstacleType.Furniture: {
      // Crate body
      const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8b6914 });
      const bodyGeo = new THREE.BoxGeometry(0.5, 0.55, 0.5);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.275;
      body.castShadow = true;
      group.add(body);
      // Crate top (lighter)
      const topMat = new THREE.MeshLambertMaterial({ color: 0xa07828 });
      const topGeo = new THREE.BoxGeometry(0.52, 0.06, 0.52);
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = 0.58;
      group.add(top);
      break;
    }
    case ObstacleType.Water: {
      // Translucent blue pool
      const mat = new THREE.MeshLambertMaterial({
        color: 0x2266cc,
        transparent: true,
        opacity: 0.55,
      });
      const geo = new THREE.BoxGeometry(0.65, 0.08, 0.65);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.04;
      group.add(mesh);
      // Ripple ring on surface
      const ringMat = new THREE.MeshLambertMaterial({
        color: 0x4488ee,
        transparent: true,
        opacity: 0.4,
      });
      const ringGeo = new THREE.TorusGeometry(0.2, 0.02, 4, 12);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.1;
      group.add(ring);
      break;
    }
    case ObstacleType.Mud: {
      // Brown muddy patch
      const mat = new THREE.MeshLambertMaterial({
        color: 0x665533,
        transparent: true,
        opacity: 0.7,
      });
      const geo = new THREE.BoxGeometry(0.65, 0.06, 0.65);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.03;
      group.add(mesh);
      // Small lumps on surface
      const lumpMat = new THREE.MeshLambertMaterial({ color: 0x554422 });
      const lumpGeo = new THREE.BoxGeometry(0.12, 0.06, 0.12);
      for (const [lx, lz] of [
        [-0.15, -0.1],
        [0.18, 0.12],
        [-0.08, 0.2],
      ] as [number, number][]) {
        const lump = new THREE.Mesh(lumpGeo, lumpMat);
        lump.position.set(lx, 0.09, lz);
        group.add(lump);
      }
      break;
    }
    case ObstacleType.Fire: {
      // Glowing orange/red fire
      const mat = new THREE.MeshLambertMaterial({ color: 0xff4400 });
      mat.emissive = new THREE.Color(0xff2200);
      mat.emissiveIntensity = 0.6;
      const geo = new THREE.BoxGeometry(0.45, 0.3, 0.45);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.15;
      group.add(mesh);
      // Flame tip
      const tipMat = new THREE.MeshLambertMaterial({ color: 0xffaa00 });
      tipMat.emissive = new THREE.Color(0xff6600);
      tipMat.emissiveIntensity = 0.5;
      const tipGeo = new THREE.ConeGeometry(0.15, 0.25, 5);
      const tip = new THREE.Mesh(tipGeo, tipMat);
      tip.position.y = 0.42;
      group.add(tip);
      break;
    }
    case ObstacleType.Trap: {
      // Metallic pressure plate
      const plateMat = new THREE.MeshLambertMaterial({ color: 0xccaa22 });
      const plateGeo = new THREE.BoxGeometry(0.44, 0.08, 0.44);
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.y = 0.04;
      group.add(plate);
      // Red warning dot
      const dotMat = new THREE.MeshLambertMaterial({ color: 0xff2222 });
      dotMat.emissive = new THREE.Color(0xff0000);
      dotMat.emissiveIntensity = 0.8;
      const dotGeo = new THREE.BoxGeometry(0.1, 0.06, 0.1);
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.y = 0.11;
      group.add(dot);
      break;
    }
    default: {
      // Fallback empty group
      break;
    }
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
// Player character display mesh builders
// ---------------------------------------------------------------------------

/** Simple box player — matches the default in-game model */
function buildSimplePlayerDisplayMesh(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: COLORS.player });

  const bodyGeo = new THREE.BoxGeometry(PLAYER_SIZE, PLAYER_HEIGHT, PLAYER_SIZE);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = PLAYER_HEIGHT / 2;
  body.castShadow = true;
  group.add(body);

  // Eyes — two small dark boxes on the "face" side
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x222244 });
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.04);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.12, PLAYER_HEIGHT * 0.7, -PLAYER_SIZE / 2 - 0.01);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.12, PLAYER_HEIGHT * 0.7, -PLAYER_SIZE / 2 - 0.01);
  group.add(rightEye);

  return group;
}

/** Owl character — geometric representation of the voxel owl model */
function buildOwlDisplayMesh(): THREE.Group {
  const group = new THREE.Group();
  const bodyColor = 0x8b6844;
  const bellyColor = 0xd4b896;
  const eyeColor = 0xffcc00;

  // Body — rounded barrel shape (cylinder)
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const bodyGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.55, 8);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.45;
  body.castShadow = true;
  group.add(body);

  // Belly patch
  const bellyMat = new THREE.MeshLambertMaterial({ color: bellyColor });
  const bellyGeo = new THREE.BoxGeometry(0.28, 0.35, 0.08);
  const belly = new THREE.Mesh(bellyGeo, bellyMat);
  belly.position.set(0, 0.4, -0.26);
  group.add(belly);

  // Head
  const headGeo = new THREE.BoxGeometry(0.36, 0.3, 0.34);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.y = 0.88;
  head.castShadow = true;
  group.add(head);

  // Ear tufts (two small cones)
  const tuftMat = new THREE.MeshLambertMaterial({ color: 0x6a4e2e });
  const tuftGeo = new THREE.ConeGeometry(0.06, 0.15, 4);
  const leftTuft = new THREE.Mesh(tuftGeo, tuftMat);
  leftTuft.position.set(-0.12, 1.1, 0);
  group.add(leftTuft);
  const rightTuft = new THREE.Mesh(tuftGeo, tuftMat);
  rightTuft.position.set(0.12, 1.1, 0);
  group.add(rightTuft);

  // Eyes — large golden circles
  const eyeMat = new THREE.MeshLambertMaterial({ color: eyeColor });
  const eyeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.04, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.rotation.x = Math.PI / 2;
  leftEye.position.set(-0.1, 0.9, -0.17);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.rotation.x = Math.PI / 2;
  rightEye.position.set(0.1, 0.9, -0.17);
  group.add(rightEye);

  // Pupils
  const pupilMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const pupilGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 6);
  const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
  leftPupil.rotation.x = Math.PI / 2;
  leftPupil.position.set(-0.1, 0.9, -0.19);
  group.add(leftPupil);
  const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
  rightPupil.rotation.x = Math.PI / 2;
  rightPupil.position.set(0.1, 0.9, -0.19);
  group.add(rightPupil);

  // Beak
  const beakMat = new THREE.MeshLambertMaterial({ color: 0xff8822 });
  const beakGeo = new THREE.ConeGeometry(0.05, 0.12, 4);
  const beak = new THREE.Mesh(beakGeo, beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.82, -0.22);
  group.add(beak);

  // Wings — flat boxes on the sides
  const wingMat = new THREE.MeshLambertMaterial({ color: 0x7a5c3a });
  const wingGeo = new THREE.BoxGeometry(0.06, 0.35, 0.2);
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.set(-0.3, 0.5, 0);
  leftWing.rotation.z = 0.15;
  group.add(leftWing);
  const rightWing = new THREE.Mesh(wingGeo, wingMat);
  rightWing.position.set(0.3, 0.5, 0);
  rightWing.rotation.z = -0.15;
  group.add(rightWing);

  // Feet
  const feetMat = new THREE.MeshLambertMaterial({ color: 0xff8822 });
  const footGeo = new THREE.BoxGeometry(0.1, 0.06, 0.14);
  const leftFoot = new THREE.Mesh(footGeo, feetMat);
  leftFoot.position.set(-0.1, 0.03, -0.02);
  group.add(leftFoot);
  const rightFoot = new THREE.Mesh(footGeo, feetMat);
  rightFoot.position.set(0.1, 0.03, -0.02);
  group.add(rightFoot);

  return group;
}

/** Owlbear character — a hulking bear body with owl features */
function buildOwlbearDisplayMesh(): THREE.Group {
  const group = new THREE.Group();
  const furColor = 0x5c4028;
  const bellyColor = 0x9a7a55;

  // Bulky body
  const bodyMat = new THREE.MeshLambertMaterial({ color: furColor });
  const bodyGeo = new THREE.BoxGeometry(0.55, 0.7, 0.45);
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);

  // Belly patch
  const bellyMat = new THREE.MeshLambertMaterial({ color: bellyColor });
  const bellyGeo = new THREE.BoxGeometry(0.35, 0.45, 0.08);
  const belly = new THREE.Mesh(bellyGeo, bellyMat);
  belly.position.set(0, 0.5, -0.22);
  group.add(belly);

  // Head — owl-like but larger
  const headGeo = new THREE.BoxGeometry(0.42, 0.36, 0.38);
  const head = new THREE.Mesh(headGeo, bodyMat);
  head.position.y = 1.1;
  head.castShadow = true;
  group.add(head);

  // Ear tufts (like an owl but beefier)
  const tuftMat = new THREE.MeshLambertMaterial({ color: 0x4a3020 });
  const tuftGeo = new THREE.ConeGeometry(0.08, 0.18, 4);
  const leftTuft = new THREE.Mesh(tuftGeo, tuftMat);
  leftTuft.position.set(-0.14, 1.38, 0);
  group.add(leftTuft);
  const rightTuft = new THREE.Mesh(tuftGeo, tuftMat);
  rightTuft.position.set(0.14, 1.38, 0);
  group.add(rightTuft);

  // Eyes — large golden owl eyes
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0xffaa00 });
  const eyeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 8);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.rotation.x = Math.PI / 2;
  leftEye.position.set(-0.11, 1.14, -0.19);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.rotation.x = Math.PI / 2;
  rightEye.position.set(0.11, 1.14, -0.19);
  group.add(rightEye);

  // Beak — sharper, larger
  const beakMat = new THREE.MeshLambertMaterial({ color: 0xcc6600 });
  const beakGeo = new THREE.ConeGeometry(0.07, 0.16, 4);
  const beak = new THREE.Mesh(beakGeo, beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 1.05, -0.24);
  group.add(beak);

  // Arms / paws — thick stumpy limbs
  const armMat = new THREE.MeshLambertMaterial({ color: furColor });
  const armGeo = new THREE.BoxGeometry(0.14, 0.45, 0.16);
  const leftArm = new THREE.Mesh(armGeo, armMat);
  leftArm.position.set(-0.35, 0.55, 0);
  group.add(leftArm);
  const rightArm = new THREE.Mesh(armGeo, armMat);
  rightArm.position.set(0.35, 0.55, 0);
  group.add(rightArm);

  // Claws on each arm
  const clawMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const clawGeo = new THREE.BoxGeometry(0.04, 0.08, 0.04);
  for (const side of [-1, 1]) {
    for (let ci = -1; ci <= 1; ci++) {
      const claw = new THREE.Mesh(clawGeo, clawMat);
      claw.position.set(side * 0.35 + ci * 0.04, 0.29, -0.06);
      group.add(claw);
    }
  }

  // Legs — thick
  const legGeo = new THREE.BoxGeometry(0.16, 0.3, 0.18);
  const leftLeg = new THREE.Mesh(legGeo, bodyMat);
  leftLeg.position.set(-0.16, 0.15, 0);
  group.add(leftLeg);
  const rightLeg = new THREE.Mesh(legGeo, bodyMat);
  rightLeg.position.set(0.16, 0.15, 0);
  group.add(rightLeg);

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
const HIGHLIGHT_RANGE = 2.5; // must be close to inspect (similar to attack range)
const HIGHLIGHT_DOT_MIN = 0.5; // ~60° half-cone (wider to compensate for shorter range)
const ROTATION_SPEED = 0.5; // rad/s
const PEDESTAL_COLLISION_HALF = 0.45; // half-size of pedestal collision AABB

// ---------------------------------------------------------------------------
// Corridor layout constants
// ---------------------------------------------------------------------------

/** Main corridor: 5 tiles wide, centered at z=0 */
const CORRIDOR_HALF_WIDTH = 2.5;

/** X-coordinate where the main corridor starts (east of entry corridor) */
const CORRIDOR_START_X = 11.5;

/** X-coordinate where the main corridor ends */
const CORRIDOR_END_X = 63;

/** Room branch definitions — each room branches off the corridor */
interface RoomBranch {
  /** Label shown on the room sign */
  label: string;
  /** X center of the connector gap in the corridor wall */
  connectorCX: number;
  /** Width of the connector gap (and connector corridor floor) */
  connectorWidth: number;
  /** 'north' (negative z) or 'south' (positive z) */
  side: 'north' | 'south';
  /** Room floor width (x) */
  roomWidth: number;
  /** Room floor depth (z) */
  roomDepth: number;
  /** Room center X (defaults to connectorCX if not specified) */
  roomCX?: number;
}

/** Z coordinate of the corridor north wall center */
const CORR_WALL_N = -(CORRIDOR_HALF_WIDTH + 0.5);
/** Z coordinate of the corridor south wall center */
const CORR_WALL_S = CORRIDOR_HALF_WIDTH + 0.5;
/** Connector corridor length (from corridor wall to room) */
const CONNECTOR_LENGTH = 3;

// Room branch specifications along the corridor
// Connector positions are spread so that rooms on the same side never overlap.
const ROOM_BRANCHES: RoomBranch[] = [
  {
    label: 'PLAYER CHARACTERS',
    connectorCX: 16.5,
    connectorWidth: 3,
    side: 'south',
    roomWidth: 10,
    roomDepth: 8,
  },
  {
    label: 'NPC CHARACTERS',
    connectorCX: 16.5,
    connectorWidth: 3,
    side: 'north',
    roomWidth: 10,
    roomDepth: 8,
  },
  {
    label: 'TRAINING',
    connectorCX: 31,
    connectorWidth: 3,
    side: 'south',
    roomWidth: 12,
    roomDepth: 10,
  },
  {
    label: 'ENEMIES',
    connectorCX: 31,
    connectorWidth: 3,
    side: 'north',
    roomWidth: 18,
    roomDepth: 16,
  },
  {
    label: 'ITEMS',
    connectorCX: 51,
    connectorWidth: 3,
    side: 'south',
    roomWidth: 18,
    roomDepth: 16,
  },
  {
    label: 'DUNGEON STRUCTURES',
    connectorCX: 51,
    connectorWidth: 3,
    side: 'north',
    roomWidth: 20,
    roomDepth: 26,
  },
];

/** Axis-aligned wall bounding box in the XZ plane */
export interface WallAABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export class AssetLibrary {
  readonly group: THREE.Group;
  private assets: LibraryAsset[] = [];
  private highlightedAsset: LibraryAsset | null = null;
  private testDummies: TestDummy[] = [];
  private wallAABBs: WallAABB[] = [];

  constructor() {
    this.group = new THREE.Group();
    this._buildEntryCorridor();
    this._buildMainCorridor();
    this._buildAllRooms();
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

  getWallSegments(): WallAABB[] {
    return this.wallAABBs;
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

      // Higher score = closer AND directly faced (distance is primary factor)
      const score = dot - dist * 0.25;
      if (score > bestScore) {
        bestScore = score;
        best = asset;
      }
    }

    if (best !== this.highlightedAsset) {
      if (this.highlightedAsset) {
        (this.highlightedAsset.pedestalMesh.material as THREE.MeshLambertMaterial).color.setHex(
          PEDESTAL_COLOR,
        );
      }
      if (best) {
        (best.pedestalMesh.material as THREE.MeshLambertMaterial).color.setHex(PEDESTAL_HIGHLIGHT);
      }
      this.highlightedAsset = best;
    }
  }

  // -------------------------------------------------------------------------
  // Entry corridor (hub → main corridor)
  // -------------------------------------------------------------------------

  /** Entry corridor connecting hub east wall to main corridor */
  private _buildEntryCorridor(): void {
    const entryDepth = CORRIDOR_HALF_WIDTH * 2;
    this._buildFloor(3, entryDepth, 10, 0);
    // Side walls (north and south of corridor)
    this._buildWall(3.2, 1, 10, -(CORRIDOR_HALF_WIDTH + 0.5));
    this._buildWall(3.2, 1, 10, CORRIDOR_HALF_WIDTH + 0.5);
  }

  // -------------------------------------------------------------------------
  // Main corridor spine
  // -------------------------------------------------------------------------

  private _buildMainCorridor(): void {
    const corridorLength = CORRIDOR_END_X - CORRIDOR_START_X;

    // Floor: long strip from entry to end — extend depth to cover under
    // the wall positions so doorway openings don't have floor gaps.
    const floorDepth = (CORRIDOR_HALF_WIDTH + 0.5) * 2;
    this._buildFloor(corridorLength, floorDepth, CORRIDOR_START_X + corridorLength / 2, 0);

    // Build north and south walls with gaps for room connectors
    this._buildCorridorWallWithGaps('north');
    this._buildCorridorWallWithGaps('south');

    // East end wall (closes off the corridor)
    this._buildWall(1, CORRIDOR_HALF_WIDTH * 2, CORRIDOR_END_X + 0.5, 0);
  }

  /** Build one side of the corridor wall, leaving gaps where rooms branch off */
  private _buildCorridorWallWithGaps(side: 'north' | 'south'): void {
    const wallZ = side === 'north' ? CORR_WALL_N : CORR_WALL_S;

    // Collect all gaps on this side, sorted by x
    const gaps: Array<{ startX: number; endX: number }> = [];
    for (const branch of ROOM_BRANCHES) {
      if (branch.side !== side) continue;
      const halfW = branch.connectorWidth / 2;
      gaps.push({
        startX: branch.connectorCX - halfW,
        endX: branch.connectorCX + halfW,
      });
    }
    gaps.sort((a, b) => a.startX - b.startX);

    // Build wall segments between gaps
    let curX = CORRIDOR_START_X;
    for (const gap of gaps) {
      const segLen = gap.startX - curX;
      if (segLen > 0.1) {
        this._buildWall(segLen, 1, curX + segLen / 2, wallZ);
      }
      curX = gap.endX;
    }
    // Final segment from last gap to corridor end
    const finalLen = CORRIDOR_END_X - curX;
    if (finalLen > 0.1) {
      this._buildWall(finalLen, 1, curX + finalLen / 2, wallZ);
    }
  }

  // -------------------------------------------------------------------------
  // Room construction
  // -------------------------------------------------------------------------

  private _buildAllRooms(): void {
    for (const branch of ROOM_BRANCHES) {
      this._buildRoomBranch(branch);
    }

    // Populate rooms with assets
    this._addPlayerCharacterSection();
    this._addNpcSection();
    this._addTrainingArea();
    this._addEnemySection();
    this._addItemsSection();
    this._addStructureSection();
  }

  /** Build a connector corridor and room for a single branch */
  private _buildRoomBranch(branch: RoomBranch): void {
    const sign = branch.side === 'south' ? 1 : -1;
    const wallEdge = branch.side === 'south' ? CORR_WALL_S : CORR_WALL_N;
    const wallEdgeOuter = wallEdge + sign * 0.5; // outer edge of corridor wall

    // Connector corridor floor
    const connCZ = wallEdgeOuter + (sign * CONNECTOR_LENGTH) / 2;
    this._buildFloor(branch.connectorWidth, CONNECTOR_LENGTH, branch.connectorCX, connCZ);

    // Connector side walls
    const halfW = branch.connectorWidth / 2;
    this._buildWall(1, CONNECTOR_LENGTH + 0.2, branch.connectorCX - halfW - 0.5, connCZ);
    this._buildWall(1, CONNECTOR_LENGTH + 0.2, branch.connectorCX + halfW + 0.5, connCZ);

    // Room floor
    const roomCX = branch.roomCX ?? branch.connectorCX;
    const roomEdge = wallEdgeOuter + sign * CONNECTOR_LENGTH;
    const roomCZ = roomEdge + (sign * branch.roomDepth) / 2;
    this._buildFloor(branch.roomWidth, branch.roomDepth, roomCX, roomCZ);

    // Room walls (4 sides, with gap on the connector side)
    const roomMinX = roomCX - branch.roomWidth / 2;
    const roomMaxX = roomCX + branch.roomWidth / 2;
    const roomMinZ = roomCZ - branch.roomDepth / 2;
    const roomMaxZ = roomCZ + branch.roomDepth / 2;

    // The wall facing the connector (has a gap)
    const connWallZ = branch.side === 'south' ? roomMinZ : roomMaxZ;
    const gapMinX = branch.connectorCX - halfW;
    const gapMaxX = branch.connectorCX + halfW;

    // Left portion of connector-side wall
    const leftLen = gapMinX - roomMinX;
    if (leftLen > 0.1) {
      this._buildWall(leftLen, 1, roomMinX + leftLen / 2, connWallZ);
    }
    // Right portion of connector-side wall
    const rightLen = roomMaxX - gapMaxX;
    if (rightLen > 0.1) {
      this._buildWall(rightLen, 1, gapMaxX + rightLen / 2, connWallZ);
    }

    // Opposite wall (solid)
    const oppWallZ = branch.side === 'south' ? roomMaxZ : roomMinZ;
    this._buildWall(branch.roomWidth, 1, roomCX, oppWallZ);

    // Side walls (west and east)
    this._buildWall(1, branch.roomDepth, roomMinX - 0.5, roomCZ);
    this._buildWall(1, branch.roomDepth, roomMaxX + 0.5, roomCZ);

    // Room sign
    this._buildRoomSign(branch.label, branch.connectorCX, connCZ, branch.side);
  }

  /** Place a sign post with label near the connector entrance */
  private _buildRoomSign(label: string, cx: number, cz: number, side: 'north' | 'south'): void {
    // Sign post
    const signPostGeo = new THREE.BoxGeometry(0.08, 1.6, 0.08);
    const signPostMat = new THREE.MeshLambertMaterial({ color: 0x6a5010 });
    const signPost = new THREE.Mesh(signPostGeo, signPostMat);
    const signX = cx + 2;
    signPost.position.set(signX, 0.8, cz);
    this.group.add(signPost);

    const signGeo = new THREE.BoxGeometry(Math.min(label.length * 0.18 + 0.4, 3.0), 0.5, 0.06);
    const signMat = new THREE.MeshLambertMaterial({ color: 0x5c4433 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(signX, 1.5, cz);
    // Rotate sign so it faces the corridor (player walking east)
    if (side === 'south') {
      sign.rotation.y = Math.PI / 2;
      signPost.position.z = cz - 0.5;
      sign.position.z = cz - 0.5;
    } else {
      sign.rotation.y = Math.PI / 2;
      signPost.position.z = cz + 0.5;
      sign.position.z = cz + 0.5;
    }
    this.group.add(sign);
  }

  // -------------------------------------------------------------------------
  // Room helper: compute room center for a branch
  // -------------------------------------------------------------------------

  private _getRoomCenter(branch: RoomBranch): { cx: number; cz: number } {
    const sign = branch.side === 'south' ? 1 : -1;
    const wallEdge = branch.side === 'south' ? CORR_WALL_S : CORR_WALL_N;
    const wallEdgeOuter = wallEdge + sign * 0.5;
    const roomEdge = wallEdgeOuter + sign * CONNECTOR_LENGTH;
    const cx = branch.roomCX ?? branch.connectorCX;
    const cz = roomEdge + (sign * branch.roomDepth) / 2;
    return { cx, cz };
  }

  // -------------------------------------------------------------------------
  // Player Characters room (south, first branch)
  // -------------------------------------------------------------------------

  private _addPlayerCharacterSection(): void {
    const branch = ROOM_BRANCHES[0]; // Player Characters
    const { cx, cz } = this._getRoomCenter(branch);

    // Three player models: simple, owl, owlbear
    const models: Array<{
      key: string;
      name: string;
      builder: () => THREE.Group;
      stats: LibraryAssetStats;
    }> = [
      {
        key: 'player_simple',
        name: 'Simple (Default)',
        builder: buildSimplePlayerDisplayMesh,
        stats: {
          rows: [
            { label: 'Model', value: 'Simple Box' },
            { label: 'Style', value: 'Geometric' },
            { label: 'Status', value: 'Available' },
            { label: 'Selection', value: 'Settings → Character' },
          ],
          accentColor: toHex(COLORS.player),
          flavorText: 'The default adventurer. A sturdy blue box ready to take on the dungeon.',
        },
      },
      {
        key: 'player_owl',
        name: 'Owl',
        builder: buildOwlDisplayMesh,
        stats: {
          rows: [
            { label: 'Model', value: 'Owl' },
            { label: 'Style', value: 'Voxel (.glb)' },
            { label: 'Status', value: 'Available' },
            { label: 'Selection', value: 'Settings → Character' },
          ],
          accentColor: '#8b6844',
          flavorText: 'A wise owl adventurer with keen eyes and silent wings. Sees in the dark.',
        },
      },
      {
        key: 'player_owlbear',
        name: 'Owlbear',
        builder: buildOwlbearDisplayMesh,
        stats: {
          rows: [
            { label: 'Model', value: 'Owlbear' },
            { label: 'Style', value: 'Voxel (.glb)' },
            { label: 'Status', value: 'Available' },
            { label: 'Selection', value: 'Settings → Character' },
          ],
          accentColor: '#5c4028',
          flavorText:
            'A fearsome owlbear — the strength of a bear combined with the cunning of an owl.',
        },
      },
    ];

    models.forEach((m, i) => {
      const pos = { x: cx - 3 + i * 3, z: cz };
      this._addAsset(pos, {
        key: m.key,
        name: m.name,
        category: 'player_character',
        displayMesh: m.builder(),
        stats: m.stats,
      });
    });
  }

  // -------------------------------------------------------------------------
  // NPC Characters room (north, first branch)
  // -------------------------------------------------------------------------

  private _addNpcSection(): void {
    const branch = ROOM_BRANCHES[1]; // NPC Characters
    const { cx, cz } = this._getRoomCenter(branch);

    // Merchant vendor
    this._addAsset(
      { x: cx - 2, z: cz },
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

    // Placeholder for future NPCs (quest giver, blacksmith, etc.)
    this._addAsset(
      { x: cx + 2, z: cz },
      {
        key: 'npc_questgiver',
        name: 'Quest Giver',
        category: 'npc',
        displayMesh: (() => {
          const g = buildNpcDisplayMesh();
          // Recolor to distinguish from merchant
          g.traverse((child) => {
            if (
              child instanceof THREE.Mesh &&
              child.material instanceof THREE.MeshLambertMaterial
            ) {
              if (child.material.color.getHex() === 0x6644aa) {
                child.material = new THREE.MeshLambertMaterial({ color: 0x226644 });
              }
            }
          });
          return g;
        })(),
        stats: {
          rows: [
            { label: 'Role', value: 'Quest Giver' },
            { label: 'Location', value: 'Hub' },
            { label: 'Status', value: 'Coming soon' },
            { label: 'Function', value: 'Assign quests & bounties' },
          ],
          accentColor: '#44cc88',
          flavorText: 'A weathered adventurer who sends heroes on dangerous missions.',
        },
      },
    );
  }

  // -------------------------------------------------------------------------
  // Training room (south, second branch)
  // -------------------------------------------------------------------------

  /**
   * Build attackable training dummies in the dedicated Training Room.
   *
   * Layout:
   *   - Dummy 1 (solo): left side — for single-target & range testing
   *   - Dummy 2+3 (pair): right side — for AoE / cleave testing
   *
   * A raised training platform visually marks the area.
   */
  private _addTrainingArea(): void {
    const branch = ROOM_BRANCHES[2]; // Training
    const { cx, cz } = this._getRoomCenter(branch);

    // Raised platform under the training area
    const platGeo = new THREE.BoxGeometry(8, 0.08, 6);
    const platMat = new THREE.MeshLambertMaterial({ color: 0x5c4433 });
    const platform = new THREE.Mesh(platGeo, platMat);
    platform.position.set(cx, 0.04, cz);
    platform.receiveShadow = true;
    this.group.add(platform);

    // Border ring around platform
    const borderGeo = new THREE.BoxGeometry(8.3, 0.04, 6.3);
    const borderMat = new THREE.MeshLambertMaterial({ color: 0x7a6a55 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(cx, 0.01, cz);
    border.receiveShadow = true;
    this.group.add(border);

    // Create test dummies
    const positions: Array<[number, number]> = [
      [cx - 2.5, cz], // solo dummy — single-target & range testing
      [cx + 1.5, cz - 0.8], // pair dummy — AoE testing
      [cx + 1.5, cz + 0.8], // pair dummy — AoE testing
    ];

    for (const [x, z] of positions) {
      const dummy = new TestDummy(x, z);
      this.testDummies.push(dummy);
      this.group.add(dummy.mesh);
    }
  }

  // -------------------------------------------------------------------------
  // Enemy wing (north, second branch)
  // -------------------------------------------------------------------------

  private _addEnemySection(): void {
    const branch = ROOM_BRANCHES[3]; // Enemies
    const { cx, cz } = this._getRoomCenter(branch);
    const startX = cx - branch.roomWidth / 2 + 3;

    // Sorted alphabetically by typeId — order never changes
    const sortedTypes = (Object.keys(ENEMY_TYPES) as EnemyTypeId[]).sort();

    // Row 1: Regular mobs
    sortedTypes.forEach((typeId, i) => {
      const pos = { x: startX + i * 3.0, z: cz - 3 };
      this._addAsset(pos, {
        key: `mob_${typeId}`,
        name: ENEMY_TYPES[typeId].name,
        category: 'enemy_mob',
        displayMesh: buildEnemyDisplayMesh(typeId, false),
        stats: this._enemyStats(typeId, false),
      });
    });

    // Row 2: Captain variants
    sortedTypes.forEach((typeId, i) => {
      const type = ENEMY_TYPES[typeId];
      const pos = { x: startX + i * 3.0, z: cz };
      this._addAsset(pos, {
        key: `captain_${typeId}`,
        name: `${type.name} Captain`,
        category: 'enemy_captain',
        displayMesh: buildEnemyDisplayMesh(typeId, true),
        stats: this._enemyStats(typeId, true),
      });
    });

    // Row 3: Bosses for floors 1-5
    for (let floor = 1; floor <= 5; floor++) {
      const config = getFloorConfig(floor).boss;
      const pos = { x: startX - 1 + (floor - 1) * 3.0, z: cz + 3.5 };
      this._addAsset(pos, {
        key: `boss_floor${floor}`,
        name: config.name,
        category: 'enemy_boss',
        displayMesh: buildBossDisplayMesh(config),
        stats: this._bossStats(config, floor),
      });
    }

    // Row 4: Bosses for floors 6-10
    for (let floor = 6; floor <= 10; floor++) {
      const config = getFloorConfig(floor).boss;
      const pos = { x: startX - 1 + (floor - 6) * 3.0, z: cz + 7 };
      this._addAsset(pos, {
        key: `boss_floor${floor}`,
        name: config.name,
        category: 'enemy_boss',
        displayMesh: buildBossDisplayMesh(config),
        stats: this._bossStats(config, floor),
      });
    }
  }

  // -------------------------------------------------------------------------
  // Items wing (south, third branch)
  // -------------------------------------------------------------------------

  private _addItemsSection(): void {
    const branch = ROOM_BRANCHES[4]; // Items
    const { cx, cz } = this._getRoomCenter(branch);
    const startX = cx - branch.roomWidth / 2 + 3;

    // Weapon categories sorted alphabetically
    const weaponCategories = ['axe', 'dagger', 'mace', 'spear', 'sword'];
    const rarities: ItemRarity[] = ['common', 'uncommon', 'rare', 'epic'];

    // Weapons: 5 types × 4 rarities, laid out as rows=rarity, cols=category
    weaponCategories.forEach((cat, ci) => {
      rarities.forEach((rarity, ri) => {
        const pos = { x: startX + ci * 2.5, z: cz - 3 + ri * 3.0 };
        this._addAsset(pos, {
          key: `weapon_${cat}_${rarity}`,
          name: `${this._capitalize(rarity)} ${this._capitalize(cat)}`,
          category: 'item_weapon',
          displayMesh: buildWeaponDisplayMesh(cat, rarity),
          stats: this._weaponStats(cat, rarity),
        });
      });
    });

    // Armor: 4 rarities, single column
    rarities.forEach((rarity, ri) => {
      const pos = { x: startX + 13, z: cz - 3 + ri * 3.0 };
      this._addAsset(pos, {
        key: `armor_${rarity}`,
        name: `${this._capitalize(rarity)} Armor`,
        category: 'item_armor',
        displayMesh: buildArmorDisplayMesh(rarity),
        stats: this._armorStats(rarity),
      });
    });

    // Rings: 4 rarities, single column
    rarities.forEach((rarity, ri) => {
      const pos = { x: startX + 15, z: cz - 3 + ri * 3.0 };
      this._addAsset(pos, {
        key: `ring_${rarity}`,
        name: `${this._capitalize(rarity)} Ring`,
        category: 'item_ring',
        displayMesh: buildRingDisplayMesh(rarity),
        stats: this._ringStats(rarity),
      });
    });

    // Potions: 4 types, single row at the back of the room
    const potionDefs: Array<{ effect: ConsumeEffect; name: string }> = [
      { effect: 'heal', name: 'Health Potion' },
      { effect: 'manaShield', name: 'Shield Draught' },
      { effect: 'speedBoost', name: 'Speed Elixir' },
      { effect: 'strengthBoost', name: 'Might Tonic' },
    ];
    potionDefs.forEach((p, i) => {
      const pos = { x: startX + 1 + i * 3.0, z: cz + 6 };
      this._addAsset(pos, {
        key: `potion_${p.effect}`,
        name: p.name,
        category: 'item_potion',
        displayMesh: buildPotionDisplayMesh(p.effect),
        stats: this._potionStats(p.effect, p.name),
      });
    });
  }

  // -------------------------------------------------------------------------
  // Structure wing (north, third branch)
  // -------------------------------------------------------------------------

  private _addStructureSection(): void {
    const branch = ROOM_BRANCHES[5]; // Dungeon Structures
    const { cx, cz } = this._getRoomCenter(branch);
    const startX = cx - branch.roomWidth / 2 + 3;

    // 10 floor themes × 3 tile types, split into two groups
    const tileTypes: Array<'floor' | 'wall' | 'door'> = ['floor', 'wall', 'door'];

    for (let floorNum = 1; floorNum <= 10; floorNum++) {
      const config = getFloorConfig(floorNum);
      const theme = config.theme;
      const group = floorNum <= 5 ? 0 : 1;
      const indexInGroup = group === 0 ? floorNum - 1 : floorNum - 6;
      const colX = startX + indexInGroup * 3;
      const zBase = group === 0 ? cz - 5 : cz + 3;

      tileTypes.forEach((tileType, ti) => {
        const tileZ = zBase + ti * 3;
        this._addAsset(
          { x: colX, z: tileZ },
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

    // Obstacle displays — 5 obstacle types
    const obstacleDefs: Array<{
      type: ObstacleType;
      name: string;
      effect: string;
      value: string;
      color: number;
      flavorText: string;
    }> = [
      {
        type: ObstacleType.Furniture,
        name: 'Furniture',
        effect: 'Blocks movement',
        value: 'Impassable',
        color: 0x8b6914,
        flavorText: 'Solid crates and barrels that block all movement. Plan your path around them.',
      },
      {
        type: ObstacleType.Water,
        name: 'Water',
        effect: 'Weakens attacks',
        value: '0.5\u00d7 damage',
        color: 0x2266cc,
        flavorText:
          'Shallow pools that dampen the force of all attacks made while standing in them.',
      },
      {
        type: ObstacleType.Mud,
        name: 'Mud',
        effect: 'Slows movement',
        value: '0.45\u00d7 speed',
        color: 0x665533,
        flavorText: 'Thick mire that drastically slows anyone trudging through it.',
      },
      {
        type: ObstacleType.Fire,
        name: 'Fire',
        effect: 'Burns on contact',
        value: '12 DPS',
        color: 0xff4400,
        flavorText: 'Raging flames that continuously burn anyone standing in them.',
      },
      {
        type: ObstacleType.Trap,
        name: 'Trap',
        effect: 'Explodes on contact',
        value: '40 damage (one-time)',
        color: 0xccaa22,
        flavorText: 'A concealed pressure plate that detonates once when first stepped on.',
      },
    ];

    obstacleDefs.forEach((def, i) => {
      const pos = { x: startX + i * 3, z: cz + 10 };
      this._addAsset(pos, {
        key: `obstacle_${def.type}`,
        name: def.name,
        category: 'obstacle',
        displayMesh: buildObstacleDisplayMesh(def.type),
        stats: {
          rows: [
            { label: 'Type', value: def.name },
            { label: 'Effect', value: def.effect },
            { label: 'Value', value: def.value },
            { label: 'Appears on', value: 'Floors 6-10' },
          ],
          accentColor: toHex(def.color),
          flavorText: def.flavorText,
        },
      });
    });
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

    // Register collision AABB so the player cannot walk through display items
    this.wallAABBs.push({
      minX: pos.x - PEDESTAL_COLLISION_HALF,
      maxX: pos.x + PEDESTAL_COLLISION_HALF,
      minZ: pos.z - PEDESTAL_COLLISION_HALF,
      maxZ: pos.z + PEDESTAL_COLLISION_HALF,
    });
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

    // Track AABB for collision
    this.wallAABBs.push({
      minX: cx - width / 2,
      maxX: cx + width / 2,
      minZ: cz - depth / 2,
      maxZ: cz + depth / 2,
    });
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
        {
          label: 'Size Scale',
          value:
            `${type.bodyScale.toFixed(2)}× ${isCaptain ? `(×${CAPTAIN_SCALE} captain)` : ''}`.trim(),
        },
      ],
      accentColor: toHex(type.color),
      flavorText: isCaptain
        ? `An elite ${type.name.toLowerCase()} — tougher and more dangerous than the common variant.`
        : undefined,
    };
  }

  private _bossStats(
    config: import('../dungeon/FloorConfig').BossConfig,
    floorNum: number,
  ): LibraryAssetStats {
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
      case 'sword':
        if (rarity !== 'common')
          details.push(`+${Math.round((1 + floor * 0.5) * (mult - 0.5))} strength`);
        break;
      case 'axe':
        details[0] = `+${Math.round(flatDmg * 1.15)} damage`;
        if (rarity !== 'common') details.push(`+${(0.01 * mult * 100).toFixed(1)}% crit`);
        break;
      case 'mace':
        if (rarity !== 'common')
          details.push(`+${Math.round((1 + floor * 0.3) * (mult - 0.5))} defense`);
        break;
      case 'dagger':
        details[0] = `+${Math.round(flatDmg * 0.85)} damage`;
        details.push(`+${(0.03 * mult * 100).toFixed(0)}% atk speed`);
        if (rarity !== 'common') details.push(`+${(0.02 * mult * 100).toFixed(1)}% crit`);
        break;
      case 'spear':
        if (rarity !== 'common')
          details.push(`+${Math.round((2 + floor * 0.4) * (mult - 0.5))} strength`);
        break;
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
    if (rarity !== 'common')
      rows.push({ label: 'Vitality', value: `+${Math.round((1 + floor * 0.3) * (mult - 0.5))}` });
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
    if (rarity !== 'common')
      rows.push({ label: 'Crit Chance', value: `+${(0.01 * mult * 100).toFixed(1)}%` });
    if (rarity === 'rare' || rarity === 'epic')
      rows.push({ label: 'Move Speed', value: `+${(0.03 * mult * 100).toFixed(0)}%` });
    return {
      rows,
      accentColor: rarityColor(rarity),
      flavorText: this._rarityFlavor(rarity),
    };
  }

  private _potionStats(effect: ConsumeEffect, name: string): LibraryAssetStats {
    const floor = 3;
    const infoMap: Record<
      ConsumeEffect,
      { effect: string; value: string; duration: string; rarity: string }
    > = {
      heal: {
        effect: 'Restore health',
        value: `${30 + floor * 10} HP`,
        duration: 'Instant',
        rarity: 'Common',
      },
      manaShield: {
        effect: 'Absorb incoming damage',
        value: `${40 + floor * 8} shield HP`,
        duration: '20s',
        rarity: 'Rare',
      },
      speedBoost: {
        effect: 'Increase move speed',
        value: '+50% speed',
        duration: '10s',
        rarity: 'Uncommon',
      },
      strengthBoost: {
        effect: 'Increase attack damage',
        value: `+${10 + floor * 3} flat dmg`,
        duration: '15s',
        rarity: 'Uncommon',
      },
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

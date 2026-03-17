// World / voxel
export const TILE_SIZE = 1;
export const WALL_HEIGHT = 2;

// Hub dimensions (in tiles)
export const HUB_WIDTH = 15;
export const HUB_DEPTH = 15;

// Player
export const PLAYER_SPEED = 5; // tiles per second
export const PLAYER_SIZE = 0.6;
export const PLAYER_HEIGHT = 1.0;

// Per-model scale multipliers applied on top of the base GLB normalization.
// These make GLB models bigger (they default to fitting within PLAYER_SIZE/PLAYER_HEIGHT).
export const MODEL_SCALE_OWL = 1.5;
export const MODEL_SCALE_OWLBEAR = 2.5;
export const MODEL_SCALE_DEFAULT = 2.0; // default for any GLB model not listed above

// Camera
export const CAMERA_DISTANCE = 14;
export const CAMERA_ANGLE = Math.PI / 4; // 45° elevation
export const CAMERA_ROTATION = Math.PI / 4; // 45° isometric rotation

// Combat
export const PLAYER_MAX_HP = 100;
export const PLAYER_ATTACK_DAMAGE = 20;
export const PLAYER_ATTACK_RANGE = 1.2;
export const PLAYER_ATTACK_ARC = Math.PI / 2; // 90° swing arc
export const PLAYER_ATTACK_COOLDOWN = 0.4; // seconds between attacks
export const PLAYER_INVINCIBILITY_TIME = 0.5; // seconds of i-frames after hit
export const KNOCKBACK_FORCE = 2.0;
export const KNOCKBACK_CHANCE = 0.35;

// Resting health regeneration
export const RESTING_IDLE_TIME = 15; // seconds without movement to start resting
export const RESTING_COMBAT_COOLDOWN = 15; // seconds out of combat to start resting
export const RESTING_REGEN_RATE = 4; // HP per second while resting

export const ENEMY_HP = 80;
export const ENEMY_SPEED = 2.0;
export const ENEMY_ATTACK_DAMAGE = 20;
export const ENEMY_ATTACK_RANGE = 1.0;
export const ENEMY_ATTACK_COOLDOWN = 1.0;
export const ENEMY_CHASE_RANGE = 8;
export const ENEMY_PATROL_RANGE = 3;
export const ENEMY_SIZE = 0.5;
export const ENEMY_HEIGHT = 0.8;

// Enemy type definitions
export type EnemyTypeId = 'grunt' | 'brute' | 'archer' | 'mage' | 'assassin';

export interface EnemyTypeConfig {
  id: EnemyTypeId;
  name: string;
  color: number;
  bodyScale: number;
  heightScale: number;
  hpMult: number;
  dmgMult: number;
  speedMult: number;
  attackRange: number;
  attackCooldown: number;
}

export const ENEMY_TYPES: Record<EnemyTypeId, EnemyTypeConfig> = {
  grunt: {
    id: 'grunt',
    name: 'Grunt',
    color: 0xcc3333,
    bodyScale: 1.0,
    heightScale: 1.0,
    hpMult: 1.0,
    dmgMult: 1.0,
    speedMult: 1.0,
    attackRange: 1.0,
    attackCooldown: 1.0,
  },
  brute: {
    id: 'brute',
    name: 'Brute',
    color: 0x884422,
    bodyScale: 1.4,
    heightScale: 1.3,
    hpMult: 2.0,
    dmgMult: 1.5,
    speedMult: 0.7,
    attackRange: 1.2,
    attackCooldown: 1.5,
  },
  archer: {
    id: 'archer',
    name: 'Archer',
    color: 0x44aa44,
    bodyScale: 0.85,
    heightScale: 1.1,
    hpMult: 0.7,
    dmgMult: 1.2,
    speedMult: 1.1,
    attackRange: 5.0,
    attackCooldown: 1.8,
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    color: 0x6644cc,
    bodyScale: 0.9,
    heightScale: 1.0,
    hpMult: 0.6,
    dmgMult: 1.8,
    speedMult: 0.9,
    attackRange: 4.0,
    attackCooldown: 2.0,
  },
  assassin: {
    id: 'assassin',
    name: 'Assassin',
    color: 0x222222,
    bodyScale: 0.8,
    heightScale: 0.9,
    hpMult: 0.8,
    dmgMult: 2.0,
    speedMult: 1.5,
    attackRange: 1.0,
    attackCooldown: 0.7,
  },
};

// Captain variants
export const CAPTAIN_SCALE = 1.3;
export const CAPTAIN_HP_MULT = 1.5;
export const CAPTAIN_DMG_MULT = 1.3;

// Colors (voxel palette)
export const COLORS = {
  floor: 0x4a4a5a,
  wall: 0x6a6a7a,
  wallTop: 0x7a7a8a,
  player: 0x3a9bdc,
  portal: 0xaa44ff,
  portalGlow: 0xdd88ff,
  ambient: 0x404060,
  directional: 0xffeedd,
  hub_floor: 0x5a5a4a,
  hub_accent: 0x8b7355,
  enemy: 0xcc3333,
  enemyHit: 0xff6666,
  healthBar: 0x44cc44,
  healthBarBg: 0x333333,
  healthBarDamage: 0xcc4444,
} as const;

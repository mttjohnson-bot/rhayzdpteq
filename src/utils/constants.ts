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

export const ENEMY_HP = 40;
export const ENEMY_SPEED = 2.0;
export const ENEMY_ATTACK_DAMAGE = 10;
export const ENEMY_ATTACK_RANGE = 1.0;
export const ENEMY_ATTACK_COOLDOWN = 1.0;
export const ENEMY_CHASE_RANGE = 8;
export const ENEMY_PATROL_RANGE = 3;
export const ENEMY_SIZE = 0.5;
export const ENEMY_HEIGHT = 0.8;

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

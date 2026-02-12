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
} as const;

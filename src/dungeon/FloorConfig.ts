/**
 * Floor-specific configurations for the 5 dungeon floors.
 *
 * Each floor has a distinct visual theme (colors), difficulty scaling,
 * room layout parameters, boss definition, and available enemy types.
 */

import { EnemyTypeId } from '../utils/constants';

export interface FloorTheme {
  name: string;
  floorColor: number;
  wallColor: number;
  wallTopColor: number;
  doorColor: number;
  fogColor: number;
  ambientColor: number;
  lightColor: number;
  lightIntensity: number;
}

export interface FloorDifficulty {
  enemyHpScale: number;
  enemyDmgScale: number;
  enemySpeedScale: number;
  enemyCountMin: number;
  enemyCountExtra: number;
  roomCountBase: number;
  gridSize: number;
  minRoomSize: number;
  maxRoomSize: number;
  corridorWidth: number;
  bossRoomSize: number;
  enemyTypes: EnemyTypeId[];
  captainChance: number;  // chance a mob group has a captain
}

export interface BossConfig {
  name: string;
  color: number;
  scale: number;
  hpMultiplier: number;
  dmgMultiplier: number;
  speed: number;
  attackCooldown: number;
  abilities: BossAbility[];
}

export type BossAbility = 'charge' | 'slam' | 'summon' | 'enrage' | 'teleport';

export interface FloorConfig {
  floor: number;
  theme: FloorTheme;
  difficulty: FloorDifficulty;
  boss: BossConfig;
}

const FLOOR_CONFIGS: FloorConfig[] = [
  // Floor 1: Stone Crypt - easy introduction
  {
    floor: 1,
    theme: {
      name: 'Stone Crypt',
      floorColor: 0x4a4a5a,
      wallColor: 0x6a6a7a,
      wallTopColor: 0x7a7a8a,
      doorColor: 0x6a5a4a,
      fogColor: 0x1a1a2a,
      ambientColor: 0x404060,
      lightColor: 0xffeedd,
      lightIntensity: 1.0,
    },
    difficulty: {
      enemyHpScale: 1.0,
      enemyDmgScale: 1.0,
      enemySpeedScale: 1.0,
      enemyCountMin: 2,
      enemyCountExtra: 2,
      roomCountBase: 40,
      gridSize: 160,
      minRoomSize: 6,
      maxRoomSize: 12,
      corridorWidth: 3,
      bossRoomSize: 16,
      enemyTypes: ['grunt', 'grunt', 'brute'],
      captainChance: 0.15,
    },
    boss: {
      name: 'Crypt Guardian',
      color: 0x8844aa,
      scale: 2.2,
      hpMultiplier: 6,
      dmgMultiplier: 1.5,
      speed: 1.8,
      attackCooldown: 1.2,
      abilities: ['charge'],
    },
  },

  // Floor 2: Mossy Caverns - slightly harder, green tones
  {
    floor: 2,
    theme: {
      name: 'Mossy Caverns',
      floorColor: 0x3a4a3a,
      wallColor: 0x4a5a4a,
      wallTopColor: 0x5a6a5a,
      doorColor: 0x5a5a3a,
      fogColor: 0x152015,
      ambientColor: 0x305030,
      lightColor: 0xcceecc,
      lightIntensity: 0.9,
    },
    difficulty: {
      enemyHpScale: 1.3,
      enemyDmgScale: 1.2,
      enemySpeedScale: 1.05,
      enemyCountMin: 2,
      enemyCountExtra: 3,
      roomCountBase: 48,
      gridSize: 180,
      minRoomSize: 6,
      maxRoomSize: 14,
      corridorWidth: 3,
      bossRoomSize: 18,
      enemyTypes: ['grunt', 'brute', 'archer'],
      captainChance: 0.2,
    },
    boss: {
      name: 'Fungal Brute',
      color: 0x44aa44,
      scale: 2.4,
      hpMultiplier: 7,
      dmgMultiplier: 1.6,
      speed: 1.5,
      attackCooldown: 1.0,
      abilities: ['slam', 'summon'],
    },
  },

  // Floor 3: Lava Forge - orange/red, higher damage
  {
    floor: 3,
    theme: {
      name: 'Lava Forge',
      floorColor: 0x5a3a2a,
      wallColor: 0x6a4a3a,
      wallTopColor: 0x7a5a4a,
      doorColor: 0x6a4a2a,
      fogColor: 0x2a1510,
      ambientColor: 0x603020,
      lightColor: 0xffaa66,
      lightIntensity: 1.1,
    },
    difficulty: {
      enemyHpScale: 1.6,
      enemyDmgScale: 1.4,
      enemySpeedScale: 1.1,
      enemyCountMin: 3,
      enemyCountExtra: 3,
      roomCountBase: 56,
      gridSize: 200,
      minRoomSize: 7,
      maxRoomSize: 14,
      corridorWidth: 4,
      bossRoomSize: 20,
      enemyTypes: ['grunt', 'brute', 'archer', 'mage'],
      captainChance: 0.25,
    },
    boss: {
      name: 'Forge Titan',
      color: 0xcc6622,
      scale: 2.6,
      hpMultiplier: 8,
      dmgMultiplier: 1.8,
      speed: 2.0,
      attackCooldown: 0.9,
      abilities: ['charge', 'slam'],
    },
  },

  // Floor 4: Frozen Depths - blue/ice theme, fast enemies
  {
    floor: 4,
    theme: {
      name: 'Frozen Depths',
      floorColor: 0x3a4a5a,
      wallColor: 0x5a6a7a,
      wallTopColor: 0x7a8a9a,
      doorColor: 0x4a5a6a,
      fogColor: 0x101a2a,
      ambientColor: 0x304060,
      lightColor: 0xaaccff,
      lightIntensity: 1.0,
    },
    difficulty: {
      enemyHpScale: 2.0,
      enemyDmgScale: 1.6,
      enemySpeedScale: 1.2,
      enemyCountMin: 3,
      enemyCountExtra: 4,
      roomCountBase: 64,
      gridSize: 220,
      minRoomSize: 7,
      maxRoomSize: 15,
      corridorWidth: 4,
      bossRoomSize: 22,
      enemyTypes: ['grunt', 'brute', 'archer', 'mage', 'assassin'],
      captainChance: 0.3,
    },
    boss: {
      name: 'Frost Wyrm',
      color: 0x4488cc,
      scale: 2.8,
      hpMultiplier: 9,
      dmgMultiplier: 2.0,
      speed: 2.5,
      attackCooldown: 0.8,
      abilities: ['charge', 'teleport', 'enrage'],
    },
  },

  // Floor 5: Shadow Sanctum - dark purple, the hardest floor
  {
    floor: 5,
    theme: {
      name: 'Shadow Sanctum',
      floorColor: 0x2a2a3a,
      wallColor: 0x3a3a4a,
      wallTopColor: 0x4a4a5a,
      doorColor: 0x3a2a4a,
      fogColor: 0x0a0a15,
      ambientColor: 0x201030,
      lightColor: 0xcc88ff,
      lightIntensity: 0.8,
    },
    difficulty: {
      enemyHpScale: 2.5,
      enemyDmgScale: 2.0,
      enemySpeedScale: 1.3,
      enemyCountMin: 3,
      enemyCountExtra: 4,
      roomCountBase: 72,
      gridSize: 240,
      minRoomSize: 8,
      maxRoomSize: 16,
      corridorWidth: 4,
      bossRoomSize: 24,
      enemyTypes: ['grunt', 'brute', 'archer', 'mage', 'assassin'],
      captainChance: 0.35,
    },
    boss: {
      name: 'Shadow Lord',
      color: 0x6622aa,
      scale: 3.0,
      hpMultiplier: 12,
      dmgMultiplier: 2.5,
      speed: 2.2,
      attackCooldown: 0.7,
      abilities: ['charge', 'slam', 'summon', 'teleport', 'enrage'],
    },
  },
];

export function getFloorConfig(floor: number): FloorConfig {
  const idx = Math.min(floor - 1, FLOOR_CONFIGS.length - 1);
  return FLOOR_CONFIGS[Math.max(0, idx)];
}

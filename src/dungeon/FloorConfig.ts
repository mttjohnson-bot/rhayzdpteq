/**
 * Floor-specific configurations for the 10 dungeon floors.
 *
 * Each floor has a distinct visual theme (colors), difficulty scaling,
 * room layout parameters, boss definition, available enemy types,
 * and (for floors 6+) obstacle configurations.
 */

import { EnemyTypeId } from '../utils/constants';
import { ObstacleType } from './types';

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
  captainChance: number; // chance a mob group has a captain
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

export type BossAbility = 'charge' | 'slam' | 'summon' | 'enrage' | 'teleport' | 'invisibility';

export interface ObstacleConfig {
  types: ObstacleType[]; // available obstacle types for this floor
  roomChance: number; // probability each room gets obstacles (0-1)
  minCount: number; // minimum obstacles per room
  maxCount: number; // maximum obstacles per room
}

export interface FloorConfig {
  floor: number;
  theme: FloorTheme;
  difficulty: FloorDifficulty;
  boss: BossConfig;
  obstacleConfig?: ObstacleConfig;
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
      hpMultiplier: 24,
      dmgMultiplier: 6.0,
      speed: 2.4,
      attackCooldown: 0.8,
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
      hpMultiplier: 28,
      dmgMultiplier: 6.4,
      speed: 2.0,
      attackCooldown: 0.7,
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
      hpMultiplier: 32,
      dmgMultiplier: 7.2,
      speed: 2.6,
      attackCooldown: 0.6,
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
      hpMultiplier: 36,
      dmgMultiplier: 8.0,
      speed: 3.2,
      attackCooldown: 0.55,
      abilities: ['charge', 'teleport', 'enrage'],
    },
  },

  // Floor 5: Shadow Sanctum - dark purple, the hardest of the first 5
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
      hpMultiplier: 48,
      dmgMultiplier: 10.0,
      speed: 2.9,
      attackCooldown: 0.45,
      abilities: ['charge', 'slam', 'summon', 'teleport', 'enrage', 'invisibility'],
    },
  },

  // ---- Floors 6-10: Harder floors with environmental obstacles ----

  // Floor 6: Toxic Sewers - green/brown, introduces mud and water obstacles
  {
    floor: 6,
    theme: {
      name: 'Toxic Sewers',
      floorColor: 0x3a3a2a,
      wallColor: 0x4a4a3a,
      wallTopColor: 0x5a5a4a,
      doorColor: 0x4a3a2a,
      fogColor: 0x101a10,
      ambientColor: 0x304020,
      lightColor: 0xaacc88,
      lightIntensity: 0.75,
    },
    difficulty: {
      enemyHpScale: 3.0,
      enemyDmgScale: 2.2,
      enemySpeedScale: 1.35,
      enemyCountMin: 3,
      enemyCountExtra: 5,
      roomCountBase: 76,
      gridSize: 250,
      minRoomSize: 7,
      maxRoomSize: 16,
      corridorWidth: 4,
      bossRoomSize: 24,
      enemyTypes: ['grunt', 'brute', 'archer', 'mage', 'assassin'],
      captainChance: 0.4,
    },
    boss: {
      name: 'Sewer Abomination',
      color: 0x448822,
      scale: 3.0,
      hpMultiplier: 56,
      dmgMultiplier: 11.2,
      speed: 2.6,
      attackCooldown: 0.45,
      abilities: ['slam', 'summon', 'enrage'],
    },
    obstacleConfig: {
      types: [ObstacleType.Mud, ObstacleType.Water, ObstacleType.Furniture],
      roomChance: 0.4,
      minCount: 2,
      maxCount: 5,
    },
  },

  // Floor 7: Infernal Pit - dark red/orange, fire and trap hazards
  {
    floor: 7,
    theme: {
      name: 'Infernal Pit',
      floorColor: 0x4a2020,
      wallColor: 0x5a2a2a,
      wallTopColor: 0x6a3a3a,
      doorColor: 0x5a3020,
      fogColor: 0x200a0a,
      ambientColor: 0x502010,
      lightColor: 0xff6633,
      lightIntensity: 1.2,
    },
    difficulty: {
      enemyHpScale: 3.5,
      enemyDmgScale: 2.5,
      enemySpeedScale: 1.4,
      enemyCountMin: 4,
      enemyCountExtra: 5,
      roomCountBase: 80,
      gridSize: 260,
      minRoomSize: 7,
      maxRoomSize: 17,
      corridorWidth: 4,
      bossRoomSize: 26,
      enemyTypes: ['grunt', 'brute', 'archer', 'mage', 'assassin'],
      captainChance: 0.45,
    },
    boss: {
      name: 'Inferno Demon',
      color: 0xcc3300,
      scale: 3.2,
      hpMultiplier: 64,
      dmgMultiplier: 12.0,
      speed: 3.4,
      attackCooldown: 0.4,
      abilities: ['charge', 'slam', 'teleport', 'enrage'],
    },
    obstacleConfig: {
      types: [ObstacleType.Fire, ObstacleType.Trap, ObstacleType.Furniture],
      roomChance: 0.5,
      minCount: 3,
      maxCount: 6,
    },
  },

  // Floor 8: Crystal Mines - teal/cyan, furniture-heavy with traps
  {
    floor: 8,
    theme: {
      name: 'Crystal Mines',
      floorColor: 0x2a3a3a,
      wallColor: 0x3a5a5a,
      wallTopColor: 0x4a6a6a,
      doorColor: 0x3a4a4a,
      fogColor: 0x0a1515,
      ambientColor: 0x204040,
      lightColor: 0x88eeff,
      lightIntensity: 0.9,
    },
    difficulty: {
      enemyHpScale: 4.0,
      enemyDmgScale: 2.8,
      enemySpeedScale: 1.45,
      enemyCountMin: 4,
      enemyCountExtra: 5,
      roomCountBase: 84,
      gridSize: 270,
      minRoomSize: 8,
      maxRoomSize: 17,
      corridorWidth: 4,
      bossRoomSize: 26,
      enemyTypes: ['grunt', 'brute', 'archer', 'mage', 'assassin'],
      captainChance: 0.5,
    },
    boss: {
      name: 'Crystal Golem',
      color: 0x44aacc,
      scale: 3.4,
      hpMultiplier: 72,
      dmgMultiplier: 12.8,
      speed: 2.4,
      attackCooldown: 0.4,
      abilities: ['charge', 'slam', 'summon', 'enrage'],
    },
    obstacleConfig: {
      types: [ObstacleType.Furniture, ObstacleType.Trap, ObstacleType.Mud, ObstacleType.Water],
      roomChance: 0.55,
      minCount: 3,
      maxCount: 7,
    },
  },

  // Floor 9: Blood Citadel - deep crimson, all obstacle types
  {
    floor: 9,
    theme: {
      name: 'Blood Citadel',
      floorColor: 0x3a1a1a,
      wallColor: 0x4a2222,
      wallTopColor: 0x5a3030,
      doorColor: 0x4a1a2a,
      fogColor: 0x150505,
      ambientColor: 0x401010,
      lightColor: 0xff4444,
      lightIntensity: 0.85,
    },
    difficulty: {
      enemyHpScale: 4.5,
      enemyDmgScale: 3.2,
      enemySpeedScale: 1.5,
      enemyCountMin: 4,
      enemyCountExtra: 6,
      roomCountBase: 88,
      gridSize: 280,
      minRoomSize: 8,
      maxRoomSize: 18,
      corridorWidth: 4,
      bossRoomSize: 28,
      enemyTypes: ['brute', 'archer', 'mage', 'assassin', 'assassin'],
      captainChance: 0.55,
    },
    boss: {
      name: 'Blood Tyrant',
      color: 0xaa1122,
      scale: 3.6,
      hpMultiplier: 80,
      dmgMultiplier: 14.0,
      speed: 3.1,
      attackCooldown: 0.35,
      abilities: ['charge', 'slam', 'summon', 'teleport', 'enrage'],
    },
    obstacleConfig: {
      types: [
        ObstacleType.Fire,
        ObstacleType.Trap,
        ObstacleType.Mud,
        ObstacleType.Water,
        ObstacleType.Furniture,
      ],
      roomChance: 0.6,
      minCount: 4,
      maxCount: 8,
    },
  },

  // Floor 10: The Abyss - pitch black/dark violet, maximum danger
  {
    floor: 10,
    theme: {
      name: 'The Abyss',
      floorColor: 0x151015,
      wallColor: 0x201520,
      wallTopColor: 0x2a1f2a,
      doorColor: 0x1a101a,
      fogColor: 0x050208,
      ambientColor: 0x100818,
      lightColor: 0x8844cc,
      lightIntensity: 0.6,
    },
    difficulty: {
      enemyHpScale: 5.0,
      enemyDmgScale: 3.5,
      enemySpeedScale: 1.55,
      enemyCountMin: 5,
      enemyCountExtra: 6,
      roomCountBase: 96,
      gridSize: 300,
      minRoomSize: 8,
      maxRoomSize: 18,
      corridorWidth: 5,
      bossRoomSize: 30,
      enemyTypes: ['brute', 'mage', 'assassin', 'assassin', 'assassin'],
      captainChance: 0.6,
    },
    boss: {
      name: 'Abyssal Overlord',
      color: 0x440066,
      scale: 4.0,
      hpMultiplier: 100,
      dmgMultiplier: 16.0,
      speed: 3.6,
      attackCooldown: 0.3,
      abilities: ['charge', 'slam', 'summon', 'teleport', 'enrage'],
    },
    obstacleConfig: {
      types: [
        ObstacleType.Fire,
        ObstacleType.Trap,
        ObstacleType.Mud,
        ObstacleType.Water,
        ObstacleType.Furniture,
      ],
      roomChance: 0.7,
      minCount: 5,
      maxCount: 10,
    },
  },
];

/** Total number of dungeon floors, derived from the config array. */
export const TOTAL_FLOORS = FLOOR_CONFIGS.length;

export function getFloorConfig(floor: number): FloorConfig {
  const idx = Math.min(floor - 1, FLOOR_CONFIGS.length - 1);
  return FLOOR_CONFIGS[Math.max(0, idx)];
}

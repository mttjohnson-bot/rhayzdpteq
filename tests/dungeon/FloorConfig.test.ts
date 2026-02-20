import { describe, it, expect } from 'vitest';
import { getFloorConfig, TOTAL_FLOORS } from '../../src/dungeon/FloorConfig';
import { ENEMY_TYPES } from '../../src/utils/constants';
import type { EnemyTypeId } from '../../src/utils/constants';

describe('FloorConfig', () => {
  describe('TOTAL_FLOORS', () => {
    it('is 10', () => {
      expect(TOTAL_FLOORS).toBe(10);
    });
  });

  describe('all floors have required fields', () => {
    for (let floor = 1; floor <= 10; floor++) {
      describe(`floor ${floor}`, () => {
        const config = getFloorConfig(floor);

        it('has correct floor number', () => {
          expect(config.floor).toBe(floor);
        });

        it('has a theme with required properties', () => {
          expect(config.theme).toBeDefined();
          expect(config.theme.name).toBeTruthy();
          expect(typeof config.theme.floorColor).toBe('number');
          expect(typeof config.theme.wallColor).toBe('number');
          expect(typeof config.theme.wallTopColor).toBe('number');
          expect(typeof config.theme.doorColor).toBe('number');
          expect(typeof config.theme.fogColor).toBe('number');
          expect(typeof config.theme.ambientColor).toBe('number');
          expect(typeof config.theme.lightColor).toBe('number');
          expect(config.theme.lightIntensity).toBeGreaterThan(0);
        });

        it('has a difficulty config with valid ranges', () => {
          const diff = config.difficulty;
          expect(diff.enemyHpScale).toBeGreaterThan(0);
          expect(diff.enemyDmgScale).toBeGreaterThan(0);
          expect(diff.enemySpeedScale).toBeGreaterThan(0);
          expect(diff.enemyCountMin).toBeGreaterThanOrEqual(1);
          expect(diff.enemyCountExtra).toBeGreaterThanOrEqual(0);
          expect(diff.roomCountBase).toBeGreaterThan(0);
          expect(diff.gridSize).toBeGreaterThan(0);
          expect(diff.minRoomSize).toBeGreaterThan(0);
          expect(diff.maxRoomSize).toBeGreaterThanOrEqual(diff.minRoomSize);
          expect(diff.corridorWidth).toBeGreaterThan(0);
          expect(diff.bossRoomSize).toBeGreaterThan(0);
          expect(diff.captainChance).toBeGreaterThanOrEqual(0);
          expect(diff.captainChance).toBeLessThanOrEqual(1);
        });

        it('has a boss config', () => {
          expect(config.boss).toBeDefined();
          expect(config.boss.name).toBeTruthy();
          expect(typeof config.boss.color).toBe('number');
          expect(config.boss.scale).toBeGreaterThan(0);
          expect(config.boss.hpMultiplier).toBeGreaterThan(0);
          expect(config.boss.dmgMultiplier).toBeGreaterThan(0);
          expect(config.boss.speed).toBeGreaterThan(0);
          expect(config.boss.attackCooldown).toBeGreaterThan(0);
          expect(config.boss.abilities.length).toBeGreaterThan(0);
        });

        it('enemy types reference valid IDs', () => {
          const validTypes = Object.keys(ENEMY_TYPES) as EnemyTypeId[];
          for (const type of config.difficulty.enemyTypes) {
            expect(validTypes).toContain(type);
          }
        });
      });
    }
  });

  describe('theme colors are valid hex', () => {
    for (let floor = 1; floor <= 10; floor++) {
      it(`floor ${floor} theme colors are valid`, () => {
        const config = getFloorConfig(floor);
        const colorFields: (keyof typeof config.theme)[] = [
          'floorColor',
          'wallColor',
          'wallTopColor',
          'doorColor',
          'fogColor',
          'ambientColor',
          'lightColor',
        ];
        for (const field of colorFields) {
          const value = config.theme[field] as number;
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(0xffffff);
        }
      });
    }
  });

  describe('boss abilities are valid', () => {
    const validAbilities = ['charge', 'slam', 'summon', 'enrage', 'teleport', 'invisibility'];

    for (let floor = 1; floor <= 10; floor++) {
      it(`floor ${floor} boss abilities are valid`, () => {
        const config = getFloorConfig(floor);
        for (const ability of config.boss.abilities) {
          expect(validAbilities).toContain(ability);
        }
      });
    }
  });

  describe('getFloorConfig boundary handling', () => {
    it('clamps floor 0 to floor 1 config', () => {
      const config0 = getFloorConfig(0);
      const config1 = getFloorConfig(1);
      expect(config0.floor).toBe(config1.floor);
    });

    it('clamps floor > 10 to floor 10 config', () => {
      const config11 = getFloorConfig(11);
      const config10 = getFloorConfig(10);
      expect(config11.floor).toBe(config10.floor);
    });

    it('handles negative floor number', () => {
      const config = getFloorConfig(-1);
      expect(config.floor).toBe(1);
    });
  });

  describe('difficulty scaling', () => {
    it('enemy HP scale increases across floors', () => {
      for (let floor = 1; floor < 10; floor++) {
        const curr = getFloorConfig(floor);
        const next = getFloorConfig(floor + 1);
        expect(next.difficulty.enemyHpScale).toBeGreaterThanOrEqual(curr.difficulty.enemyHpScale);
      }
    });

    it('grid size increases across floors', () => {
      for (let floor = 1; floor < 10; floor++) {
        const curr = getFloorConfig(floor);
        const next = getFloorConfig(floor + 1);
        expect(next.difficulty.gridSize).toBeGreaterThanOrEqual(curr.difficulty.gridSize);
      }
    });
  });

  describe('obstacle configs', () => {
    it('floors 1-5 have no obstacle config', () => {
      for (let floor = 1; floor <= 5; floor++) {
        expect(getFloorConfig(floor).obstacleConfig).toBeUndefined();
      }
    });

    it('floors 6-10 have obstacle configs', () => {
      for (let floor = 6; floor <= 10; floor++) {
        const config = getFloorConfig(floor);
        expect(config.obstacleConfig).toBeDefined();
        expect(config.obstacleConfig!.types.length).toBeGreaterThan(0);
        expect(config.obstacleConfig!.roomChance).toBeGreaterThan(0);
        expect(config.obstacleConfig!.roomChance).toBeLessThanOrEqual(1);
        expect(config.obstacleConfig!.minCount).toBeGreaterThan(0);
        expect(config.obstacleConfig!.maxCount).toBeGreaterThanOrEqual(config.obstacleConfig!.minCount);
      }
    });
  });
});

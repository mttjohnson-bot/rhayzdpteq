import { describe, it, expect } from 'vitest';
import {
  TILE_SIZE,
  WALL_HEIGHT,
  HUB_WIDTH,
  HUB_DEPTH,
  PLAYER_SPEED,
  PLAYER_SIZE,
  PLAYER_HEIGHT,
  CAMERA_DISTANCE,
  CAMERA_ANGLE,
  CAMERA_ROTATION,
  PLAYER_MAX_HP,
  PLAYER_ATTACK_DAMAGE,
  PLAYER_ATTACK_RANGE,
  PLAYER_ATTACK_ARC,
  PLAYER_ATTACK_COOLDOWN,
  PLAYER_INVINCIBILITY_TIME,
  KNOCKBACK_FORCE,
  KNOCKBACK_CHANCE,
  ENEMY_HP,
  ENEMY_SPEED,
  ENEMY_ATTACK_DAMAGE,
  ENEMY_ATTACK_RANGE,
  ENEMY_ATTACK_COOLDOWN,
  ENEMY_CHASE_RANGE,
  ENEMY_PATROL_RANGE,
  ENEMY_SIZE,
  ENEMY_HEIGHT,
  ENEMY_TYPES,
  CAPTAIN_SCALE,
  CAPTAIN_HP_MULT,
  CAPTAIN_DMG_MULT,
  COLORS,
} from '../../src/utils/constants';
import type { EnemyTypeId } from '../../src/utils/constants';

describe('constants', () => {
  describe('world constants', () => {
    it('TILE_SIZE is a positive number', () => {
      expect(TILE_SIZE).toBeGreaterThan(0);
      expect(typeof TILE_SIZE).toBe('number');
    });

    it('WALL_HEIGHT is a positive number', () => {
      expect(WALL_HEIGHT).toBeGreaterThan(0);
    });

    it('HUB_WIDTH and HUB_DEPTH are positive', () => {
      expect(HUB_WIDTH).toBeGreaterThan(0);
      expect(HUB_DEPTH).toBeGreaterThan(0);
    });
  });

  describe('player constants', () => {
    it('PLAYER_SPEED is positive', () => {
      expect(PLAYER_SPEED).toBeGreaterThan(0);
    });

    it('PLAYER_SIZE is positive and less than TILE_SIZE', () => {
      expect(PLAYER_SIZE).toBeGreaterThan(0);
      expect(PLAYER_SIZE).toBeLessThanOrEqual(TILE_SIZE);
    });

    it('PLAYER_HEIGHT is positive', () => {
      expect(PLAYER_HEIGHT).toBeGreaterThan(0);
    });

    it('PLAYER_MAX_HP is a positive integer', () => {
      expect(PLAYER_MAX_HP).toBeGreaterThan(0);
      expect(Number.isInteger(PLAYER_MAX_HP)).toBe(true);
    });

    it('PLAYER_ATTACK_DAMAGE is positive', () => {
      expect(PLAYER_ATTACK_DAMAGE).toBeGreaterThan(0);
    });

    it('PLAYER_ATTACK_RANGE is positive', () => {
      expect(PLAYER_ATTACK_RANGE).toBeGreaterThan(0);
    });

    it('PLAYER_ATTACK_ARC is between 0 and 2*PI', () => {
      expect(PLAYER_ATTACK_ARC).toBeGreaterThan(0);
      expect(PLAYER_ATTACK_ARC).toBeLessThanOrEqual(Math.PI * 2);
    });

    it('PLAYER_ATTACK_COOLDOWN is positive', () => {
      expect(PLAYER_ATTACK_COOLDOWN).toBeGreaterThan(0);
    });

    it('PLAYER_INVINCIBILITY_TIME is positive', () => {
      expect(PLAYER_INVINCIBILITY_TIME).toBeGreaterThan(0);
    });
  });

  describe('combat constants', () => {
    it('KNOCKBACK_FORCE is positive', () => {
      expect(KNOCKBACK_FORCE).toBeGreaterThan(0);
    });

    it('KNOCKBACK_CHANCE is between 0 and 1', () => {
      expect(KNOCKBACK_CHANCE).toBeGreaterThanOrEqual(0);
      expect(KNOCKBACK_CHANCE).toBeLessThanOrEqual(1);
    });
  });

  describe('camera constants', () => {
    it('CAMERA_DISTANCE is positive', () => {
      expect(CAMERA_DISTANCE).toBeGreaterThan(0);
    });

    it('CAMERA_ANGLE is a valid radian angle', () => {
      expect(CAMERA_ANGLE).toBeGreaterThan(0);
      expect(CAMERA_ANGLE).toBeLessThan(Math.PI);
    });

    it('CAMERA_ROTATION is a valid radian angle', () => {
      expect(CAMERA_ROTATION).toBeGreaterThan(0);
      expect(CAMERA_ROTATION).toBeLessThan(Math.PI * 2);
    });
  });

  describe('enemy base constants', () => {
    it('ENEMY_HP is positive', () => {
      expect(ENEMY_HP).toBeGreaterThan(0);
    });

    it('ENEMY_SPEED is positive', () => {
      expect(ENEMY_SPEED).toBeGreaterThan(0);
    });

    it('ENEMY_ATTACK_DAMAGE is positive', () => {
      expect(ENEMY_ATTACK_DAMAGE).toBeGreaterThan(0);
    });

    it('ENEMY_ATTACK_RANGE is positive', () => {
      expect(ENEMY_ATTACK_RANGE).toBeGreaterThan(0);
    });

    it('ENEMY_ATTACK_COOLDOWN is positive', () => {
      expect(ENEMY_ATTACK_COOLDOWN).toBeGreaterThan(0);
    });

    it('ENEMY_CHASE_RANGE is greater than ENEMY_PATROL_RANGE', () => {
      expect(ENEMY_CHASE_RANGE).toBeGreaterThan(ENEMY_PATROL_RANGE);
    });

    it('ENEMY_SIZE and ENEMY_HEIGHT are positive', () => {
      expect(ENEMY_SIZE).toBeGreaterThan(0);
      expect(ENEMY_HEIGHT).toBeGreaterThan(0);
    });
  });

  describe('enemy types', () => {
    const expectedTypes: EnemyTypeId[] = ['grunt', 'brute', 'archer', 'mage', 'assassin'];

    it('has all expected enemy types', () => {
      for (const type of expectedTypes) {
        expect(ENEMY_TYPES[type]).toBeDefined();
      }
    });

    it('each type has a unique id matching its key', () => {
      const ids = new Set<string>();
      for (const [key, config] of Object.entries(ENEMY_TYPES)) {
        expect(config.id).toBe(key);
        expect(ids.has(config.id)).toBe(false);
        ids.add(config.id);
      }
    });

    it('each type has valid numeric properties', () => {
      for (const config of Object.values(ENEMY_TYPES)) {
        expect(config.color).toBeTypeOf('number');
        expect(config.bodyScale).toBeGreaterThan(0);
        expect(config.heightScale).toBeGreaterThan(0);
        expect(config.hpMult).toBeGreaterThan(0);
        expect(config.dmgMult).toBeGreaterThan(0);
        expect(config.speedMult).toBeGreaterThan(0);
        expect(config.attackRange).toBeGreaterThan(0);
        expect(config.attackCooldown).toBeGreaterThan(0);
      }
    });

    it('each type has a non-empty name', () => {
      for (const config of Object.values(ENEMY_TYPES)) {
        expect(config.name.length).toBeGreaterThan(0);
      }
    });
  });

  describe('captain constants', () => {
    it('CAPTAIN_SCALE is greater than 1', () => {
      expect(CAPTAIN_SCALE).toBeGreaterThan(1);
    });

    it('CAPTAIN_HP_MULT is greater than 1', () => {
      expect(CAPTAIN_HP_MULT).toBeGreaterThan(1);
    });

    it('CAPTAIN_DMG_MULT is greater than 1', () => {
      expect(CAPTAIN_DMG_MULT).toBeGreaterThan(1);
    });
  });

  describe('COLORS', () => {
    it('all color values are valid hex numbers', () => {
      for (const [, value] of Object.entries(COLORS)) {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0xffffff);
      }
    });
  });
});

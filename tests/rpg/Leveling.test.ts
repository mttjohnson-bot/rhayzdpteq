import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LevelSystem, MAX_LEVEL, enemyXP } from '../../src/rpg/Leveling';
import { events } from '../../src/utils/EventBus';

describe('enemyXP', () => {
  it('returns correct XP for floor 1', () => {
    expect(enemyXP(1)).toBe(25);
  });

  it('returns correct XP for floor 5', () => {
    expect(enemyXP(5)).toBe(65);
  });

  it('returns correct XP for floor 10', () => {
    expect(enemyXP(10)).toBe(115);
  });

  it('increases with floor number', () => {
    for (let floor = 1; floor < 10; floor++) {
      expect(enemyXP(floor + 1)).toBeGreaterThan(enemyXP(floor));
    }
  });
});

describe('LevelSystem', () => {
  let levelSys: LevelSystem;

  beforeEach(() => {
    levelSys = new LevelSystem();
    events.clear();
  });

  describe('initial state', () => {
    it('starts at level 1 with 0 XP and 0 skill points', () => {
      expect(levelSys.level).toBe(1);
      expect(levelSys.xp).toBe(0);
      expect(levelSys.skillPoints).toBe(0);
    });
  });

  describe('xpToNextLevel', () => {
    it('returns correct threshold for level 1', () => {
      // 50*1 + 20*1 = 70
      expect(levelSys.xpToNextLevel).toBe(70);
    });

    it('returns 0 at max level', () => {
      levelSys.level = MAX_LEVEL;
      expect(levelSys.xpToNextLevel).toBe(0);
    });

    it('increases per level', () => {
      const level1Req = levelSys.xpToNextLevel;
      levelSys.level = 2;
      const level2Req = levelSys.xpToNextLevel;
      expect(level2Req).toBeGreaterThan(level1Req);
    });
  });

  describe('xpProgress', () => {
    it('is 0 with no XP at level 1', () => {
      expect(levelSys.xpProgress).toBe(0);
    });

    it('is 1 at max level', () => {
      levelSys.level = MAX_LEVEL;
      expect(levelSys.xpProgress).toBe(1);
    });

    it('returns correct fraction', () => {
      levelSys.xp = 35;
      // xpToNextLevel at level 1 = 70
      expect(levelSys.xpProgress).toBeCloseTo(0.5);
    });
  });

  describe('addXP', () => {
    it('adds XP without leveling up', () => {
      levelSys.addXP(30);
      expect(levelSys.level).toBe(1);
      expect(levelSys.xp).toBe(30);
    });

    it('levels up when XP threshold is reached', () => {
      levelSys.addXP(70);
      expect(levelSys.level).toBe(2);
      expect(levelSys.xp).toBe(0);
      expect(levelSys.skillPoints).toBe(1);
    });

    it('handles XP overflow across multiple levels', () => {
      // Level 1 needs 70, Level 2 needs 50*2+20*4=180
      levelSys.addXP(70 + 180);
      expect(levelSys.level).toBe(3);
      expect(levelSys.xp).toBe(0);
      expect(levelSys.skillPoints).toBe(2);
    });

    it('does not exceed MAX_LEVEL', () => {
      levelSys.level = MAX_LEVEL - 1;
      levelSys.xp = 0;
      levelSys.addXP(100000);
      expect(levelSys.level).toBe(MAX_LEVEL);
      expect(levelSys.xp).toBe(0);
    });

    it('ignores XP at MAX_LEVEL', () => {
      levelSys.level = MAX_LEVEL;
      levelSys.addXP(1000);
      expect(levelSys.level).toBe(MAX_LEVEL);
      expect(levelSys.xp).toBe(0);
    });

    it('emits levelUp event on level up', () => {
      const listener = vi.fn();
      events.on('levelUp', listener);
      levelSys.addXP(70);
      expect(listener).toHaveBeenCalledWith(2, 1);
    });

    it('emits xpGained event', () => {
      const listener = vi.fn();
      events.on('xpGained', listener);
      levelSys.addXP(30);
      expect(listener).toHaveBeenCalled();
    });

    it('grants one skill point per level-up', () => {
      levelSys.addXP(70); // level 2
      expect(levelSys.skillPoints).toBe(1);
      levelSys.addXP(180); // level 3
      expect(levelSys.skillPoints).toBe(2);
    });
  });

  describe('spendPoint', () => {
    it('returns true and decrements when points available', () => {
      levelSys.skillPoints = 3;
      expect(levelSys.spendPoint()).toBe(true);
      expect(levelSys.skillPoints).toBe(2);
    });

    it('returns false when no points available', () => {
      expect(levelSys.spendPoint()).toBe(false);
      expect(levelSys.skillPoints).toBe(0);
    });
  });

  describe('serialization', () => {
    it('toJSON returns correct data', () => {
      levelSys.level = 5;
      levelSys.xp = 100;
      levelSys.skillPoints = 3;
      const data = levelSys.toJSON();
      expect(data).toEqual({ level: 5, xp: 100, skillPoints: 3 });
    });

    it('fromJSON restores state', () => {
      levelSys.fromJSON({ level: 10, xp: 500, skillPoints: 5 });
      expect(levelSys.level).toBe(10);
      expect(levelSys.xp).toBe(500);
      expect(levelSys.skillPoints).toBe(5);
    });

    it('round-trips correctly', () => {
      levelSys.level = 7;
      levelSys.xp = 250;
      levelSys.skillPoints = 2;
      const data = levelSys.toJSON();
      const restored = new LevelSystem();
      restored.fromJSON(data);
      expect(restored.level).toBe(7);
      expect(restored.xp).toBe(250);
      expect(restored.skillPoints).toBe(2);
    });
  });

  describe('MAX_LEVEL', () => {
    it('is 20', () => {
      expect(MAX_LEVEL).toBe(20);
    });
  });
});

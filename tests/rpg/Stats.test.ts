import { describe, it, expect } from 'vitest';
import { PlayerStats } from '../../src/rpg/Stats';
import type { StatModifier } from '../../src/rpg/Stats';

describe('PlayerStats', () => {
  describe('base stats at level 1', () => {
    it('computes correct base stats at level 1 with no modifiers', () => {
      const stats = new PlayerStats();
      const computed = stats.compute(1);

      expect(computed.strength).toBe(5);
      expect(computed.vitality).toBe(5);
      expect(computed.agility).toBe(5);
      expect(computed.luck).toBe(3);
    });

    it('computes correct derived stats at level 1', () => {
      const stats = new PlayerStats();
      const computed = stats.compute(1);

      // maxHp = 100 + 5 * 10 = 150
      expect(computed.maxHp).toBe(150);
      // attack = 5 * 2 = 10
      expect(computed.attack).toBe(10);
      // defense = 5 * 0.5 = 2.5 → round = 3
      expect(computed.defense).toBe(3);
      // attackSpeed = 1 + 0 + 5 * 0.01 = 1.05
      expect(computed.attackSpeed).toBe(1.05);
      // moveSpeed = 1 + 0 + 5 * 0.01 = 1.05
      expect(computed.moveSpeed).toBe(1.05);
      // critChance = min(0.5, 3 * 0.005 + 0) = 0.015
      expect(computed.critChance).toBe(0.015);
      // critMultiplier = 1.5 + 3 * 0.01 = 1.53
      expect(computed.critMultiplier).toBe(1.53);
      expect(computed.hpRegen).toBe(0);
    });
  });

  describe('level scaling', () => {
    it('increases base stats per level', () => {
      const stats = new PlayerStats();
      const level1 = stats.compute(1);
      const level5 = stats.compute(5);

      // At level 5: str = 5 + 4*1 = 9
      expect(level5.strength).toBe(9);
      // vit = 5 + 4*1 = 9
      expect(level5.vitality).toBe(9);
      // agi = 5 + 4*0.5 = 7 (floored)
      expect(level5.agility).toBe(7);
      // luck = 3 + 4*0.3 = 4.2 → floor = 4
      expect(level5.luck).toBe(4);

      // All stats should be higher at level 5
      expect(level5.maxHp).toBeGreaterThan(level1.maxHp);
      expect(level5.attack).toBeGreaterThan(level1.attack);
    });

    it('computes correct stats at level 20', () => {
      const stats = new PlayerStats();
      const computed = stats.compute(20);

      // str = 5 + 19*1 = 24
      expect(computed.strength).toBe(24);
      // vit = 5 + 19*1 = 24
      expect(computed.vitality).toBe(24);
      // agi = 5 + 19*0.5 = 14.5 → 14
      expect(computed.agility).toBe(14);
      // luck = 3 + 19*0.3 = 8.7 → 8
      expect(computed.luck).toBe(8);
    });
  });

  describe('modifier application', () => {
    it('applies flat damage modifier', () => {
      const stats = new PlayerStats();
      const mod: StatModifier = { flatDamage: 10 };
      stats.setModifiers([mod]);
      const computed = stats.compute(1);

      // attack = 5 * 2 + 10 = 20
      expect(computed.attack).toBe(20);
    });

    it('applies flat defense modifier', () => {
      const stats = new PlayerStats();
      const mod: StatModifier = { flatDefense: 5 };
      stats.setModifiers([mod]);
      const computed = stats.compute(1);

      // defense = 5 * 0.5 + 5 = 7.5 → round = 8
      expect(computed.defense).toBe(8);
    });

    it('applies flat maxHp modifier', () => {
      const stats = new PlayerStats();
      const mod: StatModifier = { flatMaxHp: 50 };
      stats.setModifiers([mod]);
      const computed = stats.compute(1);

      // maxHp = 100 + 5 * 10 + 50 = 200
      expect(computed.maxHp).toBe(200);
    });

    it('applies attackSpeed modifier', () => {
      const stats = new PlayerStats();
      const mod: StatModifier = { attackSpeed: 0.2 };
      stats.setModifiers([mod]);
      const computed = stats.compute(1);

      // attackSpeed = 1 + 0.2 + 5 * 0.01 = 1.25
      expect(computed.attackSpeed).toBe(1.25);
    });

    it('applies moveSpeed modifier', () => {
      const stats = new PlayerStats();
      const mod: StatModifier = { moveSpeed: 0.15 };
      stats.setModifiers([mod]);
      const computed = stats.compute(1);

      // moveSpeed = 1 + 0.15 + 5 * 0.01 = 1.20
      expect(computed.moveSpeed).toBe(1.2);
    });

    it('applies critChance modifier', () => {
      const stats = new PlayerStats();
      const mod: StatModifier = { critChance: 0.1 };
      stats.setModifiers([mod]);
      const computed = stats.compute(1);

      // critChance = min(0.5, 3 * 0.005 + 0.1) = 0.115
      expect(computed.critChance).toBe(0.115);
    });

    it('applies hpRegen modifier', () => {
      const stats = new PlayerStats();
      const mod: StatModifier = { hpRegen: 2 };
      stats.setModifiers([mod]);
      const computed = stats.compute(1);

      expect(computed.hpRegen).toBe(2);
    });

    it('stacks multiple modifiers', () => {
      const stats = new PlayerStats();
      const mod1: StatModifier = { flatDamage: 5, strength: 3 };
      const mod2: StatModifier = { flatDamage: 10, strength: 2 };
      stats.setModifiers([mod1, mod2]);
      const computed = stats.compute(1);

      // str = 5 + 3 + 2 = 10 (floored)
      expect(computed.strength).toBe(10);
      // attack = 10 * 2 + 15 = 35
      expect(computed.attack).toBe(35);
    });

    it('applies stat modifiers that affect derived values', () => {
      const stats = new PlayerStats();
      const mod: StatModifier = { vitality: 10 };
      stats.setModifiers([mod]);
      const computed = stats.compute(1);

      // vit = 5 + 10 = 15
      expect(computed.vitality).toBe(15);
      // maxHp = 100 + 15 * 10 = 250
      expect(computed.maxHp).toBe(250);
    });
  });

  describe('crit chance capping', () => {
    it('caps critChance at 0.5', () => {
      const stats = new PlayerStats();
      const mod: StatModifier = { critChance: 0.9, luck: 100 };
      stats.setModifiers([mod]);
      const computed = stats.compute(1);

      expect(computed.critChance).toBe(0.5);
    });
  });

  describe('setModifiers replaces previous modifiers', () => {
    it('replaces modifiers instead of stacking', () => {
      const stats = new PlayerStats();
      stats.setModifiers([{ flatDamage: 100 }]);
      stats.setModifiers([{ flatDamage: 5 }]);
      const computed = stats.compute(1);

      // attack = 5 * 2 + 5 = 15, not 115
      expect(computed.attack).toBe(15);
    });
  });
});

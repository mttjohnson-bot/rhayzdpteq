/**
 * XP and leveling system.
 *
 * XP thresholds increase per level. Each level-up grants a skill point.
 * Enemies grant XP based on floor.
 */

import { events } from '../utils/EventBus';

/** XP required to reach next level from current level */
function xpForLevel(level: number): number {
  // Quadratic curve: 50, 120, 210, 320, 450, ...
  return Math.round(50 * level + 20 * level * level);
}

/** XP granted by a normal enemy on a given floor */
export function enemyXP(floor: number): number {
  return 15 + floor * 10;
}

export const MAX_LEVEL = 20;

export class LevelSystem {
  level = 1;
  xp = 0;
  skillPoints = 0;

  /** Total XP needed to reach next level */
  get xpToNextLevel(): number {
    if (this.level >= MAX_LEVEL) return 0;
    return xpForLevel(this.level);
  }

  /** Progress within current level (0-1) */
  get xpProgress(): number {
    if (this.level >= MAX_LEVEL) return 1;
    const needed = this.xpToNextLevel;
    return needed > 0 ? this.xp / needed : 1;
  }

  addXP(amount: number): void {
    if (this.level >= MAX_LEVEL) return;
    this.xp += amount;

    while (this.xp >= this.xpToNextLevel && this.level < MAX_LEVEL) {
      this.xp -= this.xpToNextLevel;
      this.level++;
      this.skillPoints++;
      events.emit('levelUp', this.level, this.skillPoints);
    }

    if (this.level >= MAX_LEVEL) {
      this.xp = 0;
    }

    events.emit('xpGained', this.xp, this.xpToNextLevel, this.level);
  }

  /** Spend a skill point (returns false if none available) */
  spendPoint(): boolean {
    if (this.skillPoints <= 0) return false;
    this.skillPoints--;
    return true;
  }

  /** Serialize for save */
  toJSON(): { level: number; xp: number; skillPoints: number } {
    return { level: this.level, xp: this.xp, skillPoints: this.skillPoints };
  }

  /** Restore from save */
  fromJSON(data: { level: number; xp: number; skillPoints: number }): void {
    this.level = data.level;
    this.xp = data.xp;
    this.skillPoints = data.skillPoints;
  }
}

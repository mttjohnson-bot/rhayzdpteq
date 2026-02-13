/**
 * Save/Load system using localStorage.
 *
 * Persists player progress: level, XP, skill points, skill tree allocations,
 * inventory (equipment + bag), and highest unlocked floor.
 */

import { LevelSystem } from '../rpg/Leveling';
import { SkillTree } from '../rpg/SkillTree';
import { Inventory } from '../rpg/Inventory';
import { Item } from '../rpg/LootTable';

const SAVE_KEY = 'dungeon_ascent_save';
const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  timestamp: number;
  maxUnlockedFloor: number;
  level: { level: number; xp: number; skillPoints: number };
  skillTree: Record<string, number>;
  inventory: { equipped: Record<string, Item | null>; bag: Item[] };
}

export class SaveManager {
  /** Save current game state to localStorage */
  static save(
    maxUnlockedFloor: number,
    levelSystem: LevelSystem,
    skillTree: SkillTree,
    inventory: Inventory,
  ): boolean {
    try {
      const data: SaveData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        maxUnlockedFloor,
        level: levelSystem.toJSON(),
        skillTree: skillTree.toJSON(),
        inventory: inventory.toJSON(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  /** Load game state from localStorage. Returns null if no save exists. */
  static load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (!data.version || data.version > SAVE_VERSION) return null;
      return data;
    } catch {
      return null;
    }
  }

  /** Apply loaded save data to game systems */
  static apply(
    data: SaveData,
    levelSystem: LevelSystem,
    skillTree: SkillTree,
    inventory: Inventory,
  ): number {
    levelSystem.fromJSON(data.level);
    skillTree.fromJSON(data.skillTree);
    inventory.fromJSON(data.inventory);
    return data.maxUnlockedFloor;
  }

  /** Check if a save exists */
  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  /** Delete the save */
  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  /** Get save info for display (without fully parsing) */
  static getSaveInfo(): { level: number; floor: number; timestamp: number } | null {
    const data = SaveManager.load();
    if (!data) return null;
    return {
      level: data.level.level,
      floor: data.maxUnlockedFloor,
      timestamp: data.timestamp,
    };
  }
}

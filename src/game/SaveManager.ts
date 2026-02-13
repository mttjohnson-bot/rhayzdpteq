/**
 * Save/Load system using localStorage with multiple save slots.
 */

import { LevelSystem } from '../rpg/Leveling';
import { SkillTree } from '../rpg/SkillTree';
import { Inventory } from '../rpg/Inventory';
import { Item } from '../rpg/LootTable';

const SAVE_KEY_PREFIX = 'dungeon_ascent_save_';
const ACTIVE_SLOT_KEY = 'dungeon_ascent_active_slot';
const SAVE_VERSION = 2;
export const MAX_SAVE_SLOTS = 4;

export interface SaveData {
  version: number;
  timestamp: number;
  maxUnlockedFloor: number;
  level: { level: number; xp: number; skillPoints: number };
  skillTree: Record<string, number>;
  inventory: { equipped: Record<string, Item | null>; bag: Item[] };
  gameCompleted?: boolean;
}

export interface SlotInfo {
  slot: number;
  exists: boolean;
  level?: number;
  floor?: number;
  timestamp?: number;
  gameCompleted?: boolean;
}

function slotKey(slot: number): string {
  return `${SAVE_KEY_PREFIX}${slot}`;
}

export class SaveManager {
  private static _activeSlot: number = 0;

  static get activeSlot(): number {
    if (this._activeSlot === 0) {
      const stored = localStorage.getItem(ACTIVE_SLOT_KEY);
      this._activeSlot = stored ? parseInt(stored, 10) : 1;
    }
    return this._activeSlot;
  }

  static set activeSlot(slot: number) {
    this._activeSlot = slot;
    localStorage.setItem(ACTIVE_SLOT_KEY, String(slot));
  }

  static save(
    maxUnlockedFloor: number,
    levelSystem: LevelSystem,
    skillTree: SkillTree,
    inventory: Inventory,
    gameCompleted?: boolean,
  ): boolean {
    try {
      const data: SaveData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        maxUnlockedFloor,
        level: levelSystem.toJSON(),
        skillTree: skillTree.toJSON(),
        inventory: inventory.toJSON(),
        gameCompleted,
      };
      localStorage.setItem(slotKey(this.activeSlot), JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  static load(slot?: number): SaveData | null {
    try {
      const key = slotKey(slot ?? this.activeSlot);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = JSON.parse(raw) as SaveData;
      if (!data.version || data.version > SAVE_VERSION) return null;
      return data;
    } catch {
      return null;
    }
  }

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

  static hasSave(slot?: number): boolean {
    return localStorage.getItem(slotKey(slot ?? this.activeSlot)) !== null;
  }

  static deleteSave(slot?: number): void {
    localStorage.removeItem(slotKey(slot ?? this.activeSlot));
  }

  static getSaveInfo(slot?: number): { level: number; floor: number; timestamp: number; gameCompleted?: boolean } | null {
    const data = SaveManager.load(slot ?? this.activeSlot);
    if (!data) return null;
    return {
      level: data.level.level,
      floor: data.maxUnlockedFloor,
      timestamp: data.timestamp,
      gameCompleted: data.gameCompleted,
    };
  }

  static getAllSlotInfo(): SlotInfo[] {
    const slots: SlotInfo[] = [];
    for (let i = 1; i <= MAX_SAVE_SLOTS; i++) {
      const info = SaveManager.getSaveInfo(i);
      if (info) {
        slots.push({
          slot: i,
          exists: true,
          level: info.level,
          floor: info.floor,
          timestamp: info.timestamp,
          gameCompleted: info.gameCompleted,
        });
      } else {
        slots.push({ slot: i, exists: false });
      }
    }
    return slots;
  }
}

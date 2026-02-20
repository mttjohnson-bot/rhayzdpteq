import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveManager, MAX_SAVE_SLOTS } from '../../src/game/SaveManager';
import type { SaveData } from '../../src/game/SaveManager';
import { LevelSystem } from '../../src/rpg/Leveling';
import { SkillTree } from '../../src/rpg/SkillTree';
import { Inventory } from '../../src/rpg/Inventory';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

describe('SaveManager', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset the cached active slot
    (SaveManager as unknown as { _activeSlot: number })._activeSlot = 0;
  });

  describe('MAX_SAVE_SLOTS', () => {
    it('is 4', () => {
      expect(MAX_SAVE_SLOTS).toBe(4);
    });
  });

  describe('activeSlot', () => {
    it('defaults to 1 when no stored value', () => {
      expect(SaveManager.activeSlot).toBe(1);
    });

    it('reads from localStorage', () => {
      localStorageMock.setItem('dungeon_ascent_active_slot', '3');
      (SaveManager as unknown as { _activeSlot: number })._activeSlot = 0;
      expect(SaveManager.activeSlot).toBe(3);
    });

    it('stores to localStorage when set', () => {
      SaveManager.activeSlot = 2;
      expect(localStorageMock.setItem).toHaveBeenCalledWith('dungeon_ascent_active_slot', '2');
    });
  });

  describe('save and load round-trip', () => {
    it('saves and loads data correctly', () => {
      const levelSys = new LevelSystem();
      levelSys.level = 5;
      levelSys.xp = 100;
      levelSys.skillPoints = 2;

      const skillTree = new SkillTree();
      skillTree.rankUp('w1');
      skillTree.rankUp('w1');

      const inventory = new Inventory();

      SaveManager.activeSlot = 1;
      const saved = SaveManager.save(3, levelSys, skillTree, inventory);
      expect(saved).toBe(true);

      const loaded = SaveManager.load(1);
      expect(loaded).not.toBeNull();
      expect(loaded!.maxUnlockedFloor).toBe(3);
      expect(loaded!.level.level).toBe(5);
      expect(loaded!.level.xp).toBe(100);
      expect(loaded!.level.skillPoints).toBe(2);
      expect(loaded!.skillTree['w1']).toBe(2);
    });
  });

  describe('slot isolation', () => {
    it('different slots store different data', () => {
      const levelSys1 = new LevelSystem();
      levelSys1.level = 3;
      const levelSys2 = new LevelSystem();
      levelSys2.level = 7;

      const skillTree = new SkillTree();
      const inventory = new Inventory();

      SaveManager.activeSlot = 1;
      SaveManager.save(1, levelSys1, skillTree, inventory);

      SaveManager.activeSlot = 2;
      SaveManager.save(5, levelSys2, skillTree, inventory);

      const slot1 = SaveManager.load(1);
      const slot2 = SaveManager.load(2);

      expect(slot1!.level.level).toBe(3);
      expect(slot2!.level.level).toBe(7);
      expect(slot1!.maxUnlockedFloor).toBe(1);
      expect(slot2!.maxUnlockedFloor).toBe(5);
    });
  });

  describe('apply', () => {
    it('restores game state from save data', () => {
      const saveData: SaveData = {
        version: 2,
        timestamp: Date.now(),
        maxUnlockedFloor: 4,
        level: { level: 8, xp: 300, skillPoints: 3 },
        skillTree: { w1: 3, w2: 2 },
        inventory: {
          equipped: { weapon: null, armor: null, ring: null },
          bag: [],
        },
      };

      const levelSys = new LevelSystem();
      const skillTree = new SkillTree();
      const inventory = new Inventory();

      const floor = SaveManager.apply(saveData, levelSys, skillTree, inventory);

      expect(floor).toBe(4);
      expect(levelSys.level).toBe(8);
      expect(levelSys.xp).toBe(300);
      expect(levelSys.skillPoints).toBe(3);
      expect(skillTree.getNode('w1')!.currentRank).toBe(3);
      expect(skillTree.getNode('w2')!.currentRank).toBe(2);
    });
  });

  describe('hasSave', () => {
    it('returns false for empty slot', () => {
      SaveManager.activeSlot = 1;
      expect(SaveManager.hasSave()).toBe(false);
    });

    it('returns true after saving', () => {
      const levelSys = new LevelSystem();
      const skillTree = new SkillTree();
      const inventory = new Inventory();

      SaveManager.activeSlot = 1;
      SaveManager.save(1, levelSys, skillTree, inventory);
      expect(SaveManager.hasSave()).toBe(true);
    });

    it('accepts explicit slot parameter', () => {
      expect(SaveManager.hasSave(3)).toBe(false);
    });
  });

  describe('deleteSave', () => {
    it('removes save data', () => {
      const levelSys = new LevelSystem();
      const skillTree = new SkillTree();
      const inventory = new Inventory();

      SaveManager.activeSlot = 1;
      SaveManager.save(1, levelSys, skillTree, inventory);
      expect(SaveManager.hasSave()).toBe(true);

      SaveManager.deleteSave();
      expect(SaveManager.hasSave()).toBe(false);
    });

    it('accepts explicit slot parameter', () => {
      const levelSys = new LevelSystem();
      const skillTree = new SkillTree();
      const inventory = new Inventory();

      SaveManager.activeSlot = 2;
      SaveManager.save(1, levelSys, skillTree, inventory);
      SaveManager.deleteSave(2);
      expect(SaveManager.hasSave(2)).toBe(false);
    });
  });

  describe('getSaveInfo', () => {
    it('returns null for empty slot', () => {
      SaveManager.activeSlot = 1;
      expect(SaveManager.getSaveInfo()).toBeNull();
    });

    it('returns correct info after saving', () => {
      const levelSys = new LevelSystem();
      levelSys.level = 10;
      const skillTree = new SkillTree();
      const inventory = new Inventory();

      SaveManager.activeSlot = 1;
      SaveManager.save(5, levelSys, skillTree, inventory, true);

      const info = SaveManager.getSaveInfo();
      expect(info).not.toBeNull();
      expect(info!.level).toBe(10);
      expect(info!.floor).toBe(5);
      expect(info!.gameCompleted).toBe(true);
      expect(info!.timestamp).toBeGreaterThan(0);
    });
  });

  describe('getAllSlotInfo', () => {
    it('returns info for all slots', () => {
      const slots = SaveManager.getAllSlotInfo();
      expect(slots.length).toBe(MAX_SAVE_SLOTS);
      for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
        expect(slots[i].slot).toBe(i + 1);
        expect(slots[i].exists).toBe(false);
      }
    });

    it('reflects saved data', () => {
      const levelSys = new LevelSystem();
      levelSys.level = 5;
      const skillTree = new SkillTree();
      const inventory = new Inventory();

      SaveManager.activeSlot = 2;
      SaveManager.save(3, levelSys, skillTree, inventory);

      const slots = SaveManager.getAllSlotInfo();
      expect(slots[0].exists).toBe(false);
      expect(slots[1].exists).toBe(true);
      expect(slots[1].level).toBe(5);
      expect(slots[1].floor).toBe(3);
      expect(slots[2].exists).toBe(false);
      expect(slots[3].exists).toBe(false);
    });
  });

  describe('corrupt data handling', () => {
    it('returns null for invalid JSON', () => {
      localStorageMock.setItem('dungeon_ascent_save_1', 'not-json');
      (SaveManager as unknown as { _activeSlot: number })._activeSlot = 0;
      SaveManager.activeSlot = 1;
      expect(SaveManager.load(1)).toBeNull();
    });

    it('returns null for future version', () => {
      const futureData = JSON.stringify({ version: 999, timestamp: Date.now() });
      localStorageMock.setItem('dungeon_ascent_save_1', futureData);
      expect(SaveManager.load(1)).toBeNull();
    });

    it('returns null for data missing version', () => {
      const noVersion = JSON.stringify({ timestamp: Date.now() });
      localStorageMock.setItem('dungeon_ascent_save_1', noVersion);
      expect(SaveManager.load(1)).toBeNull();
    });
  });

  describe('save failure handling', () => {
    it('returns false when localStorage throws', () => {
      const levelSys = new LevelSystem();
      const skillTree = new SkillTree();
      const inventory = new Inventory();

      // Set active slot before installing the throwing mock
      SaveManager.activeSlot = 1;

      const origSetItem = localStorageMock.setItem;
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('QuotaExceeded');
      });

      const result = SaveManager.save(1, levelSys, skillTree, inventory);
      expect(result).toBe(false);

      localStorageMock.setItem = origSetItem;
    });
  });

  describe('gameCompleted flag', () => {
    it('persists through save/load', () => {
      const levelSys = new LevelSystem();
      const skillTree = new SkillTree();
      const inventory = new Inventory();

      SaveManager.activeSlot = 1;
      SaveManager.save(10, levelSys, skillTree, inventory, true);

      const loaded = SaveManager.load(1);
      expect(loaded!.gameCompleted).toBe(true);
    });
  });
});

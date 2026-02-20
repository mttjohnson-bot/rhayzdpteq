import { describe, it, expect } from 'vitest';
import {
  rollEnemyLoot,
  rollChestLoot,
  rollBossLoot,
  rarityColor,
} from '../../src/rpg/LootTable';
import type { Item, ItemRarity, ItemSlot } from '../../src/rpg/LootTable';

describe('rarityColor', () => {
  it('returns correct colors for each rarity', () => {
    expect(rarityColor('common')).toBe('#aaaaaa');
    expect(rarityColor('uncommon')).toBe('#44cc44');
    expect(rarityColor('rare')).toBe('#4488ff');
    expect(rarityColor('epic')).toBe('#cc44ff');
  });
});

describe('rollEnemyLoot', () => {
  it('returns an array', () => {
    const loot = rollEnemyLoot(1);
    expect(Array.isArray(loot)).toBe(true);
  });

  it('returns items with valid structure', () => {
    // Run many times since drops are probabilistic
    for (let i = 0; i < 100; i++) {
      const items = rollEnemyLoot(3);
      for (const item of items) {
        validateItem(item);
      }
    }
  });

  it('can return empty loot', () => {
    // With enough tries, enemy loot should sometimes be empty (70% no equipment, 75% no potion)
    let hadEmpty = false;
    for (let i = 0; i < 200; i++) {
      if (rollEnemyLoot(1).length === 0) {
        hadEmpty = true;
        break;
      }
    }
    expect(hadEmpty).toBe(true);
  });
});

describe('rollChestLoot', () => {
  it('always contains at least one equipment and one potion', () => {
    for (let i = 0; i < 50; i++) {
      const items = rollChestLoot(3);
      expect(items.length).toBeGreaterThanOrEqual(2);

      const hasEquipment = items.some((item) => item.type === 'equipment');
      const hasConsumable = items.some((item) => item.type === 'consumable');
      expect(hasEquipment).toBe(true);
      expect(hasConsumable).toBe(true);
    }
  });

  it('generates items with valid structure', () => {
    for (let i = 0; i < 50; i++) {
      const items = rollChestLoot(5);
      for (const item of items) {
        validateItem(item);
      }
    }
  });
});

describe('rollBossLoot', () => {
  it('always contains at least one equipment and one potion', () => {
    for (let i = 0; i < 50; i++) {
      const items = rollBossLoot(5);
      expect(items.length).toBeGreaterThanOrEqual(2);

      const hasEquipment = items.some((item) => item.type === 'equipment');
      const hasConsumable = items.some((item) => item.type === 'consumable');
      expect(hasEquipment).toBe(true);
      expect(hasConsumable).toBe(true);
    }
  });

  it('generates items with valid structure', () => {
    for (let i = 0; i < 50; i++) {
      const items = rollBossLoot(5);
      for (const item of items) {
        validateItem(item);
      }
    }
  });
});

describe('item generation', () => {
  it('all equipment items have a valid slot', () => {
    const validSlots: ItemSlot[] = ['weapon', 'armor', 'ring'];
    for (let floor = 1; floor <= 10; floor++) {
      for (let i = 0; i < 20; i++) {
        const items = rollChestLoot(floor);
        for (const item of items) {
          if (item.type === 'equipment') {
            expect(validSlots).toContain(item.slot);
          }
        }
      }
    }
  });

  it('all rarities are represented across many rolls', () => {
    const rarities = new Set<ItemRarity>();
    for (let i = 0; i < 500; i++) {
      const items = rollChestLoot(5);
      for (const item of items) {
        rarities.add(item.rarity);
      }
    }
    expect(rarities.has('common')).toBe(true);
    expect(rarities.has('uncommon')).toBe(true);
    expect(rarities.has('rare')).toBe(true);
    expect(rarities.has('epic')).toBe(true);
  });

  it('all item slots are represented across many rolls', () => {
    const slots = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const items = rollChestLoot(5);
      for (const item of items) {
        if (item.slot) slots.add(item.slot);
      }
    }
    expect(slots.has('weapon')).toBe(true);
    expect(slots.has('armor')).toBe(true);
    expect(slots.has('ring')).toBe(true);
  });

  it('weapon items have a subtype assigned', () => {
    const validSubtypes = ['sword', 'axe', 'mace', 'dagger', 'spear'];
    for (let i = 0; i < 200; i++) {
      const items = rollChestLoot(5);
      for (const item of items) {
        if (item.slot === 'weapon') {
          expect(item.subtype).toBeDefined();
          expect(validSubtypes).toContain(item.subtype);
        }
      }
    }
  });

  it('consumable items have valid consume effect', () => {
    const validEffects = ['heal', 'manaShield', 'speedBoost', 'strengthBoost'];
    for (let i = 0; i < 100; i++) {
      const items = rollChestLoot(5);
      for (const item of items) {
        if (item.type === 'consumable') {
          expect(item.consumeEffect).toBeDefined();
          expect(validEffects).toContain(item.consumeEffect);
        }
      }
    }
  });

  it('items have unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const items = rollChestLoot(5);
      for (const item of items) {
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);
      }
    }
  });

  it('no items have undefined values for required fields', () => {
    for (let i = 0; i < 100; i++) {
      const items = rollChestLoot(5);
      for (const item of items) {
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
        expect(item.type).toBeDefined();
        expect(item.rarity).toBeDefined();
        expect(item.level).toBeDefined();
        expect(item.modifier).toBeDefined();
      }
    }
  });
});

function validateItem(item: Item): void {
  expect(item.id).toBeTruthy();
  expect(item.name).toBeTruthy();
  expect(['equipment', 'consumable']).toContain(item.type);
  expect(['common', 'uncommon', 'rare', 'epic']).toContain(item.rarity);
  expect(item.level).toBeGreaterThan(0);
  expect(item.modifier).toBeDefined();

  if (item.type === 'equipment') {
    expect(['weapon', 'armor', 'ring']).toContain(item.slot);
  }
}

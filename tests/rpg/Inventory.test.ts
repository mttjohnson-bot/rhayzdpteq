import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Inventory } from '../../src/rpg/Inventory';
import { events } from '../../src/utils/EventBus';
import type { Item } from '../../src/rpg/LootTable';

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: `item_${Math.random().toString(36).slice(2)}`,
    name: 'Test Sword',
    type: 'equipment',
    slot: 'weapon',
    rarity: 'common',
    level: 1,
    modifier: { flatDamage: 5 },
    subtype: 'sword',
    ...overrides,
  };
}

function makeConsumable(overrides: Partial<Item> = {}): Item {
  return {
    id: `item_${Math.random().toString(36).slice(2)}`,
    name: 'Health Potion',
    type: 'consumable',
    rarity: 'common',
    level: 1,
    modifier: {},
    consumeEffect: 'heal',
    consumeValue: 50,
    ...overrides,
  };
}

describe('Inventory', () => {
  let inv: Inventory;

  beforeEach(() => {
    inv = new Inventory();
    events.clear();
  });

  describe('initial state', () => {
    it('starts with empty equipment slots', () => {
      expect(inv.equipped.weapon).toBeNull();
      expect(inv.equipped.armor).toBeNull();
      expect(inv.equipped.ring).toBeNull();
    });

    it('starts with empty bag', () => {
      expect(inv.bag.length).toBe(0);
      expect(inv.bagSize).toBe(0);
    });

    it('has default bag capacity of 24', () => {
      expect(inv.maxBagSize).toBe(24);
    });
  });

  describe('addItem', () => {
    it('adds item to bag', () => {
      const item = makeItem();
      expect(inv.addItem(item)).toBe(true);
      expect(inv.bag.length).toBe(1);
      expect(inv.bag[0]).toBe(item);
    });

    it('returns false when bag is full', () => {
      for (let i = 0; i < 24; i++) {
        inv.addItem(makeItem());
      }
      expect(inv.addItem(makeItem())).toBe(false);
      expect(inv.bag.length).toBe(24);
    });

    it('emits inventoryChanged event', () => {
      const listener = vi.fn();
      events.on('inventoryChanged', listener);
      inv.addItem(makeItem());
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('removeItem', () => {
    it('removes item by id', () => {
      const item = makeItem({ id: 'remove-me' });
      inv.addItem(item);
      const removed = inv.removeItem('remove-me');
      expect(removed).toBe(item);
      expect(inv.bag.length).toBe(0);
    });

    it('returns null for non-existent id', () => {
      expect(inv.removeItem('nonexistent')).toBeNull();
    });

    it('emits inventoryChanged event', () => {
      const item = makeItem({ id: 'remove-test' });
      inv.addItem(item);
      const listener = vi.fn();
      events.on('inventoryChanged', listener);
      inv.removeItem('remove-test');
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('dropItem', () => {
    it('drops item from bag', () => {
      const item = makeItem({ id: 'drop-me' });
      inv.addItem(item);
      expect(inv.dropItem('drop-me')).toBe(true);
      expect(inv.bag.length).toBe(0);
    });

    it('returns false for non-existent id', () => {
      expect(inv.dropItem('nonexistent')).toBe(false);
    });
  });

  describe('equip', () => {
    it('equips item from bag to correct slot', () => {
      const weapon = makeItem({ id: 'equip-weapon', slot: 'weapon' });
      inv.addItem(weapon);
      expect(inv.equip('equip-weapon')).toBe(true);
      expect(inv.equipped.weapon).toBe(weapon);
      expect(inv.bag.length).toBe(0);
    });

    it('swaps existing equipped item back to bag', () => {
      const weapon1 = makeItem({ id: 'weapon1', slot: 'weapon' });
      const weapon2 = makeItem({ id: 'weapon2', slot: 'weapon' });
      inv.addItem(weapon1);
      inv.equip('weapon1');
      inv.addItem(weapon2);
      inv.equip('weapon2');
      expect(inv.equipped.weapon).toBe(weapon2);
      expect(inv.bag.find((i) => i.id === 'weapon1')).toBe(weapon1);
    });

    it('returns false for non-existent item', () => {
      expect(inv.equip('nonexistent')).toBe(false);
    });

    it('returns false for consumable items', () => {
      const potion = makeConsumable({ id: 'potion' });
      inv.addItem(potion);
      expect(inv.equip('potion')).toBe(false);
    });

    it('emits equipmentChanged and inventoryChanged events', () => {
      const equipListener = vi.fn();
      const invListener = vi.fn();
      events.on('equipmentChanged', equipListener);
      events.on('inventoryChanged', invListener);
      const item = makeItem({ id: 'event-test' });
      inv.addItem(item);
      inv.equip('event-test');
      expect(equipListener).toHaveBeenCalled();
      expect(invListener).toHaveBeenCalled();
    });
  });

  describe('unequip', () => {
    it('unequips item back to bag', () => {
      const weapon = makeItem({ id: 'unequip-test', slot: 'weapon' });
      inv.addItem(weapon);
      inv.equip('unequip-test');
      expect(inv.unequip('weapon')).toBe(true);
      expect(inv.equipped.weapon).toBeNull();
      expect(inv.bag.find((i) => i.id === 'unequip-test')).toBe(weapon);
    });

    it('returns false when slot is empty', () => {
      expect(inv.unequip('weapon')).toBe(false);
    });

    it('returns false when bag is full', () => {
      const weapon = makeItem({ id: 'full-bag-test', slot: 'weapon' });
      inv.addItem(weapon);
      inv.equip('full-bag-test');
      // Fill bag to max
      for (let i = 0; i < 24; i++) {
        inv.addItem(makeItem());
      }
      expect(inv.unequip('weapon')).toBe(false);
      expect(inv.equipped.weapon).toBe(weapon);
    });
  });

  describe('useConsumable', () => {
    it('removes and returns consumable item', () => {
      const potion = makeConsumable({ id: 'use-test' });
      inv.addItem(potion);
      const used = inv.useConsumable('use-test');
      expect(used).toBe(potion);
      expect(inv.bag.length).toBe(0);
    });

    it('returns null for equipment items', () => {
      const weapon = makeItem({ id: 'not-consumable' });
      inv.addItem(weapon);
      expect(inv.useConsumable('not-consumable')).toBeNull();
    });

    it('returns null for non-existent items', () => {
      expect(inv.useConsumable('nonexistent')).toBeNull();
    });
  });

  describe('getEquipmentModifiers', () => {
    it('returns empty array when nothing equipped', () => {
      expect(inv.getEquipmentModifiers()).toEqual([]);
    });

    it('returns modifiers from equipped items', () => {
      const weapon = makeItem({ id: 'mod-test', modifier: { flatDamage: 10 } });
      inv.addItem(weapon);
      inv.equip('mod-test');
      const mods = inv.getEquipmentModifiers();
      expect(mods.length).toBe(1);
      expect(mods[0].flatDamage).toBe(10);
    });

    it('collects modifiers from all equipped slots', () => {
      const weapon = makeItem({ id: 'w', slot: 'weapon', modifier: { flatDamage: 5 } });
      const armor = makeItem({ id: 'a', slot: 'armor', modifier: { flatDefense: 10 } });
      const ring = makeItem({ id: 'r', slot: 'ring', modifier: { critChance: 0.05 } });
      inv.addItem(weapon);
      inv.equip('w');
      inv.addItem(armor);
      inv.equip('a');
      inv.addItem(ring);
      inv.equip('r');
      const mods = inv.getEquipmentModifiers();
      expect(mods.length).toBe(3);
    });
  });

  describe('bag capacity', () => {
    it('addBagSlots increases max bag size', () => {
      inv.addBagSlots(10);
      expect(inv.maxBagSize).toBe(34); // 24 + 10
    });

    it('allows more items after adding bag slots', () => {
      for (let i = 0; i < 24; i++) {
        inv.addItem(makeItem());
      }
      expect(inv.addItem(makeItem())).toBe(false);
      inv.addBagSlots(5);
      expect(inv.addItem(makeItem())).toBe(true);
    });
  });

  describe('bagSize', () => {
    it('reflects actual bag contents', () => {
      expect(inv.bagSize).toBe(0);
      inv.addItem(makeItem());
      expect(inv.bagSize).toBe(1);
      inv.addItem(makeItem());
      expect(inv.bagSize).toBe(2);
    });
  });

  describe('serialization', () => {
    it('toJSON returns correct structure', () => {
      const weapon = makeItem({ id: 'ser-weapon', slot: 'weapon' });
      const bag1 = makeItem({ id: 'ser-bag1' });
      inv.addItem(weapon);
      inv.equip('ser-weapon');
      inv.addItem(bag1);
      const data = inv.toJSON();
      expect(data.equipped.weapon).toBeDefined();
      expect(data.bag.length).toBe(1);
    });

    it('round-trips correctly', () => {
      const weapon = makeItem({ id: 'rt-weapon', slot: 'weapon' });
      const bag1 = makeItem({ id: 'rt-bag1' });
      inv.addItem(weapon);
      inv.equip('rt-weapon');
      inv.addItem(bag1);

      const data = inv.toJSON();
      const restored = new Inventory();
      restored.fromJSON(data);

      expect(restored.equipped.weapon!.id).toBe('rt-weapon');
      expect(restored.bag.length).toBe(1);
      expect(restored.bag[0].id).toBe('rt-bag1');
    });
  });

  describe('weapon migration', () => {
    it('backfills missing subtype from name', () => {
      const data = {
        equipped: {
          weapon: {
            id: 'old-weapon',
            name: 'Worn Axe',
            type: 'equipment' as const,
            slot: 'weapon' as const,
            rarity: 'common' as const,
            level: 1,
            modifier: { flatDamage: 5 },
            // Note: no subtype field
          },
          armor: null,
          ring: null,
        },
        bag: [],
      };

      inv.fromJSON(data);
      expect(inv.equipped.weapon!.subtype).toBe('axe');
    });

    it('defaults to sword when name matches no keyword', () => {
      const data = {
        equipped: {
          weapon: {
            id: 'mystery-weapon',
            name: 'Mystery Weapon',
            type: 'equipment' as const,
            slot: 'weapon' as const,
            rarity: 'common' as const,
            level: 1,
            modifier: { flatDamage: 5 },
          },
          armor: null,
          ring: null,
        },
        bag: [],
      };

      inv.fromJSON(data);
      expect(inv.equipped.weapon!.subtype).toBe('sword');
    });

    it('does not overwrite existing subtype', () => {
      const data = {
        equipped: {
          weapon: {
            id: 'new-weapon',
            name: 'Worn Axe',
            type: 'equipment' as const,
            slot: 'weapon' as const,
            rarity: 'common' as const,
            level: 1,
            modifier: { flatDamage: 5 },
            subtype: 'mace',
          },
          armor: null,
          ring: null,
        },
        bag: [],
      };

      inv.fromJSON(data);
      expect(inv.equipped.weapon!.subtype).toBe('mace');
    });

    it('migrates bag items too', () => {
      const data = {
        equipped: { weapon: null, armor: null, ring: null },
        bag: [
          {
            id: 'bag-old',
            name: 'Old Dagger',
            type: 'equipment' as const,
            slot: 'weapon' as const,
            rarity: 'common' as const,
            level: 1,
            modifier: { flatDamage: 3 },
          },
        ],
      };

      inv.fromJSON(data);
      expect(inv.bag[0].subtype).toBe('dagger');
    });

    it('handles empty bag in save data', () => {
      const data = {
        equipped: { weapon: null, armor: null, ring: null },
        bag: undefined as unknown as Item[],
      };

      inv.fromJSON(data as { equipped: Record<string, Item | null>; bag: Item[] });
      expect(inv.bag.length).toBe(0);
    });
  });
});

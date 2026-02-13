/**
 * Inventory and equipment management.
 *
 * The player has 3 equipment slots (weapon, armor, ring) and a bag with limited capacity.
 * Equipping an item swaps it into the slot, placing any existing item back in the bag.
 */

import { Item, ItemSlot } from './LootTable';
import { StatModifier } from './Stats';
import { events } from '../utils/EventBus';

const MAX_BAG_SIZE = 20;

export interface EquipmentSlots {
  weapon: Item | null;
  armor: Item | null;
  ring: Item | null;
}

export class Inventory {
  equipped: EquipmentSlots = { weapon: null, armor: null, ring: null };
  bag: Item[] = [];

  /** Add item to bag. Returns false if bag is full. */
  addItem(item: Item): boolean {
    if (this.bag.length >= MAX_BAG_SIZE) return false;
    this.bag.push(item);
    events.emit('inventoryChanged');
    return true;
  }

  /** Remove item from bag by id */
  removeItem(itemId: string): Item | null {
    const idx = this.bag.findIndex(i => i.id === itemId);
    if (idx < 0) return null;
    const [item] = this.bag.splice(idx, 1);
    events.emit('inventoryChanged');
    return item;
  }

  /** Equip an item from the bag. If slot is occupied, old item goes to bag. */
  equip(itemId: string): boolean {
    const item = this.bag.find(i => i.id === itemId);
    if (!item || item.type !== 'equipment' || !item.slot) return false;

    const slot = item.slot;
    const old = this.equipped[slot];

    // Remove from bag
    this.bag.splice(this.bag.indexOf(item), 1);

    // Put old item back in bag if present
    if (old) {
      this.bag.push(old);
    }

    this.equipped[slot] = item;
    events.emit('equipmentChanged');
    events.emit('inventoryChanged');
    return true;
  }

  /** Unequip a slot, putting the item in the bag. Returns false if bag is full. */
  unequip(slot: ItemSlot): boolean {
    const item = this.equipped[slot];
    if (!item) return false;
    if (this.bag.length >= MAX_BAG_SIZE) return false;

    this.equipped[slot] = null;
    this.bag.push(item);
    events.emit('equipmentChanged');
    events.emit('inventoryChanged');
    return true;
  }

  /** Use a consumable from the bag. Returns the item if consumed, null otherwise. */
  useConsumable(itemId: string): Item | null {
    const item = this.bag.find(i => i.id === itemId);
    if (!item || item.type !== 'consumable') return null;
    this.bag.splice(this.bag.indexOf(item), 1);
    events.emit('inventoryChanged');
    return item;
  }

  /** Get all stat modifiers from equipped items */
  getEquipmentModifiers(): StatModifier[] {
    const mods: StatModifier[] = [];
    for (const item of Object.values(this.equipped)) {
      if (item) {
        mods.push(item.modifier);
      }
    }
    return mods;
  }

  get bagSize(): number {
    return this.bag.length;
  }

  get maxBagSize(): number {
    return MAX_BAG_SIZE;
  }

  /** Serialize for save */
  toJSON(): { equipped: Record<string, Item | null>; bag: Item[] } {
    return {
      equipped: { ...this.equipped },
      bag: [...this.bag],
    };
  }

  /** Restore from save */
  fromJSON(data: { equipped: Record<string, Item | null>; bag: Item[] }): void {
    this.equipped = {
      weapon: data.equipped.weapon ?? null,
      armor: data.equipped.armor ?? null,
      ring: data.equipped.ring ?? null,
    };
    this.bag = data.bag ?? [];
  }
}

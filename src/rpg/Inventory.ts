/**
 * Inventory and equipment management.
 *
 * The player has 3 equipment slots (weapon, armor, ring) and a bag with limited capacity.
 * Equipping an item swaps it into the slot, placing any existing item back in the bag.
 * Items can be dropped (destroyed) from the bag.
 */

import { Item, ItemSlot } from './LootTable';
import { StatModifier } from './Stats';
import { events } from '../utils/EventBus';

const BASE_BAG_SIZE = 24;

/**
 * Mapping from weapon name keywords to weapon category (subtype).
 * Used to migrate old saved weapons that predate the subtype field.
 */
const WEAPON_NAME_TO_CATEGORY: Record<string, string> = {
  Sword: 'sword',
  Blade: 'sword',
  Falchion: 'sword',
  Sabre: 'sword',
  Axe: 'axe',
  Hatchet: 'axe',
  Cleaver: 'axe',
  Tomahawk: 'axe',
  Mace: 'mace',
  Hammer: 'mace',
  Flail: 'mace',
  Morningstar: 'mace',
  Dagger: 'dagger',
  Shiv: 'dagger',
  Stiletto: 'dagger',
  Dirk: 'dagger',
  Halberd: 'spear',
  Pike: 'spear',
  Spear: 'spear',
  Glaive: 'spear',
};

/** Backfill missing fields on items loaded from old save formats. */
function migrateItem(item: Item): Item {
  // Weapons saved before the subtype field was added need it inferred from name
  if (item.slot === 'weapon' && !item.subtype) {
    for (const [keyword, category] of Object.entries(WEAPON_NAME_TO_CATEGORY)) {
      if (item.name.includes(keyword)) {
        item.subtype = category;
        break;
      }
    }
    // Fallback if name doesn't match any known keyword
    if (!item.subtype) {
      item.subtype = 'sword';
    }
  }
  return item;
}

export interface EquipmentSlots {
  weapon: Item | null;
  armor: Item | null;
  ring: Item | null;
}

export class Inventory {
  equipped: EquipmentSlots = { weapon: null, armor: null, ring: null };
  bag: Item[] = [];
  private bonusBagSlots: number = 0;

  addItem(item: Item): boolean {
    if (this.bag.length >= this.maxBagSize) return false;
    this.bag.push(item);
    events.emit('inventoryChanged');
    return true;
  }

  removeItem(itemId: string): Item | null {
    const idx = this.bag.findIndex((i) => i.id === itemId);
    if (idx < 0) return null;
    const [item] = this.bag.splice(idx, 1);
    events.emit('inventoryChanged');
    return item;
  }

  /** Drop (destroy) an item from the bag */
  dropItem(itemId: string): boolean {
    const idx = this.bag.findIndex((i) => i.id === itemId);
    if (idx < 0) return false;
    this.bag.splice(idx, 1);
    events.emit('inventoryChanged');
    return true;
  }

  equip(itemId: string): boolean {
    const item = this.bag.find((i) => i.id === itemId);
    if (!item || item.type !== 'equipment' || !item.slot) return false;

    const slot = item.slot;
    const old = this.equipped[slot];

    this.bag.splice(this.bag.indexOf(item), 1);

    if (old) {
      this.bag.push(old);
    }

    this.equipped[slot] = item;
    events.emit('equipmentChanged');
    events.emit('inventoryChanged');
    return true;
  }

  unequip(slot: ItemSlot): boolean {
    const item = this.equipped[slot];
    if (!item) return false;
    if (this.bag.length >= this.maxBagSize) return false;

    this.equipped[slot] = null;
    this.bag.push(item);
    events.emit('equipmentChanged');
    events.emit('inventoryChanged');
    return true;
  }

  useConsumable(itemId: string): Item | null {
    const item = this.bag.find((i) => i.id === itemId);
    if (!item || item.type !== 'consumable') return null;
    this.bag.splice(this.bag.indexOf(item), 1);
    events.emit('inventoryChanged');
    return item;
  }

  getEquipmentModifiers(): StatModifier[] {
    const mods: StatModifier[] = [];
    for (const item of Object.values(this.equipped)) {
      if (item) {
        mods.push(item.modifier);
      }
    }
    return mods;
  }

  /** Add bonus bag slots (from skills, etc.) */
  addBagSlots(count: number): void {
    this.bonusBagSlots += count;
  }

  get bagSize(): number {
    return this.bag.length;
  }

  get maxBagSize(): number {
    return BASE_BAG_SIZE + this.bonusBagSlots;
  }

  toJSON(): { equipped: Record<string, Item | null>; bag: Item[] } {
    return {
      equipped: { ...this.equipped },
      bag: [...this.bag],
    };
  }

  fromJSON(data: { equipped: Record<string, Item | null>; bag: Item[] }): void {
    this.equipped = {
      weapon: data.equipped.weapon ? migrateItem(data.equipped.weapon) : null,
      armor: data.equipped.armor ? migrateItem(data.equipped.armor) : null,
      ring: data.equipped.ring ? migrateItem(data.equipped.ring) : null,
    };
    this.bag = (data.bag ?? []).map(migrateItem);
  }
}

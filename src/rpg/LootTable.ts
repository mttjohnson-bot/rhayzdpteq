/**
 * Item definitions, loot tables, and drop-rate logic.
 *
 * Items are equipment (weapon, armor, ring) or consumables.
 * Rarity tiers affect stat ranges. Higher floors drop better loot.
 */

import { StatModifier } from './Stats';

export type ItemSlot = 'weapon' | 'armor' | 'ring';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';
export type ItemType = 'equipment' | 'consumable';
export type ConsumeEffect = 'heal' | 'manaShield' | 'speedBoost' | 'strengthBoost';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  slot?: ItemSlot;
  rarity: ItemRarity;
  level: number;
  modifier: StatModifier;
  /** For weapons: the weapon category ('sword' | 'axe' | 'mace' | 'dagger' | 'spear') */
  subtype?: string;
  consumeEffect?: ConsumeEffect;
  consumeValue?: number;
  consumeDuration?: number;
}

const RARITY_WEIGHTS: Record<ItemRarity, number> = {
  common: 50,
  uncommon: 30,
  rare: 15,
  epic: 5,
};

const RARITY_MULTIPLIER: Record<ItemRarity, number> = {
  common: 1,
  uncommon: 1.5,
  rare: 2,
  epic: 3,
};

const RARITY_COLORS: Record<ItemRarity, string> = {
  common: '#aaaaaa',
  uncommon: '#44cc44',
  rare: '#4488ff',
  epic: '#cc44ff',
};

export function rarityColor(rarity: ItemRarity): string {
  return RARITY_COLORS[rarity];
}

// --- Name pools ---
const WEAPON_NAMES: Record<string, string[]> = {
  sword: ['Sword', 'Blade', 'Falchion', 'Sabre'],
  axe: ['Axe', 'Hatchet', 'Cleaver', 'Tomahawk'],
  mace: ['Mace', 'Hammer', 'Flail', 'Morningstar'],
  dagger: ['Dagger', 'Shiv', 'Stiletto', 'Dirk'],
  spear: ['Halberd', 'Pike', 'Spear', 'Glaive'],
};
const WEAPON_CATEGORIES = Object.keys(WEAPON_NAMES);
const ARMOR_NAMES = ['Chestplate', 'Chainmail', 'Tunic', 'Brigandine', 'Cuirass', 'Plate'];
const RING_NAMES = ['Band', 'Ring', 'Signet', 'Loop', 'Circle', 'Seal'];
const PREFIXES: Record<ItemRarity, string[]> = {
  common: ['Worn', 'Old', 'Simple', 'Crude'],
  uncommon: ['Sturdy', 'Polished', 'Fine', 'Solid'],
  rare: ['Enchanted', 'Gleaming', 'Masterwork', 'Runic'],
  epic: ['Legendary', 'Radiant', 'Mythic', 'Divine'],
};

let nextItemId = 1;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollRarity(floorBonus: number): ItemRarity {
  const weights = { ...RARITY_WEIGHTS };
  weights.uncommon += floorBonus * 5;
  weights.rare += floorBonus * 3;
  weights.epic += floorBonus * 1;

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [rarity, w] of Object.entries(weights) as [ItemRarity, number][]) {
    roll -= w;
    if (roll <= 0) return rarity;
  }
  return 'common';
}

function generateEquipment(floor: number, slot?: ItemSlot): Item {
  const rarity = rollRarity(floor - 1);
  const mult = RARITY_MULTIPLIER[rarity];
  const actualSlot = slot ?? pickRandom<ItemSlot>(['weapon', 'armor', 'ring']);
  const prefix = pickRandom(PREFIXES[rarity]);
  const baseLvl = floor;

  let name: string;
  const modifier: StatModifier = {};
  let subtype: string | undefined;

  switch (actualSlot) {
    case 'weapon': {
      // Pick weapon category for variety
      const category = pickRandom(WEAPON_CATEGORIES);
      subtype = category;
      const baseName = pickRandom(WEAPON_NAMES[category]);
      name = `${prefix} ${baseName}`;
      modifier.flatDamage = Math.round((3 + floor * 2) * mult);

      // Category-specific bonuses
      switch (category) {
        case 'sword': // balanced
          if (rarity !== 'common') modifier.strength = Math.round((1 + floor * 0.5) * (mult - 0.5));
          break;
        case 'axe': // high damage
          modifier.flatDamage = Math.round(modifier.flatDamage * 1.15);
          if (rarity !== 'common') modifier.critChance = 0.01 * mult;
          break;
        case 'mace': // defense bonus
          if (rarity !== 'common')
            modifier.flatDefense = Math.round((1 + floor * 0.3) * (mult - 0.5));
          break;
        case 'dagger': // speed + crit
          modifier.flatDamage = Math.round(modifier.flatDamage * 0.85);
          modifier.attackSpeed = 0.03 * mult;
          if (rarity !== 'common') modifier.critChance = 0.02 * mult;
          break;
        case 'spear': // range feel (extra strength)
          if (rarity !== 'common') modifier.strength = Math.round((2 + floor * 0.4) * (mult - 0.5));
          break;
      }

      if (rarity === 'rare' || rarity === 'epic') {
        modifier.critChance = (modifier.critChance ?? 0) + 0.02 * mult;
      }
      if (rarity === 'epic') {
        modifier.attackSpeed = (modifier.attackSpeed ?? 0) + 0.05;
      }
      break;
    }
    case 'armor': {
      name = `${prefix} ${pickRandom(ARMOR_NAMES)}`;
      modifier.flatDefense = Math.round((2 + floor * 1.5) * mult);
      modifier.flatMaxHp = Math.round((5 + floor * 3) * mult);
      if (rarity !== 'common') {
        modifier.vitality = Math.round((1 + floor * 0.3) * (mult - 0.5));
      }
      if (rarity === 'epic') {
        modifier.hpRegen = 0.5;
      }
      break;
    }
    case 'ring': {
      name = `${prefix} ${pickRandom(RING_NAMES)}`;
      const statType = pickRandom(['agility', 'luck', 'strength', 'vitality'] as const);
      (modifier as Record<string, number>)[statType] = Math.round((2 + floor * 0.5) * mult);
      if (rarity !== 'common') {
        modifier.critChance = 0.01 * mult;
      }
      if (rarity === 'rare' || rarity === 'epic') {
        modifier.moveSpeed = 0.03 * mult;
      }
      break;
    }
  }

  return {
    id: `item_${nextItemId++}`,
    name,
    type: 'equipment',
    slot: actualSlot,
    rarity,
    level: baseLvl,
    modifier,
    ...(subtype !== undefined && { subtype }),
  };
}

function generatePotion(floor: number): Item {
  const roll = Math.random();

  if (roll < 0.55) {
    // Health potion (most common)
    const healAmount = 30 + floor * 10;
    return {
      id: `item_${nextItemId++}`,
      name: 'Health Potion',
      type: 'consumable',
      rarity: 'common',
      level: floor,
      modifier: {},
      consumeEffect: 'heal',
      consumeValue: healAmount,
    };
  } else if (roll < 0.75) {
    // Speed potion
    return {
      id: `item_${nextItemId++}`,
      name: 'Speed Elixir',
      type: 'consumable',
      rarity: 'uncommon',
      level: floor,
      modifier: {},
      consumeEffect: 'speedBoost',
      consumeValue: 50, // 50% speed boost
      consumeDuration: 10,
    };
  } else if (roll < 0.9) {
    // Strength potion
    return {
      id: `item_${nextItemId++}`,
      name: 'Might Tonic',
      type: 'consumable',
      rarity: 'uncommon',
      level: floor,
      modifier: {},
      consumeEffect: 'strengthBoost',
      consumeValue: 10 + floor * 3, // flat damage boost
      consumeDuration: 15,
    };
  } else {
    // Shield potion (absorbs damage)
    return {
      id: `item_${nextItemId++}`,
      name: 'Shield Draught',
      type: 'consumable',
      rarity: 'rare',
      level: floor,
      modifier: {},
      consumeEffect: 'manaShield',
      consumeValue: 40 + floor * 15, // shield HP
      consumeDuration: 20,
    };
  }
}

export function rollEnemyLoot(floor: number): Item[] {
  const items: Item[] = [];

  if (Math.random() < 0.3) {
    items.push(generateEquipment(floor));
  }

  if (Math.random() < 0.25) {
    items.push(generatePotion(floor));
  }

  return items;
}

export function rollChestLoot(floor: number): Item[] {
  const items: Item[] = [];
  items.push(generateEquipment(floor));
  if (Math.random() < 0.4) {
    items.push(generateEquipment(floor));
  }
  items.push(generatePotion(floor));
  return items;
}

/** Roll special loot for boss kills */
export function rollBossLoot(floor: number): Item[] {
  const items: Item[] = [];
  // Boss always drops 1-2 equipment and a potion
  items.push(generateEquipment(floor));
  if (Math.random() < 0.7) {
    items.push(generateEquipment(floor));
  }
  items.push(generatePotion(floor));
  return items;
}

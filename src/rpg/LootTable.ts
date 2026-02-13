/**
 * Item definitions, loot tables, and drop-rate logic.
 *
 * Items are equipment (weapon, armor, ring) or consumables (health potion).
 * Rarity tiers affect stat ranges. Higher floors drop better loot.
 */

import { StatModifier } from './Stats';

export type ItemSlot = 'weapon' | 'armor' | 'ring';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';
export type ItemType = 'equipment' | 'consumable';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  slot?: ItemSlot;           // only for equipment
  rarity: ItemRarity;
  level: number;             // item level (roughly = floor it dropped on)
  modifier: StatModifier;    // stat bonuses (empty for consumables)
  consumeEffect?: 'heal';    // only for consumables
  consumeValue?: number;     // heal amount
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
const WEAPON_NAMES = ['Sword', 'Axe', 'Mace', 'Dagger', 'Halberd', 'Cleaver'];
const ARMOR_NAMES = ['Chestplate', 'Chainmail', 'Tunic', 'Brigandine', 'Cuirass'];
const RING_NAMES = ['Band', 'Ring', 'Signet', 'Loop', 'Circle'];
const PREFIXES: Record<ItemRarity, string[]> = {
  common: ['Worn', 'Old', 'Simple'],
  uncommon: ['Sturdy', 'Polished', 'Fine'],
  rare: ['Enchanted', 'Gleaming', 'Masterwork'],
  epic: ['Legendary', 'Radiant', 'Mythic'],
};

let nextItemId = 1;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollRarity(floorBonus: number): ItemRarity {
  // Floor bonus shifts weights toward rarer items
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

  switch (actualSlot) {
    case 'weapon': {
      name = `${prefix} ${pickRandom(WEAPON_NAMES)}`;
      modifier.flatDamage = Math.round((3 + floor * 2) * mult);
      // secondary stat based on rarity
      if (rarity !== 'common') {
        modifier.strength = Math.round((1 + floor * 0.5) * (mult - 0.5));
      }
      if (rarity === 'rare' || rarity === 'epic') {
        modifier.critChance = 0.02 * mult;
      }
      if (rarity === 'epic') {
        modifier.attackSpeed = 0.05;
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
      // Rings give mixed utility stats
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
  };
}

function generatePotion(floor: number): Item {
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
}

/** Roll loot for a killed enemy on a given floor. May return empty array. */
export function rollEnemyLoot(floor: number): Item[] {
  const items: Item[] = [];

  // 30% chance to drop equipment
  if (Math.random() < 0.3) {
    items.push(generateEquipment(floor));
  }

  // 20% chance to drop a potion
  if (Math.random() < 0.2) {
    items.push(generatePotion(floor));
  }

  return items;
}

/** Generate loot for a treasure chest (always drops something) */
export function rollChestLoot(floor: number): Item[] {
  const items: Item[] = [];
  // Always 1 equipment, sometimes 2
  items.push(generateEquipment(floor));
  if (Math.random() < 0.4) {
    items.push(generateEquipment(floor));
  }
  // Always a potion
  items.push(generatePotion(floor));
  return items;
}

/**
 * Skill tree data and logic.
 *
 * A simple tree with 3 branches: Warrior (strength/damage), Guardian (vitality/defense),
 * and Scout (agility/crit). Each branch has 4 nodes, and there's a central starting node.
 */

import { StatModifier } from './Stats';

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  branch: 'warrior' | 'guardian' | 'scout';
  tier: number;               // 1-4, higher tier = deeper in branch
  maxRank: number;            // ranks purchasable (1-3)
  currentRank: number;
  requires: string | null;    // id of prerequisite node (null for tier-1)
  modifierPerRank: StatModifier;
}

function node(
  id: string,
  name: string,
  description: string,
  branch: 'warrior' | 'guardian' | 'scout',
  tier: number,
  maxRank: number,
  requires: string | null,
  modifierPerRank: StatModifier,
): SkillNode {
  return { id, name, description, branch, tier, maxRank, currentRank: 0, requires, modifierPerRank };
}

function createDefaultTree(): SkillNode[] {
  return [
    // --- Warrior branch (strength / damage) ---
    node('w1', 'Power Strike', '+3 attack per rank', 'warrior', 1, 3, null,
      { flatDamage: 3 }),
    node('w2', 'Brute Force', '+2 strength per rank', 'warrior', 2, 3, 'w1',
      { strength: 2 }),
    node('w3', 'Frenzy', '+8% attack speed per rank', 'warrior', 3, 2, 'w2',
      { attackSpeed: 0.08 }),
    node('w4', 'Executioner', '+5% crit chance, +5 attack', 'warrior', 4, 1, 'w3',
      { critChance: 0.05, flatDamage: 5 }),

    // --- Guardian branch (vitality / defense) ---
    node('g1', 'Tough Skin', '+3 defense per rank', 'guardian', 1, 3, null,
      { flatDefense: 3 }),
    node('g2', 'Vitality Boost', '+2 vitality per rank', 'guardian', 2, 3, 'g1',
      { vitality: 2 }),
    node('g3', 'Regeneration', '+0.5 HP/sec per rank', 'guardian', 3, 2, 'g2',
      { hpRegen: 0.5 }),
    node('g4', 'Fortress', '+30 max HP, +5 defense', 'guardian', 4, 1, 'g3',
      { flatMaxHp: 30, flatDefense: 5 }),

    // --- Scout branch (agility / crit / speed) ---
    node('s1', 'Quick Feet', '+5% move speed per rank', 'scout', 1, 3, null,
      { moveSpeed: 0.05 }),
    node('s2', 'Sharp Eyes', '+2% crit chance per rank', 'scout', 2, 3, 's1',
      { critChance: 0.02 }),
    node('s3', 'Agility Training', '+2 agility per rank', 'scout', 3, 2, 's2',
      { agility: 2 }),
    node('s4', 'Shadow Strike', '+10% attack speed, +3% crit', 'scout', 4, 1, 's3',
      { attackSpeed: 0.1, critChance: 0.03 }),
  ];
}

export class SkillTree {
  nodes: SkillNode[];

  constructor() {
    this.nodes = createDefaultTree();
  }

  getNode(id: string): SkillNode | undefined {
    return this.nodes.find(n => n.id === id);
  }

  /** Check if a node can be ranked up */
  canUnlock(id: string): boolean {
    const node = this.getNode(id);
    if (!node) return false;
    if (node.currentRank >= node.maxRank) return false;
    if (node.requires) {
      const req = this.getNode(node.requires);
      if (!req || req.currentRank <= 0) return false;
    }
    return true;
  }

  /** Rank up a node. Returns true if successful. */
  rankUp(id: string): boolean {
    if (!this.canUnlock(id)) return false;
    const node = this.getNode(id)!;
    node.currentRank++;
    return true;
  }

  /** Collect all stat modifiers from allocated skill points */
  getModifiers(): StatModifier[] {
    const mods: StatModifier[] = [];
    for (const node of this.nodes) {
      if (node.currentRank > 0) {
        const m = node.modifierPerRank;
        // Scale by rank
        const scaled: StatModifier = {};
        for (const key of Object.keys(m) as (keyof StatModifier)[]) {
          const val = m[key];
          if (val !== undefined) {
            (scaled as Record<string, number>)[key] = val * node.currentRank;
          }
        }
        mods.push(scaled);
      }
    }
    return mods;
  }

  /** Total skill points spent */
  get totalPointsSpent(): number {
    return this.nodes.reduce((sum, n) => sum + n.currentRank, 0);
  }

  /** Serialize for save */
  toJSON(): Record<string, number> {
    const data: Record<string, number> = {};
    for (const n of this.nodes) {
      if (n.currentRank > 0) data[n.id] = n.currentRank;
    }
    return data;
  }

  /** Restore from save */
  fromJSON(data: Record<string, number>): void {
    for (const n of this.nodes) {
      n.currentRank = data[n.id] ?? 0;
    }
  }
}

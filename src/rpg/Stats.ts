/**
 * Character stat calculations and modifiers.
 *
 * Base stats grow with level. Equipment and skill bonuses add flat modifiers.
 * Derived stats (damage, defense, maxHp, etc.) are computed from base stats + modifiers.
 */

export interface StatModifier {
  strength?: number;
  vitality?: number;
  agility?: number;
  luck?: number;
  flatDamage?: number;
  flatDefense?: number;
  flatMaxHp?: number;
  attackSpeed?: number;   // multiplier bonus (0.1 = +10%)
  moveSpeed?: number;     // multiplier bonus
  critChance?: number;    // flat addition (0.05 = +5%)
  hpRegen?: number;       // HP per second
}

export interface ComputedStats {
  strength: number;
  vitality: number;
  agility: number;
  luck: number;
  maxHp: number;
  attack: number;
  defense: number;
  attackSpeed: number;   // multiplier (1.0 = normal)
  moveSpeed: number;     // multiplier
  critChance: number;    // 0-1
  critMultiplier: number;
  hpRegen: number;
}

const BASE_HP = 100;
const HP_PER_VITALITY = 10;
const ATTACK_PER_STRENGTH = 2;
const DEFENSE_PER_VITALITY = 0.5;
const CRIT_PER_LUCK = 0.005;    // 0.5% per luck
const SPEED_PER_AGILITY = 0.01; // 1% per agility

export class PlayerStats {
  // Base stats (grow with level)
  baseStrength = 5;
  baseVitality = 5;
  baseAgility = 5;
  baseLuck = 3;

  // Per-level growth
  private readonly strengthPerLevel = 1;
  private readonly vitalityPerLevel = 1;
  private readonly agilityPerLevel = 0.5;
  private readonly luckPerLevel = 0.3;

  /** Accumulate all modifiers from equipment + skills */
  private modifiers: StatModifier[] = [];

  setModifiers(mods: StatModifier[]): void {
    this.modifiers = mods;
  }

  compute(level: number): ComputedStats {
    // Level-scaled base stats
    const lvlBonus = level - 1;
    let str = this.baseStrength + lvlBonus * this.strengthPerLevel;
    let vit = this.baseVitality + lvlBonus * this.vitalityPerLevel;
    let agi = this.baseAgility + lvlBonus * this.agilityPerLevel;
    let lck = this.baseLuck + lvlBonus * this.luckPerLevel;

    let flatDamage = 0;
    let flatDefense = 0;
    let flatMaxHp = 0;
    let attackSpeedBonus = 0;
    let moveSpeedBonus = 0;
    let critBonus = 0;
    let hpRegen = 0;

    for (const m of this.modifiers) {
      str += m.strength ?? 0;
      vit += m.vitality ?? 0;
      agi += m.agility ?? 0;
      lck += m.luck ?? 0;
      flatDamage += m.flatDamage ?? 0;
      flatDefense += m.flatDefense ?? 0;
      flatMaxHp += m.flatMaxHp ?? 0;
      attackSpeedBonus += m.attackSpeed ?? 0;
      moveSpeedBonus += m.moveSpeed ?? 0;
      critBonus += m.critChance ?? 0;
      hpRegen += m.hpRegen ?? 0;
    }

    str = Math.floor(str);
    vit = Math.floor(vit);
    agi = Math.floor(agi);
    lck = Math.floor(lck);

    const maxHp = BASE_HP + vit * HP_PER_VITALITY + flatMaxHp;
    const attack = str * ATTACK_PER_STRENGTH + flatDamage;
    const defense = vit * DEFENSE_PER_VITALITY + flatDefense;
    const attackSpeed = 1 + attackSpeedBonus + agi * SPEED_PER_AGILITY;
    const moveSpeed = 1 + moveSpeedBonus + agi * SPEED_PER_AGILITY;
    const critChance = Math.min(0.5, lck * CRIT_PER_LUCK + critBonus);
    const critMultiplier = 1.5 + lck * 0.01;

    return {
      strength: str,
      vitality: vit,
      agility: agi,
      luck: lck,
      maxHp: Math.round(maxHp),
      attack: Math.round(attack),
      defense: Math.round(defense),
      attackSpeed: Math.round(attackSpeed * 100) / 100,
      moveSpeed: Math.round(moveSpeed * 100) / 100,
      critChance: Math.round(critChance * 1000) / 1000,
      critMultiplier: Math.round(critMultiplier * 100) / 100,
      hpRegen,
    };
  }
}

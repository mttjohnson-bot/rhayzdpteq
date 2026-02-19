/**
 * ObstacleSystem manages runtime effects of dungeon obstacles on entities
 * (player and enemies). It checks entity positions against the obstacle grid
 * and applies effects like slowing, weakening, burning, and trap explosions.
 */

import { TILE_SIZE } from '../utils/constants';
import { DungeonData, ObstacleType, trapKey } from './DungeonGenerator';
import { events } from '../utils/EventBus';

/** Status effect flags applied to an entity each frame. */
export interface ObstacleEffects {
  /** Speed multiplier (1.0 = normal, < 1.0 = slowed). */
  speedMult: number;
  /** Damage multiplier (1.0 = normal, < 1.0 = weakened). */
  damageMult: number;
  /** Damage-per-second from environmental hazards (fire). */
  burnDps: number;
}

const NO_EFFECTS: ObstacleEffects = { speedMult: 1, damageMult: 1, burnDps: 0 };

// Obstacle tuning constants
const MUD_SPEED_MULT = 0.45;
const WATER_DAMAGE_MULT = 0.5;
const FIRE_DPS = 12;          // damage per second while standing in fire
const TRAP_DAMAGE = 40;       // one-time explosion damage

export class ObstacleSystem {
  private dungeon: DungeonData | null = null;
  private offsetX = 0;
  private offsetZ = 0;

  setDungeon(dungeon: DungeonData | null): void {
    this.dungeon = dungeon;
    if (dungeon) {
      this.offsetX = -(dungeon.width * TILE_SIZE) / 2;
      this.offsetZ = -(dungeon.height * TILE_SIZE) / 2;
    }
  }

  /**
   * Returns the obstacle at a given world position, or ObstacleType.None.
   */
  getObstacleAt(worldX: number, worldZ: number): ObstacleType {
    if (!this.dungeon) return ObstacleType.None;

    const tileX = Math.floor((worldX - this.offsetX) / TILE_SIZE);
    const tileZ = Math.floor((worldZ - this.offsetZ) / TILE_SIZE);

    if (tileX < 0 || tileX >= this.dungeon.width ||
        tileZ < 0 || tileZ >= this.dungeon.height) {
      return ObstacleType.None;
    }

    return this.dungeon.obstacles[tileZ][tileX];
  }

  /**
   * Gets the passive obstacle effects (speed/damage modifiers) at a world position.
   * Does NOT handle traps — call checkTrap separately for one-time triggers.
   */
  getEffectsAt(worldX: number, worldZ: number): ObstacleEffects {
    const obstacle = this.getObstacleAt(worldX, worldZ);

    switch (obstacle) {
      case ObstacleType.Mud:
        return { speedMult: MUD_SPEED_MULT, damageMult: 1, burnDps: 0 };
      case ObstacleType.Water:
        return { speedMult: 1, damageMult: WATER_DAMAGE_MULT, burnDps: 0 };
      case ObstacleType.Fire:
        return { speedMult: 1, damageMult: 1, burnDps: FIRE_DPS };
      default:
        return NO_EFFECTS;
    }
  }

  /**
   * Checks for a trap at the given world position and triggers it if not already
   * triggered. Returns the damage dealt (0 if no trap or already triggered).
   */
  checkTrap(worldX: number, worldZ: number): number {
    if (!this.dungeon) return 0;

    const tileX = Math.floor((worldX - this.offsetX) / TILE_SIZE);
    const tileZ = Math.floor((worldZ - this.offsetZ) / TILE_SIZE);

    if (tileX < 0 || tileX >= this.dungeon.width ||
        tileZ < 0 || tileZ >= this.dungeon.height) {
      return 0;
    }

    if (this.dungeon.obstacles[tileZ][tileX] !== ObstacleType.Trap) return 0;

    const key = trapKey(tileX, tileZ);
    if (this.dungeon.triggeredTraps.has(key)) return 0;

    // Trigger the trap
    this.dungeon.triggeredTraps.add(key);

    // Emit explosion visual event
    const worldTileX = tileX * TILE_SIZE + this.offsetX + TILE_SIZE / 2;
    const worldTileZ = tileZ * TILE_SIZE + this.offsetZ + TILE_SIZE / 2;
    events.emit('trapExploded', worldTileX, worldTileZ);

    return TRAP_DAMAGE;
  }
}

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ObstacleSystem } from '../../src/dungeon/ObstacleSystem';
import { ObstacleType, TileType } from '../../src/dungeon/types';
import { TILE_SIZE } from '../../src/utils/constants';
import { events } from '../../src/utils/EventBus';
import type { DungeonData } from '../../src/dungeon/DungeonGenerator';

function makeDungeon(width: number, height: number): DungeonData {
  const tiles: TileType[][] = [];
  const obstacles: ObstacleType[][] = [];
  for (let z = 0; z < height; z++) {
    tiles[z] = new Array(width).fill(TileType.Floor);
    obstacles[z] = new Array(width).fill(ObstacleType.None);
  }
  return {
    width,
    height,
    tiles,
    obstacles,
    triggeredTraps: new Set<string>(),
    rooms: [],
    entranceRoom: { id: 0, x: 0, z: 0, width: 5, height: 5, centerX: 2, centerZ: 2, connected: true },
    exitRoom: { id: 1, x: 5, z: 5, width: 5, height: 5, centerX: 7, centerZ: 7, connected: true },
  };
}

/** Convert tile coordinates to world coordinates (center of tile). */
function tileToWorld(tileX: number, tileZ: number, width: number, height: number): [number, number] {
  const offsetX = -(width * TILE_SIZE) / 2;
  const offsetZ = -(height * TILE_SIZE) / 2;
  return [tileX * TILE_SIZE + offsetX + TILE_SIZE / 2, tileZ * TILE_SIZE + offsetZ + TILE_SIZE / 2];
}

describe('ObstacleSystem', () => {
  let system: ObstacleSystem;

  beforeEach(() => {
    system = new ObstacleSystem();
    events.clear();
  });

  describe('with no dungeon set', () => {
    it('getObstacleAt returns None', () => {
      expect(system.getObstacleAt(0, 0)).toBe(ObstacleType.None);
    });

    it('getEffectsAt returns no effects', () => {
      const effects = system.getEffectsAt(0, 0);
      expect(effects.speedMult).toBe(1);
      expect(effects.damageMult).toBe(1);
      expect(effects.burnDps).toBe(0);
    });

    it('checkTrap returns 0', () => {
      expect(system.checkTrap(0, 0)).toBe(0);
    });
  });

  describe('getObstacleAt', () => {
    it('returns obstacle at tile position', () => {
      const dungeon = makeDungeon(10, 10);
      dungeon.obstacles[3][5] = ObstacleType.Mud;
      system.setDungeon(dungeon);

      const [wx, wz] = tileToWorld(5, 3, 10, 10);
      expect(system.getObstacleAt(wx, wz)).toBe(ObstacleType.Mud);
    });

    it('returns None for out-of-bounds positions', () => {
      const dungeon = makeDungeon(10, 10);
      system.setDungeon(dungeon);
      expect(system.getObstacleAt(-1000, -1000)).toBe(ObstacleType.None);
      expect(system.getObstacleAt(1000, 1000)).toBe(ObstacleType.None);
    });

    it('returns None for tiles without obstacles', () => {
      const dungeon = makeDungeon(10, 10);
      system.setDungeon(dungeon);
      const [wx, wz] = tileToWorld(0, 0, 10, 10);
      expect(system.getObstacleAt(wx, wz)).toBe(ObstacleType.None);
    });
  });

  describe('getEffectsAt - Mud', () => {
    it('applies speed reduction', () => {
      const dungeon = makeDungeon(10, 10);
      dungeon.obstacles[3][5] = ObstacleType.Mud;
      system.setDungeon(dungeon);

      const [wx, wz] = tileToWorld(5, 3, 10, 10);
      const effects = system.getEffectsAt(wx, wz);
      expect(effects.speedMult).toBe(0.45);
      expect(effects.damageMult).toBe(1);
      expect(effects.burnDps).toBe(0);
    });
  });

  describe('getEffectsAt - Water', () => {
    it('applies damage reduction', () => {
      const dungeon = makeDungeon(10, 10);
      dungeon.obstacles[4][6] = ObstacleType.Water;
      system.setDungeon(dungeon);

      const [wx, wz] = tileToWorld(6, 4, 10, 10);
      const effects = system.getEffectsAt(wx, wz);
      expect(effects.speedMult).toBe(1);
      expect(effects.damageMult).toBe(0.5);
      expect(effects.burnDps).toBe(0);
    });
  });

  describe('getEffectsAt - Fire', () => {
    it('applies burn DPS', () => {
      const dungeon = makeDungeon(10, 10);
      dungeon.obstacles[2][2] = ObstacleType.Fire;
      system.setDungeon(dungeon);

      const [wx, wz] = tileToWorld(2, 2, 10, 10);
      const effects = system.getEffectsAt(wx, wz);
      expect(effects.speedMult).toBe(1);
      expect(effects.damageMult).toBe(1);
      expect(effects.burnDps).toBe(12);
    });
  });

  describe('getEffectsAt - normal tiles', () => {
    it('returns no effects on normal tiles', () => {
      const dungeon = makeDungeon(10, 10);
      system.setDungeon(dungeon);

      const [wx, wz] = tileToWorld(5, 5, 10, 10);
      const effects = system.getEffectsAt(wx, wz);
      expect(effects.speedMult).toBe(1);
      expect(effects.damageMult).toBe(1);
      expect(effects.burnDps).toBe(0);
    });

    it('returns no effects for Furniture obstacles', () => {
      const dungeon = makeDungeon(10, 10);
      dungeon.obstacles[1][1] = ObstacleType.Furniture;
      system.setDungeon(dungeon);

      const [wx, wz] = tileToWorld(1, 1, 10, 10);
      const effects = system.getEffectsAt(wx, wz);
      expect(effects.speedMult).toBe(1);
      expect(effects.damageMult).toBe(1);
      expect(effects.burnDps).toBe(0);
    });
  });

  describe('checkTrap', () => {
    it('deals one-time explosion damage on first trigger', () => {
      const dungeon = makeDungeon(10, 10);
      dungeon.obstacles[5][5] = ObstacleType.Trap;
      system.setDungeon(dungeon);

      const [wx, wz] = tileToWorld(5, 5, 10, 10);
      const damage = system.checkTrap(wx, wz);
      expect(damage).toBe(40);
    });

    it('does not trigger twice', () => {
      const dungeon = makeDungeon(10, 10);
      dungeon.obstacles[5][5] = ObstacleType.Trap;
      system.setDungeon(dungeon);

      const [wx, wz] = tileToWorld(5, 5, 10, 10);
      system.checkTrap(wx, wz);
      const secondDamage = system.checkTrap(wx, wz);
      expect(secondDamage).toBe(0);
    });

    it('returns 0 for non-trap tiles', () => {
      const dungeon = makeDungeon(10, 10);
      dungeon.obstacles[3][3] = ObstacleType.Mud;
      system.setDungeon(dungeon);

      const [wx, wz] = tileToWorld(3, 3, 10, 10);
      expect(system.checkTrap(wx, wz)).toBe(0);
    });

    it('returns 0 for out-of-bounds', () => {
      const dungeon = makeDungeon(10, 10);
      system.setDungeon(dungeon);
      expect(system.checkTrap(-1000, -1000)).toBe(0);
    });

    it('emits trapExploded event on trigger', () => {
      const listener = vi.fn();
      events.on('trapExploded', listener);

      const dungeon = makeDungeon(10, 10);
      dungeon.obstacles[5][5] = ObstacleType.Trap;
      system.setDungeon(dungeon);

      const [wx, wz] = tileToWorld(5, 5, 10, 10);
      system.checkTrap(wx, wz);
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('setDungeon', () => {
    it('can clear dungeon by setting null', () => {
      const dungeon = makeDungeon(10, 10);
      system.setDungeon(dungeon);
      system.setDungeon(null);
      expect(system.getObstacleAt(0, 0)).toBe(ObstacleType.None);
    });
  });
});

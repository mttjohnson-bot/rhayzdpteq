import { describe, it, expect } from 'vitest';
import { generateDungeon, trapKey } from '../../src/dungeon/DungeonGenerator';
import { TileType, ObstacleType } from '../../src/dungeon/types';
import { getFloorConfig } from '../../src/dungeon/FloorConfig';

describe('generateDungeon', () => {
  // Use a fixed seed for deterministic tests
  const SEED = 42;

  describe('basic structure', () => {
    it('returns a valid DungeonData object', () => {
      const dungeon = generateDungeon(1, SEED);
      expect(dungeon).toBeDefined();
      expect(dungeon.width).toBeGreaterThan(0);
      expect(dungeon.height).toBeGreaterThan(0);
      expect(dungeon.tiles).toBeDefined();
      expect(dungeon.obstacles).toBeDefined();
      expect(dungeon.rooms).toBeDefined();
      expect(dungeon.entranceRoom).toBeDefined();
      expect(dungeon.exitRoom).toBeDefined();
      expect(dungeon.triggeredTraps).toBeInstanceOf(Set);
    });

    it('grid dimensions match floor config', () => {
      for (let floor = 1; floor <= 5; floor++) {
        const config = getFloorConfig(floor);
        const dungeon = generateDungeon(floor, SEED + floor);
        expect(dungeon.width).toBe(config.difficulty.gridSize);
        expect(dungeon.height).toBe(config.difficulty.gridSize);
      }
    });

    it('tile grid has correct dimensions', () => {
      const dungeon = generateDungeon(1, SEED);
      expect(dungeon.tiles.length).toBe(dungeon.height);
      for (const row of dungeon.tiles) {
        expect(row.length).toBe(dungeon.width);
      }
    });

    it('obstacle grid has correct dimensions', () => {
      const dungeon = generateDungeon(1, SEED);
      expect(dungeon.obstacles.length).toBe(dungeon.height);
      for (const row of dungeon.obstacles) {
        expect(row.length).toBe(dungeon.width);
      }
    });
  });

  describe('room generation', () => {
    it('generates rooms within expected count range', () => {
      for (let floor = 1; floor <= 5; floor++) {
        const config = getFloorConfig(floor);
        const dungeon = generateDungeon(floor, SEED + floor);
        // Must have at least 2 rooms (entrance + exit)
        expect(dungeon.rooms.length).toBeGreaterThanOrEqual(2);
        // Should not exceed configured room count
        expect(dungeon.rooms.length).toBeLessThanOrEqual(config.difficulty.roomCountBase);
      }
    });

    it('rooms do not overlap', () => {
      const dungeon = generateDungeon(1, SEED);
      const PADDING = 3;
      for (let i = 0; i < dungeon.rooms.length; i++) {
        for (let j = i + 1; j < dungeon.rooms.length; j++) {
          const a = dungeon.rooms[i];
          const b = dungeon.rooms[j];
          const overlapX =
            a.x - PADDING < b.x + b.width && a.x + a.width + PADDING > b.x;
          const overlapZ =
            a.z - PADDING < b.z + b.height && a.z + a.height + PADDING > b.z;
          expect(overlapX && overlapZ).toBe(false);
        }
      }
    });

    it('rooms are within grid bounds', () => {
      const dungeon = generateDungeon(1, SEED);
      for (const room of dungeon.rooms) {
        expect(room.x).toBeGreaterThanOrEqual(0);
        expect(room.z).toBeGreaterThanOrEqual(0);
        expect(room.x + room.width).toBeLessThanOrEqual(dungeon.width);
        expect(room.z + room.height).toBeLessThanOrEqual(dungeon.height);
      }
    });
  });

  describe('boss room', () => {
    it('has a boss room', () => {
      const dungeon = generateDungeon(1, SEED);
      const bossRoom = dungeon.rooms.find((r) => r.isBossRoom);
      expect(bossRoom).toBeDefined();
    });

    it('exit room is the boss room', () => {
      const dungeon = generateDungeon(1, SEED);
      expect(dungeon.exitRoom.isBossRoom).toBe(true);
    });
  });

  describe('connectivity', () => {
    it('all rooms are connected', () => {
      const dungeon = generateDungeon(1, SEED);
      for (const room of dungeon.rooms) {
        expect(room.connected).toBe(true);
      }
    });

    it('entrance and exit rooms are different', () => {
      const dungeon = generateDungeon(1, SEED);
      expect(dungeon.entranceRoom.id).not.toBe(dungeon.exitRoom.id);
    });
  });

  describe('tile types', () => {
    it('contains entrance and exit tiles', () => {
      const dungeon = generateDungeon(1, SEED);
      let hasEntrance = false;
      let hasExit = false;

      for (const row of dungeon.tiles) {
        for (const tile of row) {
          if (tile === TileType.Entrance) hasEntrance = true;
          if (tile === TileType.Exit) hasExit = true;
        }
      }

      expect(hasEntrance).toBe(true);
      expect(hasExit).toBe(true);
    });

    it('only contains valid tile types', () => {
      const dungeon = generateDungeon(1, SEED);
      const validTypes = new Set([
        TileType.Empty,
        TileType.Floor,
        TileType.Wall,
        TileType.Door,
        TileType.Exit,
        TileType.Entrance,
      ]);

      for (const row of dungeon.tiles) {
        for (const tile of row) {
          expect(validTypes.has(tile)).toBe(true);
        }
      }
    });

    it('entrance tile is at entrance room center', () => {
      const dungeon = generateDungeon(1, SEED);
      const tile = dungeon.tiles[dungeon.entranceRoom.centerZ][dungeon.entranceRoom.centerX];
      expect(tile).toBe(TileType.Entrance);
    });

    it('exit tile is at exit room center', () => {
      const dungeon = generateDungeon(1, SEED);
      const tile = dungeon.tiles[dungeon.exitRoom.centerZ][dungeon.exitRoom.centerX];
      expect(tile).toBe(TileType.Exit);
    });

    it('has walls surrounding floor tiles', () => {
      const dungeon = generateDungeon(1, SEED);
      const walkable = new Set([TileType.Floor, TileType.Door, TileType.Entrance, TileType.Exit]);
      let wallCount = 0;
      let floorCount = 0;

      for (const row of dungeon.tiles) {
        for (const tile of row) {
          if (tile === TileType.Wall) wallCount++;
          if (walkable.has(tile)) floorCount++;
        }
      }

      expect(wallCount).toBeGreaterThan(0);
      expect(floorCount).toBeGreaterThan(0);
    });
  });

  describe('exit reachability', () => {
    it('exit tile is reachable from entrance via walkable tiles', () => {
      const dungeon = generateDungeon(1, SEED);
      const walkable = new Set([TileType.Floor, TileType.Door, TileType.Entrance, TileType.Exit]);

      // BFS from entrance to exit
      const visited = new Set<string>();
      const queue: [number, number][] = [
        [dungeon.entranceRoom.centerX, dungeon.entranceRoom.centerZ],
      ];
      visited.add(`${dungeon.entranceRoom.centerX},${dungeon.entranceRoom.centerZ}`);

      const targetX = dungeon.exitRoom.centerX;
      const targetZ = dungeon.exitRoom.centerZ;
      let found = false;

      while (queue.length > 0) {
        const [x, z] = queue.shift()!;
        if (x === targetX && z === targetZ) {
          found = true;
          break;
        }

        for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nx = x + dx;
          const nz = z + dz;
          const key = `${nx},${nz}`;
          if (
            nx >= 0 &&
            nx < dungeon.width &&
            nz >= 0 &&
            nz < dungeon.height &&
            !visited.has(key) &&
            walkable.has(dungeon.tiles[nz][nx])
          ) {
            visited.add(key);
            queue.push([nx, nz]);
          }
        }
      }

      expect(found).toBe(true);
    });
  });

  describe('deterministic with seed', () => {
    it('produces the same dungeon with the same seed', () => {
      const d1 = generateDungeon(1, 12345);
      const d2 = generateDungeon(1, 12345);

      expect(d1.rooms.length).toBe(d2.rooms.length);
      expect(d1.entranceRoom.id).toBe(d2.entranceRoom.id);
      expect(d1.exitRoom.id).toBe(d2.exitRoom.id);

      // Compare a sample of tiles
      for (let z = 0; z < Math.min(50, d1.height); z++) {
        for (let x = 0; x < Math.min(50, d1.width); x++) {
          expect(d1.tiles[z][x]).toBe(d2.tiles[z][x]);
        }
      }
    });

    it('produces different dungeons with different seeds', () => {
      const d1 = generateDungeon(1, 100);
      const d2 = generateDungeon(1, 200);

      // At least some tiles should differ
      let differences = 0;
      for (let z = 0; z < Math.min(50, d1.height); z++) {
        for (let x = 0; x < Math.min(50, d1.width); x++) {
          if (d1.tiles[z][x] !== d2.tiles[z][x]) differences++;
        }
      }
      expect(differences).toBeGreaterThan(0);
    });
  });

  describe('obstacles', () => {
    it('floors with obstacle config have obstacles', () => {
      // Floor 6+ have obstacle configs
      let hasObstacles = false;
      for (let i = 0; i < 10; i++) {
        const dungeon = generateDungeon(7, SEED + i);
        for (const row of dungeon.obstacles) {
          for (const obs of row) {
            if (obs !== ObstacleType.None) {
              hasObstacles = true;
            }
          }
        }
        if (hasObstacles) break;
      }
      expect(hasObstacles).toBe(true);
    });

    it('floors 1-5 may not have obstacles (no obstacle config)', () => {
      const config = getFloorConfig(1);
      expect(config.obstacleConfig).toBeUndefined();
    });
  });
});

describe('trapKey', () => {
  it('returns formatted string', () => {
    expect(trapKey(5, 10)).toBe('5,10');
  });

  it('returns unique keys for different positions', () => {
    expect(trapKey(1, 2)).not.toBe(trapKey(2, 1));
  });
});

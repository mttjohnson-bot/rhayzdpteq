import { TILE_SIZE } from '../utils/constants';
import { getFloorConfig, ObstacleConfig } from './FloorConfig';

export interface Room {
  id: number;
  x: number; // top-left tile x
  z: number; // top-left tile z
  width: number; // in tiles
  height: number; // in tiles (depth)
  centerX: number;
  centerZ: number;
  connected: boolean;
  isBossRoom?: boolean;
}

export interface Corridor {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

export enum TileType {
  Empty = 0,
  Floor = 1,
  Wall = 2,
  Door = 3,
  Exit = 4,
  Entrance = 5,
}

export enum ObstacleType {
  None = 0,
  Furniture = 1,  // Solid object, blocks movement
  Water = 2,      // Weakens player/enemy on contact (reduced damage)
  Mud = 3,        // Slows player/enemy on contact
  Fire = 4,       // Burns player/enemy on contact (periodic damage)
  Trap = 5,       // Explodes on contact (one-time burst damage)
}

export interface DungeonData {
  width: number;
  height: number;
  tiles: TileType[][];
  obstacles: ObstacleType[][];
  triggeredTraps: Set<string>;
  rooms: Room[];
  entranceRoom: Room;
  exitRoom: Room;
}

const ROOM_PADDING = 3; // min gap between rooms
const MAX_PLACEMENT_ATTEMPTS = 2000;

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function generateDungeon(floor: number, seed?: number): DungeonData {
  const rng = seededRandom(seed ?? (Date.now() + floor * 9973));

  const config = getFloorConfig(floor);
  const diff = config.difficulty;
  const roomCount = diff.roomCountBase;
  const gridWidth = diff.gridSize;
  const gridHeight = diff.gridSize;

  // Initialize grids
  const tiles: TileType[][] = [];
  const obstacles: ObstacleType[][] = [];
  for (let z = 0; z < gridHeight; z++) {
    tiles[z] = new Array(gridWidth).fill(TileType.Empty);
    obstacles[z] = new Array(gridWidth).fill(ObstacleType.None);
  }

  const rooms: Room[] = [];

  // Place boss room first (largest room, near far edge)
  const bossSize = diff.bossRoomSize;
  const bossX = randInt(rng, gridWidth - bossSize - ROOM_PADDING * 2, gridWidth - bossSize - ROOM_PADDING);
  const bossZ = randInt(rng, gridHeight - bossSize - ROOM_PADDING * 2, gridHeight - bossSize - ROOM_PADDING);
  const bossRoom: Room = {
    id: 0,
    x: Math.max(ROOM_PADDING, bossX),
    z: Math.max(ROOM_PADDING, bossZ),
    width: bossSize,
    height: bossSize,
    centerX: 0,
    centerZ: 0,
    connected: false,
    isBossRoom: true,
  };
  bossRoom.centerX = Math.floor(bossRoom.x + bossRoom.width / 2);
  bossRoom.centerZ = Math.floor(bossRoom.z + bossRoom.height / 2);
  rooms.push(bossRoom);
  carveRoom(tiles, bossRoom, gridWidth, gridHeight);

  // Place regular rooms with varied shapes
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && rooms.length < roomCount; attempt++) {
    const w = randInt(rng, diff.minRoomSize, diff.maxRoomSize);
    const h = randInt(rng, diff.minRoomSize, diff.maxRoomSize);
    const x = randInt(rng, ROOM_PADDING, gridWidth - w - ROOM_PADDING);
    const z = randInt(rng, ROOM_PADDING, gridHeight - h - ROOM_PADDING);

    if (overlapsAny(rooms, x, z, w, h)) continue;

    const room: Room = {
      id: rooms.length,
      x,
      z,
      width: w,
      height: h,
      centerX: Math.floor(x + w / 2),
      centerZ: Math.floor(z + h / 2),
      connected: false,
    };
    rooms.push(room);
    carveRoom(tiles, room, gridWidth, gridHeight);

    // Add obstructions (pillars) in larger rooms
    if (w >= 10 && h >= 10 && rng() < 0.6) {
      addPillars(tiles, room, rng);
    }
  }

  if (rooms.length < 2) {
    // Fallback: ensure at least 2 rooms
    const fallbackRooms: [number, number, number, number][] = [
      [2, 2, 8, 8],
      [gridWidth - 12, gridHeight - 12, 8, 8],
    ];
    for (const [fx, fz, fw, fh] of fallbackRooms) {
      if (rooms.length >= 2) break;
      const room: Room = {
        id: rooms.length,
        x: fx, z: fz, width: fw, height: fh,
        centerX: fx + 4, centerZ: fz + 4,
        connected: false,
      };
      rooms.push(room);
      carveRoom(tiles, room, gridWidth, gridHeight);
    }
  }

  // Connect rooms with wider corridors (minimum spanning tree approach)
  connectRooms(rooms, tiles, rng, gridWidth, gridHeight, diff.corridorWidth);

  // Add walls around all floor tiles
  addWalls(tiles, gridWidth, gridHeight);

  // Place doors where corridors meet rooms
  placeDoors(rooms, tiles, gridWidth, gridHeight);

  // Choose entrance and exit rooms (farthest apart, exit = boss room)
  const [entranceRoom, exitRoom] = pickEntranceExit(rooms);

  // Mark entrance and exit tiles
  tiles[entranceRoom.centerZ][entranceRoom.centerX] = TileType.Entrance;
  tiles[exitRoom.centerZ][exitRoom.centerX] = TileType.Exit;

  // Place obstacles in rooms
  const obstacleConfig = config.obstacleConfig;
  if (obstacleConfig && obstacleConfig.types.length > 0) {
    placeObstacles(rooms, tiles, obstacles, rng, gridWidth, gridHeight, obstacleConfig, entranceRoom, exitRoom);
  }

  const triggeredTraps = new Set<string>();
  return { width: gridWidth, height: gridHeight, tiles, obstacles, triggeredTraps, rooms, entranceRoom, exitRoom };
}

function carveRoom(tiles: TileType[][], room: Room, gridWidth: number, gridHeight: number): void {
  for (let rz = room.z; rz < room.z + room.height; rz++) {
    for (let rx = room.x; rx < room.x + room.width; rx++) {
      if (rz >= 0 && rz < gridHeight && rx >= 0 && rx < gridWidth) {
        tiles[rz][rx] = TileType.Floor;
      }
    }
  }
}

function addPillars(tiles: TileType[][], room: Room, rng: () => number): void {
  // Add 2-4 pillars (wall tiles) inside large rooms for cover
  const count = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < count; i++) {
    const px = room.x + 2 + Math.floor(rng() * (room.width - 4));
    const pz = room.z + 2 + Math.floor(rng() * (room.height - 4));
    // Don't place on center (where entrance/exit might go)
    if (px === room.centerX && pz === room.centerZ) continue;
    tiles[pz][px] = TileType.Wall;
  }
}

function overlapsAny(rooms: Room[], x: number, z: number, w: number, h: number): boolean {
  for (const r of rooms) {
    if (
      x - ROOM_PADDING < r.x + r.width &&
      x + w + ROOM_PADDING > r.x &&
      z - ROOM_PADDING < r.z + r.height &&
      z + h + ROOM_PADDING > r.z
    ) {
      return true;
    }
  }
  return false;
}

function connectRooms(
  rooms: Room[],
  tiles: TileType[][],
  rng: () => number,
  gridWidth: number,
  gridHeight: number,
  corridorWidth: number,
): void {
  if (rooms.length === 0) return;

  // Prim's-like: start from room 0, greedily connect closest unconnected
  rooms[0].connected = true;
  const connected = [rooms[0]];
  const remaining = rooms.slice(1);

  while (remaining.length > 0) {
    let bestDist = Infinity;
    let bestConnected: Room | null = null;
    let bestRemaining: Room | null = null;
    let bestIdx = -1;

    for (const c of connected) {
      for (let i = 0; i < remaining.length; i++) {
        const r = remaining[i];
        const dist = Math.abs(c.centerX - r.centerX) + Math.abs(c.centerZ - r.centerZ);
        if (dist < bestDist) {
          bestDist = dist;
          bestConnected = c;
          bestRemaining = r;
          bestIdx = i;
        }
      }
    }

    if (bestConnected && bestRemaining) {
      carveCorridor(bestConnected, bestRemaining, tiles, rng, gridWidth, gridHeight, corridorWidth);
      bestRemaining.connected = true;
      connected.push(bestRemaining);
      remaining.splice(bestIdx, 1);
    }
  }
}

function carveCorridor(
  a: Room,
  b: Room,
  tiles: TileType[][],
  rng: () => number,
  gridWidth: number,
  gridHeight: number,
  corridorWidth: number,
): void {
  let x = a.centerX;
  let z = a.centerZ;
  const tx = b.centerX;
  const tz = b.centerZ;
  const halfW = Math.floor(corridorWidth / 2);

  const horizontalFirst = rng() > 0.5;

  if (horizontalFirst) {
    // Horizontal leg
    while (x !== tx) {
      carveCorridorTile(tiles, x, z, halfW, gridWidth, gridHeight);
      x += tx > x ? 1 : -1;
    }
    // Vertical leg
    while (z !== tz) {
      carveCorridorTile(tiles, x, z, halfW, gridWidth, gridHeight);
      z += tz > z ? 1 : -1;
    }
  } else {
    // Vertical leg first
    while (z !== tz) {
      carveCorridorTile(tiles, x, z, halfW, gridWidth, gridHeight);
      z += tz > z ? 1 : -1;
    }
    // Horizontal leg
    while (x !== tx) {
      carveCorridorTile(tiles, x, z, halfW, gridWidth, gridHeight);
      x += tx > x ? 1 : -1;
    }
  }

  // Mark the final tile
  carveCorridorTile(tiles, x, z, halfW, gridWidth, gridHeight);
}

function carveCorridorTile(
  tiles: TileType[][],
  cx: number, cz: number,
  halfW: number,
  gridWidth: number, gridHeight: number,
): void {
  for (let dz = -halfW; dz <= halfW; dz++) {
    for (let dx = -halfW; dx <= halfW; dx++) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx >= 0 && nx < gridWidth && nz >= 0 && nz < gridHeight) {
        if (tiles[nz][nx] === TileType.Empty) {
          tiles[nz][nx] = TileType.Floor;
        }
      }
    }
  }
}

function addWalls(tiles: TileType[][], width: number, height: number): void {
  const directions = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0],           [1, 0],
    [-1, 1],  [0, 1],  [1, 1],
  ];

  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      if (tiles[z][x] !== TileType.Empty) continue;
      for (const [dx, dz] of directions) {
        const nx = x + dx;
        const nz = z + dz;
        if (nx >= 0 && nx < width && nz >= 0 && nz < height) {
          const neighbor = tiles[nz][nx];
          if (neighbor === TileType.Floor || neighbor === TileType.Door ||
              neighbor === TileType.Exit || neighbor === TileType.Entrance) {
            tiles[z][x] = TileType.Wall;
            break;
          }
        }
      }
    }
  }
}

function placeDoors(rooms: Room[], tiles: TileType[][], width: number, height: number): void {
  for (const room of rooms) {
    const edges: [number, number][] = [];

    for (let x = room.x; x < room.x + room.width; x++) {
      edges.push([x, room.z]);
      edges.push([x, room.z + room.height - 1]);
    }
    for (let z = room.z + 1; z < room.z + room.height - 1; z++) {
      edges.push([room.x, z]);
      edges.push([room.x + room.width - 1, z]);
    }

    for (const [ex, ez] of edges) {
      if (ex < 0 || ex >= width || ez < 0 || ez >= height) continue;
      if (tiles[ez][ex] !== TileType.Floor) continue;

      const neighbors: [number, number][] = [[ex - 1, ez], [ex + 1, ez], [ex, ez - 1], [ex, ez + 1]];
      for (const [nx, nz] of neighbors) {
        if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
        if (tiles[nz][nx] === TileType.Floor && !isInsideRoom(room, nx, nz)) {
          tiles[ez][ex] = TileType.Door;
          break;
        }
      }
    }
  }
}

function isInsideRoom(room: Room, x: number, z: number): boolean {
  return x >= room.x && x < room.x + room.width && z >= room.z && z < room.z + room.height;
}

function pickEntranceExit(rooms: Room[]): [Room, Room] {
  // Exit is always the boss room (first room placed)
  const bossRoom = rooms.find(r => r.isBossRoom) ?? rooms[rooms.length - 1];

  let bestDist = 0;
  let entrance = rooms[1] ?? rooms[0];

  for (const r of rooms) {
    if (r === bossRoom) continue;
    const dist = Math.abs(r.centerX - bossRoom.centerX) +
                 Math.abs(r.centerZ - bossRoom.centerZ);
    if (dist > bestDist) {
      bestDist = dist;
      entrance = r;
    }
  }

  return [entrance, bossRoom];
}

function placeObstacles(
  rooms: Room[],
  tiles: TileType[][],
  obstacles: ObstacleType[][],
  rng: () => number,
  gridWidth: number,
  gridHeight: number,
  config: ObstacleConfig,
  entranceRoom: Room,
  exitRoom: Room,
): void {
  for (const room of rooms) {
    // Skip entrance room (safe spawn area)
    if (room === entranceRoom) continue;
    // Skip boss room — keep it clean for boss fight
    if (room === exitRoom) continue;

    // Each room has a chance of containing obstacles
    if (rng() > config.roomChance) continue;

    const count = config.minCount + Math.floor(rng() * (config.maxCount - config.minCount + 1));

    for (let i = 0; i < count; i++) {
      // Pick a random floor tile inside the room (avoid edges)
      const ox = room.x + 2 + Math.floor(rng() * Math.max(1, room.width - 4));
      const oz = room.z + 2 + Math.floor(rng() * Math.max(1, room.height - 4));

      if (ox < 0 || ox >= gridWidth || oz < 0 || oz >= gridHeight) continue;

      // Only place on walkable floor tiles, not on doors/exits/entrances
      if (tiles[oz][ox] !== TileType.Floor) continue;

      // Don't place on room center (entrance/exit might be here)
      if (ox === room.centerX && oz === room.centerZ) continue;

      // Don't stack obstacles
      if (obstacles[oz][ox] !== ObstacleType.None) continue;

      // Pick random obstacle type from available types
      const obstacleType = config.types[Math.floor(rng() * config.types.length)];
      obstacles[oz][ox] = obstacleType;

      // Furniture blocks movement — mark tile as wall
      if (obstacleType === ObstacleType.Furniture) {
        tiles[oz][ox] = TileType.Wall;
      }
    }
  }
}

/** Helper to get the trap key for a tile position (used for triggered traps). */
export function trapKey(tileX: number, tileZ: number): string {
  return `${tileX},${tileZ}`;
}

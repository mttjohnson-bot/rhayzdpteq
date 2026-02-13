import { TILE_SIZE } from '../utils/constants';
import { getFloorConfig } from './FloorConfig';

export interface Room {
  id: number;
  x: number; // top-left tile x
  z: number; // top-left tile z
  width: number; // in tiles
  height: number; // in tiles (depth)
  centerX: number;
  centerZ: number;
  connected: boolean;
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

export interface DungeonData {
  width: number;
  height: number;
  tiles: TileType[][];
  rooms: Room[];
  entranceRoom: Room;
  exitRoom: Room;
}

const MIN_ROOM_SIZE = 4;
const MAX_ROOM_SIZE = 8;
const ROOM_PADDING = 2; // min gap between rooms
const MAX_PLACEMENT_ATTEMPTS = 200;

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

  // Use floor config for sizing
  const config = getFloorConfig(floor);
  const roomCount = config.difficulty.roomCountBase;
  const gridWidth = config.difficulty.gridSize;
  const gridHeight = config.difficulty.gridSize;

  // Initialize grid
  const tiles: TileType[][] = [];
  for (let z = 0; z < gridHeight; z++) {
    tiles[z] = new Array(gridWidth).fill(TileType.Empty);
  }

  const rooms: Room[] = [];

  // Place rooms
  for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS && rooms.length < roomCount; attempt++) {
    const w = randInt(rng, MIN_ROOM_SIZE, MAX_ROOM_SIZE);
    const h = randInt(rng, MIN_ROOM_SIZE, MAX_ROOM_SIZE);
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

    // Carve room floor
    for (let rz = z; rz < z + h; rz++) {
      for (let rx = x; rx < x + w; rx++) {
        tiles[rz][rx] = TileType.Floor;
      }
    }
  }

  if (rooms.length < 2) {
    // Fallback: ensure at least 2 rooms
    const fallbackRooms: [number, number, number, number][] = [
      [2, 2, 6, 6],
      [gridWidth - 10, gridHeight - 10, 6, 6],
    ];
    for (const [fx, fz, fw, fh] of fallbackRooms) {
      if (rooms.length >= 2) break;
      const room: Room = {
        id: rooms.length,
        x: fx, z: fz, width: fw, height: fh,
        centerX: fx + 3, centerZ: fz + 3,
        connected: false,
      };
      rooms.push(room);
      for (let rz = fz; rz < fz + fh; rz++) {
        for (let rx = fx; rx < fx + fw; rx++) {
          if (rz >= 0 && rz < gridHeight && rx >= 0 && rx < gridWidth) {
            tiles[rz][rx] = TileType.Floor;
          }
        }
      }
    }
  }

  // Connect rooms with corridors (minimum spanning tree approach)
  connectRooms(rooms, tiles, rng, gridWidth, gridHeight);

  // Add walls around all floor tiles
  addWalls(tiles, gridWidth, gridHeight);

  // Place doors where corridors meet rooms
  placeDoors(rooms, tiles, gridWidth, gridHeight);

  // Choose entrance and exit rooms (farthest apart)
  const [entranceRoom, exitRoom] = pickEntranceExit(rooms);

  // Mark entrance and exit tiles
  tiles[entranceRoom.centerZ][entranceRoom.centerX] = TileType.Entrance;
  tiles[exitRoom.centerZ][exitRoom.centerX] = TileType.Exit;

  return { width: gridWidth, height: gridHeight, tiles, rooms, entranceRoom, exitRoom };
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
      carveCorridor(bestConnected, bestRemaining, tiles, rng, gridWidth, gridHeight);
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
): void {
  let x = a.centerX;
  let z = a.centerZ;
  const tx = b.centerX;
  const tz = b.centerZ;

  // L-shaped corridor: go horizontal first or vertical first (random)
  const horizontalFirst = rng() > 0.5;

  if (horizontalFirst) {
    // Horizontal leg
    while (x !== tx) {
      if (x >= 0 && x < gridWidth && z >= 0 && z < gridHeight) {
        if (tiles[z][x] === TileType.Empty) tiles[z][x] = TileType.Floor;
        // Widen corridor to 2 tiles
        if (z + 1 < gridHeight && tiles[z + 1][x] === TileType.Empty) {
          tiles[z + 1][x] = TileType.Floor;
        }
      }
      x += tx > x ? 1 : -1;
    }
    // Vertical leg
    while (z !== tz) {
      if (x >= 0 && x < gridWidth && z >= 0 && z < gridHeight) {
        if (tiles[z][x] === TileType.Empty) tiles[z][x] = TileType.Floor;
        if (x + 1 < gridWidth && tiles[z][x + 1] === TileType.Empty) {
          tiles[z][x + 1] = TileType.Floor;
        }
      }
      z += tz > z ? 1 : -1;
    }
  } else {
    // Vertical leg first
    while (z !== tz) {
      if (x >= 0 && x < gridWidth && z >= 0 && z < gridHeight) {
        if (tiles[z][x] === TileType.Empty) tiles[z][x] = TileType.Floor;
        if (x + 1 < gridWidth && tiles[z][x + 1] === TileType.Empty) {
          tiles[z][x + 1] = TileType.Floor;
        }
      }
      z += tz > z ? 1 : -1;
    }
    // Horizontal leg
    while (x !== tx) {
      if (x >= 0 && x < gridWidth && z >= 0 && z < gridHeight) {
        if (tiles[z][x] === TileType.Empty) tiles[z][x] = TileType.Floor;
        if (z + 1 < gridHeight && tiles[z + 1][x] === TileType.Empty) {
          tiles[z + 1][x] = TileType.Floor;
        }
      }
      x += tx > x ? 1 : -1;
    }
  }

  // Mark the final tile
  if (x >= 0 && x < gridWidth && z >= 0 && z < gridHeight) {
    if (tiles[z][x] === TileType.Empty) tiles[z][x] = TileType.Floor;
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
  // Place doors at room entrances where corridors connect
  for (const room of rooms) {
    const edges: [number, number][] = [];

    // Collect edge tiles of the room
    for (let x = room.x; x < room.x + room.width; x++) {
      edges.push([x, room.z]); // top edge
      edges.push([x, room.z + room.height - 1]); // bottom edge
    }
    for (let z = room.z + 1; z < room.z + room.height - 1; z++) {
      edges.push([room.x, z]); // left edge
      edges.push([room.x + room.width - 1, z]); // right edge
    }

    for (const [ex, ez] of edges) {
      if (ex < 0 || ex >= width || ez < 0 || ez >= height) continue;
      if (tiles[ez][ex] !== TileType.Floor) continue;

      // Check if this edge tile connects to a corridor outside the room
      const neighbors: [number, number][] = [[ex - 1, ez], [ex + 1, ez], [ex, ez - 1], [ex, ez + 1]];
      for (const [nx, nz] of neighbors) {
        if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;
        // If neighbor is floor but outside this room, it's a corridor connection
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
  let bestDist = 0;
  let entrance = rooms[0];
  let exit = rooms[rooms.length - 1];

  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const dist = Math.abs(rooms[i].centerX - rooms[j].centerX) +
                   Math.abs(rooms[i].centerZ - rooms[j].centerZ);
      if (dist > bestDist) {
        bestDist = dist;
        entrance = rooms[i];
        exit = rooms[j];
      }
    }
  }

  return [entrance, exit];
}

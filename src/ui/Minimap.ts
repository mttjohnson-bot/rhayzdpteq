import { DungeonData, TileType } from '../dungeon/DungeonGenerator';

const MINIMAP_TILE = 3; // pixels per tile on minimap
const MINIMAP_MAX_SIZE = 180; // max pixel dimension
const FOG_REVEAL_RADIUS = 5; // tiles around player to reveal

export class Minimap {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dungeon: DungeonData | null = null;
  private revealed: boolean[][] = [];
  private scale = MINIMAP_TILE;

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '10px',
      left: '10px',
      border: '2px solid rgba(170, 68, 255, 0.5)',
      borderRadius: '4px',
      background: 'rgba(0, 0, 0, 0.7)',
      zIndex: '10',
    });

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.container.appendChild(this.canvas);
  }

  setDungeon(dungeon: DungeonData): void {
    this.dungeon = dungeon;

    // Compute scale to fit within max size
    this.scale = Math.min(
      MINIMAP_TILE,
      Math.floor(MINIMAP_MAX_SIZE / dungeon.width),
      Math.floor(MINIMAP_MAX_SIZE / dungeon.height),
    );
    this.scale = Math.max(1, this.scale);

    this.canvas.width = dungeon.width * this.scale;
    this.canvas.height = dungeon.height * this.scale;

    // Initialize fog of war
    this.revealed = [];
    for (let z = 0; z < dungeon.height; z++) {
      this.revealed[z] = new Array(dungeon.width).fill(false);
    }

    this.draw();
  }

  updatePlayerPosition(worldX: number, worldZ: number): void {
    if (!this.dungeon) return;

    // Convert world position to tile coords
    const offsetX = -(this.dungeon.width) / 2;
    const offsetZ = -(this.dungeon.height) / 2;
    const tileX = Math.floor(worldX - offsetX);
    const tileZ = Math.floor(worldZ - offsetZ);

    // Reveal tiles around player
    for (let dz = -FOG_REVEAL_RADIUS; dz <= FOG_REVEAL_RADIUS; dz++) {
      for (let dx = -FOG_REVEAL_RADIUS; dx <= FOG_REVEAL_RADIUS; dx++) {
        const rx = tileX + dx;
        const rz = tileZ + dz;
        if (rx >= 0 && rx < this.dungeon.width && rz >= 0 && rz < this.dungeon.height) {
          if (dx * dx + dz * dz <= FOG_REVEAL_RADIUS * FOG_REVEAL_RADIUS) {
            this.revealed[rz][rx] = true;
          }
        }
      }
    }

    this.draw(tileX, tileZ);
  }

  private draw(playerTileX?: number, playerTileZ?: number): void {
    if (!this.dungeon) return;
    const { ctx, scale } = this;
    const d = this.dungeon;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let z = 0; z < d.height; z++) {
      for (let x = 0; x < d.width; x++) {
        if (!this.revealed[z][x]) continue;

        const tile = d.tiles[z][x];
        let color: string;

        switch (tile) {
          case TileType.Floor:
            color = '#4a4a5a';
            break;
          case TileType.Wall:
            color = '#6a6a7a';
            break;
          case TileType.Door:
            color = '#6a5a4a';
            break;
          case TileType.Exit:
            color = '#44ff44';
            break;
          case TileType.Entrance:
            color = '#4488ff';
            break;
          default:
            continue;
        }

        ctx.fillStyle = color;
        ctx.fillRect(x * scale, z * scale, scale, scale);
      }
    }

    // Draw player dot
    if (playerTileX !== undefined && playerTileZ !== undefined) {
      ctx.fillStyle = '#3a9bdc';
      const dotSize = Math.max(scale, 3);
      ctx.fillRect(
        playerTileX * scale - dotSize / 2 + scale / 2,
        playerTileZ * scale - dotSize / 2 + scale / 2,
        dotSize,
        dotSize,
      );
    }
  }

  show(): void {
    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  hide(): void {
    this.container.remove();
  }
}

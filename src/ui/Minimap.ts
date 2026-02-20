import { DungeonData, TileType } from '../dungeon/DungeonGenerator';

const MINIMAP_TILE = 2; // pixels per tile on minimap
const VIEWPORT_SIZE = 160; // fixed viewport pixel size
const FOG_REVEAL_RADIUS = 6;

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
      overflow: 'hidden',
      zIndex: '10',
    });

    this.canvas = document.createElement('canvas');
    this.canvas.width = VIEWPORT_SIZE;
    this.canvas.height = VIEWPORT_SIZE;
    this.ctx = this.canvas.getContext('2d')!;
    this.container.appendChild(this.canvas);
  }

  setDungeon(dungeon: DungeonData): void {
    this.dungeon = dungeon;
    this.scale = MINIMAP_TILE;

    // Initialize fog of war
    this.revealed = [];
    for (let z = 0; z < dungeon.height; z++) {
      this.revealed[z] = new Array(dungeon.width).fill(false);
    }

    this.draw();
  }

  updatePlayerPosition(worldX: number, worldZ: number): void {
    if (!this.dungeon) return;

    const offsetX = -this.dungeon.width / 2;
    const offsetZ = -this.dungeon.height / 2;
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

    ctx.clearRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE);

    // Calculate viewport offset to center on player
    const viewTiles = Math.floor(VIEWPORT_SIZE / scale);
    const halfView = Math.floor(viewTiles / 2);

    const centerX = playerTileX ?? Math.floor(d.width / 2);
    const centerZ = playerTileZ ?? Math.floor(d.height / 2);

    const startX = Math.max(0, Math.min(centerX - halfView, d.width - viewTiles));
    const startZ = Math.max(0, Math.min(centerZ - halfView, d.height - viewTiles));

    for (let z = startZ; z < Math.min(d.height, startZ + viewTiles + 1); z++) {
      for (let x = startX; x < Math.min(d.width, startX + viewTiles + 1); x++) {
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
        ctx.fillRect((x - startX) * scale, (z - startZ) * scale, scale, scale);
      }
    }

    // Draw player dot
    if (playerTileX !== undefined && playerTileZ !== undefined) {
      ctx.fillStyle = '#3a9bdc';
      const dotSize = Math.max(scale + 1, 4);
      const px = (playerTileX - startX) * scale + scale / 2 - dotSize / 2;
      const pz = (playerTileZ - startZ) * scale + scale / 2 - dotSize / 2;
      ctx.fillRect(px, pz, dotSize, dotSize);
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

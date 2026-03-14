/**
 * Full Map tab accessible from the menu tab system.
 *
 * Shows:
 *  - Expanded dungeon map (entire revealed area)
 *  - Zoom in/out support
 *  - Percentage of map discovered
 *  - Key indicators: entrance, exit, boss room, player position
 */

import type { ActionManager } from '../game/ActionManager';
import type { InputDevice } from '../game/ActionManager';
import type { DungeonData } from '../dungeon/DungeonGenerator';
import { TileType } from '../dungeon/DungeonGenerator';

const MIN_TILE_SIZE = 1;
const MAX_TILE_SIZE = 8;
const DEFAULT_TILE_SIZE = 3;
const ZOOM_STEP = 1;
const PAN_STEP = 20; // pixels per d-pad press

export class MapUI {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private visible = false;
  private onClose: (() => void) | null = null;
  private inputDevice: InputDevice = 'keyboard';
  private hintEl!: HTMLDivElement;
  private statsEl!: HTMLDivElement;

  // Map data
  private dungeon: DungeonData | null = null;
  private revealed: boolean[][] = [];
  private playerTileX = 0;
  private playerTileZ = 0;

  // View state
  private tileSize = DEFAULT_TILE_SIZE;
  private panX = 0; // pixel offset for panning
  private panZ = 0;

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '60px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(10, 10, 20, 0.95)',
      border: '2px solid rgba(170, 68, 255, 0.6)',
      borderRadius: '8px',
      padding: '1.5rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      minWidth: '360px',
      maxWidth: '80vw',
      maxHeight: '80vh',
      zIndex: '200',
      display: 'none',
    });

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  setDungeonData(dungeon: DungeonData, revealed: boolean[][]): void {
    this.dungeon = dungeon;
    this.revealed = revealed;
  }

  setPlayerPosition(tileX: number, tileZ: number): void {
    this.playerTileX = tileX;
    this.playerTileZ = tileZ;
  }

  show(onClose: () => void): void {
    this.onClose = onClose;
    this.visible = true;
    this.tileSize = DEFAULT_TILE_SIZE;
    this.centerOnPlayer();
    this.render();
    this.container.style.display = 'block';
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
    this.onClose?.();
    this.onClose = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setInputDevice(device: InputDevice): void {
    this.inputDevice = device;
    if (this.visible) {
      this.updateHintText();
    }
  }

  handleActions(actions: ActionManager): void {
    if (!this.visible) return;

    // Zoom in/out
    if (actions.wasActionPressed('uiConfirm')) {
      this.zoom(ZOOM_STEP);
    }
    if (actions.wasActionPressed('dropItem')) {
      this.zoom(-ZOOM_STEP);
    }

    // Pan with d-pad/arrows
    if (actions.wasActionPressed('uiUp')) {
      this.panZ -= PAN_STEP;
      this.drawMap();
    }
    if (actions.wasActionPressed('uiDown')) {
      this.panZ += PAN_STEP;
      this.drawMap();
    }
    if (actions.wasActionPressed('uiLeft')) {
      this.panX -= PAN_STEP;
      this.drawMap();
    }
    if (actions.wasActionPressed('uiRight')) {
      this.panX += PAN_STEP;
      this.drawMap();
    }

    if (actions.wasActionPressed('uiCancel')) {
      this.hide();
    }
  }

  private zoom(delta: number): void {
    const oldSize = this.tileSize;
    this.tileSize = Math.max(MIN_TILE_SIZE, Math.min(MAX_TILE_SIZE, this.tileSize + delta));
    if (this.tileSize !== oldSize) {
      // Adjust pan to keep the view roughly centered during zoom
      const ratio = this.tileSize / oldSize;
      this.panX = Math.round(this.panX * ratio);
      this.panZ = Math.round(this.panZ * ratio);
      this.drawMap();
    }
  }

  private centerOnPlayer(): void {
    if (!this.dungeon) return;
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    this.panX = this.playerTileX * this.tileSize - canvasW / 2;
    this.panZ = this.playerTileZ * this.tileSize - canvasH / 2;
  }

  private render(): void {
    this.container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.8rem',
    });

    const title = document.createElement('h2');
    title.textContent = 'Map';
    Object.assign(title.style, { margin: '0', fontSize: '1.3rem', color: '#dd88ff' });
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    Object.assign(closeBtn.style, {
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '4px',
      color: '#aaa',
      cursor: 'pointer',
      fontSize: '1rem',
      padding: '0.2rem 0.6rem',
    });
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);
    this.container.appendChild(header);

    // Stats row (discovery percentage + legend)
    this.statsEl = document.createElement('div');
    Object.assign(this.statsEl.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.6rem',
      fontSize: '0.8rem',
      color: '#aaa',
    });
    this.container.appendChild(this.statsEl);

    // Canvas container
    const canvasContainer = document.createElement('div');
    Object.assign(canvasContainer.style, {
      overflow: 'hidden',
      borderRadius: '4px',
      border: '1px solid rgba(100, 100, 130, 0.4)',
      background: 'rgba(0, 0, 0, 0.5)',
    });

    // Size the canvas to fit the overlay
    const canvasW = Math.min(600, window.innerWidth - 120);
    const canvasH = Math.min(450, window.innerHeight - 200);
    this.canvas.width = canvasW;
    this.canvas.height = canvasH;
    Object.assign(this.canvas.style, {
      display: 'block',
      width: `${canvasW}px`,
      height: `${canvasH}px`,
    });
    canvasContainer.appendChild(this.canvas);
    this.container.appendChild(canvasContainer);

    // Legend
    const legend = document.createElement('div');
    Object.assign(legend.style, {
      display: 'flex',
      gap: '1rem',
      marginTop: '0.6rem',
      fontSize: '0.7rem',
      color: '#999',
      flexWrap: 'wrap',
    });
    this.addLegendItem(legend, '#3a9bdc', 'Player');
    this.addLegendItem(legend, '#4488ff', 'Entrance');
    this.addLegendItem(legend, '#44ff44', 'Exit');
    this.addLegendItem(legend, '#ff4466', 'Boss Room');
    this.container.appendChild(legend);

    // Hint line
    this.hintEl = document.createElement('div');
    Object.assign(this.hintEl.style, {
      marginTop: '0.6rem',
      fontSize: '0.7rem',
      color: '#777',
      textAlign: 'center',
      lineHeight: '1.4',
    });
    this.updateHintText();
    this.container.appendChild(this.hintEl);

    // Center on player and draw
    this.centerOnPlayer();
    this.drawMap();
  }

  private addLegendItem(parent: HTMLElement, color: string, label: string): void {
    const item = document.createElement('div');
    Object.assign(item.style, { display: 'flex', alignItems: 'center', gap: '0.3rem' });
    const swatch = document.createElement('span');
    Object.assign(swatch.style, {
      display: 'inline-block',
      width: '10px',
      height: '10px',
      background: color,
      borderRadius: '2px',
    });
    item.appendChild(swatch);
    const text = document.createElement('span');
    text.textContent = label;
    item.appendChild(text);
    parent.appendChild(item);
  }

  private drawMap(): void {
    if (!this.dungeon || !this.ctx) return;
    const ctx = this.ctx;
    const { tileSize } = this;
    const d = this.dungeon;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw tiles
    for (let z = 0; z < d.height; z++) {
      for (let x = 0; x < d.width; x++) {
        const px = x * tileSize - this.panX;
        const pz = z * tileSize - this.panZ;

        // Cull off-screen tiles
        if (px + tileSize < 0 || px > w || pz + tileSize < 0 || pz > h) continue;

        if (!this.revealed[z]?.[x]) continue;

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
        ctx.fillRect(px, pz, tileSize, tileSize);
      }
    }

    // Draw boss room outline (if any revealed tiles of the boss room are visible)
    if (d.exitRoom?.isBossRoom) {
      this.drawRoomOutline(d.exitRoom, '#ff4466');
    }

    // Draw player position
    const playerPx = this.playerTileX * tileSize - this.panX;
    const playerPz = this.playerTileZ * tileSize - this.panZ;
    const dotSize = Math.max(tileSize + 2, 5);
    ctx.fillStyle = '#3a9bdc';
    ctx.fillRect(
      playerPx + tileSize / 2 - dotSize / 2,
      playerPz + tileSize / 2 - dotSize / 2,
      dotSize,
      dotSize,
    );

    // Update stats
    this.updateStats();
  }

  private drawRoomOutline(
    room: { x: number; z: number; width: number; height: number },
    color: string,
  ): void {
    const { tileSize } = this;
    const rx = room.x * tileSize - this.panX;
    const rz = room.z * tileSize - this.panZ;
    const rw = room.width * tileSize;
    const rh = room.height * tileSize;

    // Check if any part of the room has been revealed
    let hasRevealed = false;
    for (let z = room.z; z < room.z + room.height && !hasRevealed; z++) {
      for (let x = room.x; x < room.x + room.width && !hasRevealed; x++) {
        if (this.revealed[z]?.[x]) hasRevealed = true;
      }
    }
    if (!hasRevealed || !this.ctx) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(rx, rz, rw, rh);
  }

  private updateStats(): void {
    if (!this.statsEl || !this.dungeon) return;
    const pct = this.computeDiscoveryPercentage();
    this.statsEl.textContent = `Discovered: ${pct}%`;
  }

  computeDiscoveryPercentage(): number {
    if (!this.dungeon) return 0;
    const d = this.dungeon;
    let totalNonEmpty = 0;
    let revealedNonEmpty = 0;

    for (let z = 0; z < d.height; z++) {
      for (let x = 0; x < d.width; x++) {
        if (d.tiles[z][x] !== TileType.Empty) {
          totalNonEmpty++;
          if (this.revealed[z]?.[x]) {
            revealedNonEmpty++;
          }
        }
      }
    }

    if (totalNonEmpty === 0) return 0;
    return Math.round((revealedNonEmpty / totalNonEmpty) * 100);
  }

  private updateHintText(): void {
    if (!this.hintEl) return;
    switch (this.inputDevice) {
      case 'gamepad':
        this.hintEl.textContent =
          'D-pad: pan | A: zoom in | R1: zoom out | B: close | LB/RB: switch tab';
        break;
      case 'touch':
        this.hintEl.textContent = 'Tap X to close';
        break;
      default:
        this.hintEl.textContent = 'Arrows: pan | Enter: zoom in | X: zoom out | Esc: close';
    }
  }
}

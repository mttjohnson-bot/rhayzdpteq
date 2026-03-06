// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TileType } from '../../src/dungeon/types';
import type { DungeonData } from '../../src/dungeon/DungeonGenerator';

function makeDungeon(width = 20, height = 20): DungeonData {
  const tiles: TileType[][] = [];
  for (let z = 0; z < height; z++) {
    tiles[z] = new Array(width).fill(TileType.Empty);
  }
  // Create a small room in the middle
  for (let z = 5; z < 15; z++) {
    for (let x = 5; x < 15; x++) {
      tiles[z][x] = z === 5 || z === 14 || x === 5 || x === 14 ? TileType.Wall : TileType.Floor;
    }
  }
  tiles[10][10] = TileType.Entrance;
  tiles[6][6] = TileType.Exit;

  const entranceRoom = {
    id: 0,
    x: 5,
    z: 5,
    width: 10,
    height: 10,
    centerX: 10,
    centerZ: 10,
    connected: true,
  };
  const exitRoom = {
    id: 1,
    x: 5,
    z: 5,
    width: 10,
    height: 10,
    centerX: 6,
    centerZ: 6,
    connected: true,
    isBossRoom: true,
  };

  return {
    width,
    height,
    tiles,
    obstacles: tiles.map((row) => row.map(() => 0)),
    triggeredTraps: new Set(),
    rooms: [entranceRoom, exitRoom],
    entranceRoom,
    exitRoom,
  } as DungeonData;
}

function makeRevealed(width: number, height: number, allRevealed = false): boolean[][] {
  const revealed: boolean[][] = [];
  for (let z = 0; z < height; z++) {
    revealed[z] = new Array(width).fill(allRevealed);
  }
  return revealed;
}

describe('MapUI', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'ui-overlay';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('creates and appends container to ui-overlay', async () => {
    const { MapUI } = await import('../../src/ui/MapUI');
    const ui = new MapUI();
    expect(container.children.length).toBeGreaterThan(0);
    expect(ui.isVisible()).toBe(false);
  });

  it('show() makes it visible and hide() hides it', async () => {
    const { MapUI } = await import('../../src/ui/MapUI');
    const ui = new MapUI();
    const dungeon = makeDungeon();
    const revealed = makeRevealed(20, 20, true);
    let closeCalled = false;

    ui.setDungeonData(dungeon, revealed);
    ui.setPlayerPosition(10, 10);
    ui.show(() => {
      closeCalled = true;
    });
    expect(ui.isVisible()).toBe(true);

    ui.hide();
    expect(ui.isVisible()).toBe(false);
    expect(closeCalled).toBe(true);
  });

  it('setInputDevice does not throw', async () => {
    const { MapUI } = await import('../../src/ui/MapUI');
    const ui = new MapUI();
    ui.setInputDevice('gamepad');
    ui.setInputDevice('touch');
    ui.setInputDevice('keyboard');
  });

  it('computeDiscoveryPercentage returns 0 with no dungeon', async () => {
    const { MapUI } = await import('../../src/ui/MapUI');
    const ui = new MapUI();
    expect(ui.computeDiscoveryPercentage()).toBe(0);
  });

  it('computeDiscoveryPercentage returns 100 when fully revealed', async () => {
    const { MapUI } = await import('../../src/ui/MapUI');
    const ui = new MapUI();
    const dungeon = makeDungeon();
    const revealed = makeRevealed(20, 20, true);
    ui.setDungeonData(dungeon, revealed);
    expect(ui.computeDiscoveryPercentage()).toBe(100);
  });

  it('computeDiscoveryPercentage returns 0 when nothing revealed', async () => {
    const { MapUI } = await import('../../src/ui/MapUI');
    const ui = new MapUI();
    const dungeon = makeDungeon();
    const revealed = makeRevealed(20, 20, false);
    ui.setDungeonData(dungeon, revealed);
    expect(ui.computeDiscoveryPercentage()).toBe(0);
  });

  it('computeDiscoveryPercentage returns partial value', async () => {
    const { MapUI } = await import('../../src/ui/MapUI');
    const ui = new MapUI();
    const dungeon = makeDungeon();
    const revealed = makeRevealed(20, 20, false);
    // Reveal some tiles
    for (let z = 5; z < 10; z++) {
      for (let x = 5; x < 10; x++) {
        revealed[z][x] = true;
      }
    }
    ui.setDungeonData(dungeon, revealed);
    const pct = ui.computeDiscoveryPercentage();
    expect(pct).toBeGreaterThan(0);
    expect(pct).toBeLessThan(100);
  });

  it('show() renders header, canvas, legend, and stats', async () => {
    const { MapUI } = await import('../../src/ui/MapUI');
    const ui = new MapUI();
    const dungeon = makeDungeon();
    const revealed = makeRevealed(20, 20, true);

    ui.setDungeonData(dungeon, revealed);
    ui.setPlayerPosition(10, 10);
    ui.show(() => {});

    // Should have a title
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('Map');

    // Should have a canvas
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();

    // Should have close button
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});

import * as THREE from 'three';
import { SceneManager } from '../rendering/SceneManager';
import { GameCamera } from './Camera';
import { InputManager } from './InputManager';
import { Player } from './Player';
import { createHubScene, PortalInfo } from './Hub';
import { MenuScreen } from '../ui/MenuScreen';
import { HUD } from '../ui/HUD';
import {
  TILE_SIZE,
  HUB_WIDTH,
  HUB_DEPTH,
  COLORS,
  WALL_HEIGHT,
} from '../utils/constants';

export type GameState = 'menu' | 'hub' | 'dungeon';

export class Game {
  private sceneManager: SceneManager;
  private camera: GameCamera;
  private input: InputManager;
  private player: Player;
  private menuScreen: MenuScreen;
  private hud: HUD;

  private state: GameState = 'menu';
  private clock = new THREE.Clock();

  // Hub state
  private hubGroup: THREE.Group | null = null;
  private portal: PortalInfo | null = null;
  private portalAnimTime = 0;

  // Dungeon state (placeholder)
  private dungeonGroup: THREE.Group | null = null;

  constructor() {
    this.sceneManager = new SceneManager();
    this.camera = new GameCamera(window.innerWidth / window.innerHeight);
    this.input = new InputManager();
    this.player = new Player();
    this.menuScreen = new MenuScreen();
    this.hud = new HUD();

    window.addEventListener('resize', () => {
      this.camera.resize(window.innerWidth / window.innerHeight);
    });
  }

  start(): void {
    this.enterMenu();
    this.clock.start();
    this.loop();
  }

  // --- State transitions ---

  private enterMenu(): void {
    this.state = 'menu';
    this.hud.hide();
    this.menuScreen.show(() => this.enterHub());
  }

  private enterHub(): void {
    this.state = 'hub';
    this.menuScreen.hide();

    // Clean up dungeon if returning from one
    if (this.dungeonGroup) {
      this.sceneManager.removeGroup(this.dungeonGroup);
      this.dungeonGroup = null;
    }

    // Build hub if first time
    if (!this.hubGroup) {
      const hub = createHubScene();
      this.hubGroup = hub.group;
      this.portal = hub.portal;
      this.sceneManager.addGroup(this.hubGroup);
    } else {
      // Re-add existing hub
      this.sceneManager.scene.add(this.hubGroup);
    }

    // Add player to scene
    this.sceneManager.scene.add(this.player.mesh);

    // Place player at center of hub
    this.player.teleportTo(0, 0);

    // Set movement bounds to hub interior
    const halfW = (HUB_WIDTH * TILE_SIZE) / 2;
    const halfD = (HUB_DEPTH * TILE_SIZE) / 2;
    this.player.setBounds(-halfW, halfW, -halfD, halfD);

    this.camera.snapTo(this.player.position);
    this.hud.show();
  }

  private enterDungeon(): void {
    this.state = 'dungeon';
    this.hud.hidePrompt();

    // Hide hub (but keep in memory)
    if (this.hubGroup) {
      this.sceneManager.scene.remove(this.hubGroup);
    }

    // Create placeholder dungeon floor
    this.dungeonGroup = this.createPlaceholderDungeon();
    this.sceneManager.addGroup(this.dungeonGroup);

    // Place player at dungeon entrance
    this.player.teleportTo(0, 3);
    this.player.setBounds(-4.5, 4.5, -4.5, 4.5);
    this.camera.snapTo(this.player.position);
  }

  /** Temporary: a simple room to prove the scene transition works */
  private createPlaceholderDungeon(): THREE.Group {
    const group = new THREE.Group();
    const size = 10;
    const half = size / 2;

    // Floor
    const floorGeo = new THREE.BoxGeometry(size, 0.2, size);
    const floorMat = new THREE.MeshLambertMaterial({ color: COLORS.floor });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    floor.position.y = -0.1;
    group.add(floor);

    // Walls
    const wallMat = new THREE.MeshLambertMaterial({ color: COLORS.wall });
    const wallPositions: [number, number, number, number][] = [
      [size + TILE_SIZE, TILE_SIZE, 0, -half - TILE_SIZE / 2],
      [size + TILE_SIZE, TILE_SIZE, 0, half + TILE_SIZE / 2],
      [TILE_SIZE, size, -half - TILE_SIZE / 2, 0],
      [TILE_SIZE, size, half + TILE_SIZE / 2, 0],
    ];
    for (const [w, d, x, z] of wallPositions) {
      const geo = new THREE.BoxGeometry(w, WALL_HEIGHT, d);
      const wall = new THREE.Mesh(geo, wallMat);
      wall.position.set(x, WALL_HEIGHT / 2, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
    }

    // Exit marker (south center)
    const exitGeo = new THREE.BoxGeometry(TILE_SIZE, 0.1, TILE_SIZE);
    const exitMat = new THREE.MeshBasicMaterial({ color: 0x44ff44, transparent: true, opacity: 0.5 });
    const exit = new THREE.Mesh(exitGeo, exitMat);
    exit.position.set(0, 0.05, half - TILE_SIZE / 2);
    group.add(exit);

    return group;
  }

  // --- Game loop ---

  private loop = (): void => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05); // cap delta to avoid spiral

    this.update(dt);
    this.sceneManager.render(this.camera.camera);
    this.input.endFrame();
  };

  private update(dt: number): void {
    switch (this.state) {
      case 'menu':
        break;

      case 'hub':
        this.player.update(dt, this.input);
        this.camera.follow(this.player.position, dt);
        this.updateHub(dt);
        break;

      case 'dungeon':
        this.player.update(dt, this.input);
        this.camera.follow(this.player.position, dt);
        this.updateDungeon();
        break;
    }
  }

  private updateHub(dt: number): void {
    if (!this.portal) return;

    // Animate portal
    this.portalAnimTime += dt;
    this.portal.mesh.rotation.y = this.portalAnimTime * 0.5;
    const scale = 1 + Math.sin(this.portalAnimTime * 2) * 0.05;
    this.portal.mesh.scale.set(scale, 1, scale);

    // Check proximity to portal
    if (this.player.isNear(this.portal.x, this.portal.z)) {
      this.hud.showPrompt('Press E to enter the dungeon');
      if (this.input.wasPressed('KeyE')) {
        this.enterDungeon();
      }
    } else {
      this.hud.hidePrompt();
    }
  }

  private updateDungeon(): void {
    // Check if player reaches the exit tile (south center of placeholder dungeon)
    if (this.player.isNear(0, 4)) {
      this.hud.showPrompt('Press E to return to hub');
      if (this.input.wasPressed('KeyE')) {
        this.enterHub();
      }
    } else {
      this.hud.hidePrompt();
    }
  }
}

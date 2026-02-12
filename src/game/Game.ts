import * as THREE from 'three';
import { SceneManager } from '../rendering/SceneManager';
import { GameCamera } from './Camera';
import { InputManager } from './InputManager';
import { Player } from './Player';
import { createHubScene, PortalInfo } from './Hub';
import { MenuScreen } from '../ui/MenuScreen';
import { HUD } from '../ui/HUD';
import { InstructionsPanel } from '../ui/InstructionsPanel';
import { Minimap } from '../ui/Minimap';
import { FloorSelectUI } from '../ui/FloorSelectUI';
import { generateDungeon, DungeonData } from '../dungeon/DungeonGenerator';
import { buildDungeonMesh, DungeonMeshData } from '../dungeon/FloorRenderer';
import {
  TILE_SIZE,
  HUB_WIDTH,
  HUB_DEPTH,
} from '../utils/constants';

export type GameState = 'menu' | 'hub' | 'dungeon';

export class Game {
  private sceneManager: SceneManager;
  private camera: GameCamera;
  private input: InputManager;
  private player: Player;
  private menuScreen: MenuScreen;
  private hud: HUD;
  private instructions: InstructionsPanel;
  private minimap: Minimap;
  private floorSelectUI: FloorSelectUI;

  private state: GameState = 'menu';
  private clock = new THREE.Clock();

  // Hub state
  private hubGroup: THREE.Group | null = null;
  private portal: PortalInfo | null = null;
  private portalAnimTime = 0;

  // Dungeon state
  private dungeonGroup: THREE.Group | null = null;
  private dungeonData: DungeonData | null = null;
  private dungeonMeshData: DungeonMeshData | null = null;
  private currentFloor = 1;
  private maxUnlockedFloor = 1;
  private floorSelectOpen = false;

  constructor() {
    this.sceneManager = new SceneManager();
    this.camera = new GameCamera(window.innerWidth / window.innerHeight);
    this.input = new InputManager();
    this.player = new Player();
    this.menuScreen = new MenuScreen();
    this.hud = new HUD();
    this.instructions = new InstructionsPanel();
    this.minimap = new Minimap();
    this.floorSelectUI = new FloorSelectUI();

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
    this.instructions.hide();
    this.minimap.hide();
    this.menuScreen.show(() => this.enterHub());
  }

  private enterHub(): void {
    this.state = 'hub';
    this.menuScreen.hide();
    this.minimap.hide();
    this.floorSelectOpen = false;

    // Clean up dungeon if returning from one
    if (this.dungeonGroup) {
      this.sceneManager.removeGroup(this.dungeonGroup);
      this.dungeonGroup = null;
      this.dungeonData = null;
      this.dungeonMeshData = null;
    }

    // Clear dungeon collision
    this.player.setDungeonCollision(null);

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
    this.instructions.show();
  }

  private enterDungeon(floor: number): void {
    this.state = 'dungeon';
    this.currentFloor = floor;
    this.hud.hidePrompt();
    this.floorSelectOpen = false;

    // Hide hub (but keep in memory)
    if (this.hubGroup) {
      this.sceneManager.scene.remove(this.hubGroup);
    }

    // Generate dungeon
    this.dungeonData = generateDungeon(floor);
    this.dungeonMeshData = buildDungeonMesh(this.dungeonData);
    this.dungeonGroup = this.dungeonMeshData.group;
    this.sceneManager.addGroup(this.dungeonGroup);

    // Set up player collision and position
    this.player.setDungeonCollision(this.dungeonData);
    this.player.teleportTo(
      this.dungeonMeshData.entranceWorldPos.x,
      this.dungeonMeshData.entranceWorldPos.z,
    );
    this.player.setBounds(
      this.dungeonMeshData.bounds.minX,
      this.dungeonMeshData.bounds.maxX,
      this.dungeonMeshData.bounds.minZ,
      this.dungeonMeshData.bounds.maxZ,
    );
    this.camera.snapTo(this.player.position);

    // Set up minimap
    this.minimap.setDungeon(this.dungeonData);
    this.minimap.show();
    this.minimap.updatePlayerPosition(this.player.position.x, this.player.position.z);

    // Update HUD
    this.hud.showFloorIndicator(floor);
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
        if (!this.floorSelectOpen) {
          this.player.update(dt, this.input);
          this.camera.follow(this.player.position, dt);
        }
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
      if (!this.floorSelectOpen) {
        this.hud.showPrompt('Press E to select a dungeon floor');
      }
      if (this.input.wasPressed('KeyE') && !this.floorSelectOpen) {
        this.floorSelectOpen = true;
        this.hud.hidePrompt();
        this.floorSelectUI.show(this.maxUnlockedFloor, (floor: number) => {
          this.floorSelectOpen = false;
          this.enterDungeon(floor);
        });
      }
    } else {
      if (!this.floorSelectOpen) {
        this.hud.hidePrompt();
      }
    }
  }

  private updateDungeon(): void {
    if (!this.dungeonMeshData) return;

    // Update minimap with player position
    this.minimap.updatePlayerPosition(this.player.position.x, this.player.position.z);

    // Check if player reaches the exit tile
    const exit = this.dungeonMeshData.exitWorldPos;
    if (this.player.isNear(exit.x, exit.z)) {
      this.hud.showPrompt('Press E to ascend to hub');
      if (this.input.wasPressed('KeyE')) {
        // Unlock next floor
        if (this.currentFloor >= this.maxUnlockedFloor && this.currentFloor < 5) {
          this.maxUnlockedFloor = this.currentFloor + 1;
        }
        this.hud.hideFloorIndicator();
        this.minimap.hide();
        this.enterHub();
      }
    } else {
      this.hud.hidePrompt();
    }
  }
}

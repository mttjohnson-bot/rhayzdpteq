import * as THREE from 'three';
import { SceneManager } from '../rendering/SceneManager';
import { GameCamera } from './Camera';
import { InputManager } from './InputManager';
import { Player } from './Player';
import { createHubScene, PortalInfo } from './Hub';
import { SaveManager } from './SaveManager';
import { MenuScreen } from '../ui/MenuScreen';
import { HUD } from '../ui/HUD';
import { InstructionsPanel } from '../ui/InstructionsPanel';
import { Minimap } from '../ui/Minimap';
import { FloorSelectUI } from '../ui/FloorSelectUI';
import { HealthBar } from '../ui/HealthBar';
import { DamageNumbers } from '../ui/DamageNumbers';
import { XPBar } from '../ui/XPBar';
import { InventoryUI } from '../ui/InventoryUI';
import { SkillTreeUI } from '../ui/SkillTreeUI';
import { BossHealthBar } from '../ui/BossHealthBar';
import { generateDungeon, DungeonData } from '../dungeon/DungeonGenerator';
import { buildDungeonMesh, DungeonMeshData } from '../dungeon/FloorRenderer';
import { getFloorConfig } from '../dungeon/FloorConfig';
import { CombatSystem } from '../combat/CombatSystem';
import { PlayerStats, ComputedStats } from '../rpg/Stats';
import { LevelSystem, enemyXP } from '../rpg/Leveling';
import { SkillTree } from '../rpg/SkillTree';
import { Inventory } from '../rpg/Inventory';
import { LootDropManager } from '../rpg/LootDrop';
import { rollEnemyLoot, Item } from '../rpg/LootTable';
import { events } from '../utils/EventBus';
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
  private healthBar: HealthBar;
  private damageNumbers: DamageNumbers;
  private xpBar: XPBar;
  private inventoryUI: InventoryUI;
  private skillTreeUI: SkillTreeUI;
  private bossHealthBar: BossHealthBar;
  private combatSystem: CombatSystem;

  // RPG systems
  private playerStats: PlayerStats;
  private levelSystem: LevelSystem;
  private skillTree: SkillTree;
  private inventory: Inventory;
  private lootDrops: LootDropManager;
  private computedStats: ComputedStats;

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

  // UI overlay state
  private inventoryOpen = false;
  private skillTreeOpen = false;

  // Death/respawn state
  private deathScreenVisible = false;
  private deathOverlay: HTMLDivElement | null = null;

  // Auto-save timer
  private autoSaveTimer = 0;
  private readonly AUTO_SAVE_INTERVAL = 30; // seconds

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
    this.healthBar = new HealthBar();
    this.damageNumbers = new DamageNumbers();
    this.xpBar = new XPBar();
    this.inventoryUI = new InventoryUI();
    this.skillTreeUI = new SkillTreeUI();
    this.bossHealthBar = new BossHealthBar();
    this.combatSystem = new CombatSystem(this.sceneManager.scene, this.player);

    // RPG systems
    this.playerStats = new PlayerStats();
    this.levelSystem = new LevelSystem();
    this.skillTree = new SkillTree();
    this.inventory = new Inventory();
    this.lootDrops = new LootDropManager();

    // Compute initial stats
    this.computedStats = this.recomputeStats();

    this.damageNumbers.setCamera(this.camera.camera);

    // Listen for events
    events.on('playerDied', this.onPlayerDied);
    events.on('enemyKilled', this.onEnemyKilled);
    events.on('lootPickup', this.onLootPickup);
    events.on('useConsumable', this.onUseConsumable);
    events.on('equipmentChanged', this.onEquipmentChanged);
    events.on('bossKilled', this.onBossKilled);
    events.on('bossEnrage', this.onBossEnrage);

    window.addEventListener('resize', () => {
      this.camera.resize(window.innerWidth / window.innerHeight);
    });
  }

  start(): void {
    // Try to load saved game
    this.loadGame();
    this.enterMenu();
    this.clock.start();
    this.loop();
  }

  // --- Save/Load ---

  private saveGame(): void {
    SaveManager.save(this.maxUnlockedFloor, this.levelSystem, this.skillTree, this.inventory);
  }

  private loadGame(): void {
    const data = SaveManager.load();
    if (data) {
      this.maxUnlockedFloor = SaveManager.apply(data, this.levelSystem, this.skillTree, this.inventory);
      this.recomputeStats();
    }
  }

  // --- RPG stat recomputation ---

  private recomputeStats(): ComputedStats {
    const equipMods = this.inventory.getEquipmentModifiers();
    const skillMods = this.skillTree.getModifiers();
    this.playerStats.setModifiers([...equipMods, ...skillMods]);
    const stats = this.playerStats.compute(this.levelSystem.level);
    this.player.applyStats(stats);
    this.combatSystem.setComputedStats(stats);
    this.computedStats = stats;
    return stats;
  }

  // --- State transitions ---

  private enterMenu(): void {
    this.state = 'menu';
    this.hud.hide();
    this.instructions.hide();
    this.minimap.hide();
    this.healthBar.hide();
    this.damageNumbers.hide();
    this.xpBar.hide();
    this.bossHealthBar.hide();
    this.menuScreen.show(() => this.enterHub());
  }

  private enterHub(): void {
    this.state = 'hub';
    this.menuScreen.hide();
    this.minimap.hide();
    this.healthBar.hide();
    this.damageNumbers.hide();
    this.xpBar.hide();
    this.bossHealthBar.hide();
    this.floorSelectOpen = false;
    this.inventoryOpen = false;
    this.skillTreeOpen = false;
    this.hideDeathScreen();

    // Clean up dungeon if returning from one
    if (this.dungeonGroup) {
      this.combatSystem.clearEnemies();
      this.lootDrops.clear();
      this.sceneManager.removeGroup(this.dungeonGroup);
      this.dungeonGroup = null;
      this.dungeonData = null;
      this.dungeonMeshData = null;
    }

    // Reset lighting to hub defaults
    this.sceneManager.resetLighting();

    // Remove attack indicator from scene if present
    this.sceneManager.scene.remove(this.player.attackIndicator);

    // Clear dungeon collision
    this.player.setDungeonCollision(null);

    // Recompute stats and reset health
    this.recomputeStats();
    this.player.resetHealth();

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
    this.hud.showLevelInfo(this.levelSystem.level, this.maxUnlockedFloor);
    this.instructions.show();

    // Auto-save when returning to hub
    this.saveGame();
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

    // Apply floor theme
    const floorConfig = getFloorConfig(floor);
    this.sceneManager.applyFloorTheme(floorConfig.theme);

    // Generate dungeon
    this.dungeonData = generateDungeon(floor);
    this.dungeonMeshData = buildDungeonMesh(this.dungeonData, floor);
    this.dungeonGroup = this.dungeonMeshData.group;
    this.sceneManager.addGroup(this.dungeonGroup);

    // Set up loot drop manager
    this.lootDrops.setScene(this.sceneManager.scene);

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

    // Recompute stats and reset health
    this.recomputeStats();
    this.player.resetHealth();
    this.camera.snapTo(this.player.position);

    // Add attack indicator to scene
    this.sceneManager.scene.add(this.player.attackIndicator);

    // Spawn enemies and bosses
    const offsetX = -(this.dungeonData.width * TILE_SIZE) / 2;
    const offsetZ = -(this.dungeonData.height * TILE_SIZE) / 2;
    this.combatSystem.spawnEnemiesForDungeon(this.dungeonData, floor, offsetX, offsetZ);

    // Set up minimap
    this.minimap.setDungeon(this.dungeonData);
    this.minimap.show();
    this.minimap.updatePlayerPosition(this.player.position.x, this.player.position.z);

    // Show combat UI
    this.healthBar.setHealth(this.player.hp, this.player.maxHp);
    this.healthBar.show();
    this.damageNumbers.show();
    this.xpBar.setXP(this.levelSystem.xp, this.levelSystem.xpToNextLevel, this.levelSystem.level);
    this.xpBar.show();

    // Update HUD
    this.hud.showFloorIndicator(floor, floorConfig.theme.name);
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
        this.handleUIToggle();
        if (!this.floorSelectOpen && !this.inventoryOpen && !this.skillTreeOpen) {
          this.player.update(dt, this.input);
          this.camera.follow(this.player.position, dt);
        }
        this.updateHub(dt);
        // Auto-save periodically in hub
        this.autoSaveTimer += dt;
        if (this.autoSaveTimer >= this.AUTO_SAVE_INTERVAL) {
          this.autoSaveTimer = 0;
          this.saveGame();
        }
        break;

      case 'dungeon':
        this.handleUIToggle();
        if (!this.deathScreenVisible && !this.inventoryOpen && !this.skillTreeOpen) {
          this.player.update(dt, this.input);
          this.camera.follow(this.player.position, dt);
          this.combatSystem.update(dt);
          this.lootDrops.update(dt, this.player.position.x, this.player.position.z);
        }
        this.damageNumbers.update(dt);
        this.xpBar.update(dt);
        this.bossHealthBar.update(dt);
        this.updateDungeon();
        break;
    }
  }

  /** Handle I (inventory) and K (skill tree) toggles */
  private handleUIToggle(): void {
    if (this.deathScreenVisible) return;

    // Escape closes any open overlay
    if (this.input.wasPressed('Escape')) {
      if (this.inventoryOpen) {
        this.inventoryUI.hide();
        this.inventoryOpen = false;
        return;
      }
      if (this.skillTreeOpen) {
        this.skillTreeUI.hide();
        this.skillTreeOpen = false;
        return;
      }
    }

    // I toggles inventory
    if (this.input.wasPressed('KeyI')) {
      if (this.skillTreeOpen) {
        this.skillTreeUI.hide();
        this.skillTreeOpen = false;
      }
      if (this.inventoryOpen) {
        this.inventoryUI.hide();
        this.inventoryOpen = false;
      } else {
        this.recomputeStats();
        this.inventoryOpen = true;
        this.inventoryUI.show(this.inventory, this.computedStats, () => {
          this.inventoryOpen = false;
          this.recomputeStats();
        });
      }
      return;
    }

    // K toggles skill tree
    if (this.input.wasPressed('KeyK')) {
      if (this.inventoryOpen) {
        this.inventoryUI.hide();
        this.inventoryOpen = false;
      }
      if (this.skillTreeOpen) {
        this.skillTreeUI.hide();
        this.skillTreeOpen = false;
      } else {
        this.skillTreeOpen = true;
        this.skillTreeUI.show(this.skillTree, this.levelSystem, () => {
          this.skillTreeOpen = false;
          this.recomputeStats();
        });
      }
      return;
    }
  }

  private updateHub(dt: number): void {
    if (!this.portal) return;

    // Animate portal
    this.portalAnimTime += dt;
    this.portal.mesh.rotation.y = this.portalAnimTime * 0.5;
    const scale = 1 + Math.sin(this.portalAnimTime * 2) * 0.05;
    this.portal.mesh.scale.set(scale, 1, scale);

    if (this.inventoryOpen || this.skillTreeOpen) return;

    // Check proximity to portal
    if (this.player.isNear(this.portal.x, this.portal.z)) {
      if (!this.floorSelectOpen) {
        this.hud.showPrompt('Press E to select floor | I: Inventory | K: Skills');
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
        this.hud.showPrompt('I: Inventory | K: Skills');
      }
    }
  }

  private updateDungeon(): void {
    if (!this.dungeonMeshData) return;

    // Update minimap with player position
    this.minimap.updatePlayerPosition(this.player.position.x, this.player.position.z);

    if (this.deathScreenVisible) {
      // Wait for respawn input
      if (this.input.wasPressed('KeyR')) {
        this.hideDeathScreen();
        this.enterHub();
      }
      return;
    }

    // Check if player reaches the exit tile
    const exit = this.dungeonMeshData.exitWorldPos;
    if (this.player.isNear(exit.x, exit.z)) {
      // Only allow exit if boss is defeated
      if (this.combatSystem.bossDefeated) {
        this.hud.showPrompt('Press E to ascend to hub');
        if (this.input.wasPressed('KeyE')) {
          // Unlock next floor
          if (this.currentFloor >= this.maxUnlockedFloor && this.currentFloor < 5) {
            this.maxUnlockedFloor = this.currentFloor + 1;
          }
          this.hud.hideFloorIndicator();
          this.minimap.hide();
          this.healthBar.hide();
          this.damageNumbers.hide();
          this.xpBar.hide();
          this.bossHealthBar.hide();
          this.enterHub();
        }
      } else {
        this.hud.showPrompt('Defeat the boss to unlock the exit');
      }
    } else {
      if (!this.inventoryOpen && !this.skillTreeOpen) {
        this.hud.hidePrompt();
      }
    }
  }

  // --- RPG event handlers ---

  private onEnemyKilled = (_x: unknown, _z: unknown): void => {
    const x = _x as number;
    const z = _z as number;

    // Grant XP
    const xp = enemyXP(this.currentFloor);
    this.levelSystem.addXP(xp);

    // Recompute stats on level up (skill points available)
    this.recomputeStats();

    // Roll loot
    const items = rollEnemyLoot(this.currentFloor);
    for (const item of items) {
      this.lootDrops.spawnDrop(item, x, z);
    }
  };

  private onBossKilled = (_x: unknown, _z: unknown, _floor: unknown): void => {
    const floor = _floor as number;
    // Boss grants 5x XP
    const xp = enemyXP(floor) * 5;
    this.levelSystem.addXP(xp);
    this.recomputeStats();

    this.hud.showPrompt('Boss defeated! Find the exit.');
    this.bossHealthBar.hide();
    setTimeout(() => this.hud.hidePrompt(), 3000);
  };

  private onBossEnrage = (_name: unknown): void => {
    const name = _name as string;
    this.hud.showPrompt(`${name} is enraged!`);
    setTimeout(() => this.hud.hidePrompt(), 2000);
  };

  private onLootPickup = (_item: unknown): void => {
    const item = _item as Item;
    const added = this.inventory.addItem(item);
    if (added) {
      this.hud.showPrompt(`Picked up: ${item.name}`);
      setTimeout(() => {
        this.hud.hidePrompt();
      }, 1500);
    } else {
      this.hud.showPrompt('Bag is full!');
      setTimeout(() => {
        this.hud.hidePrompt();
      }, 1500);
    }
  };

  private onUseConsumable = (_item: unknown): void => {
    const item = _item as Item;
    if (item.consumeEffect === 'heal' && item.consumeValue) {
      this.player.heal(item.consumeValue);
    }
  };

  private onEquipmentChanged = (): void => {
    this.recomputeStats();
    // Refresh inventory UI if open
    if (this.inventoryOpen) {
      this.inventoryUI.refresh();
    }
  };

  // --- Death/Respawn ---

  private onPlayerDied = (): void => {
    this.showDeathScreen();
  };

  private showDeathScreen(): void {
    this.deathScreenVisible = true;

    this.deathOverlay = document.createElement('div');
    Object.assign(this.deathOverlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(80, 0, 0, 0.6)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ff4444',
      zIndex: '100',
      animation: 'fadeIn 0.5s ease-out',
    });

    const title = document.createElement('div');
    Object.assign(title.style, {
      fontSize: '3rem',
      fontWeight: 'bold',
      textShadow: '2px 2px 8px #000',
      marginBottom: '1rem',
    });
    title.textContent = 'YOU DIED';
    this.deathOverlay.appendChild(title);

    const subtitle = document.createElement('div');
    Object.assign(subtitle.style, {
      fontSize: '1.2rem',
      color: '#ccc',
      textShadow: '1px 1px 4px #000',
    });
    subtitle.textContent = 'Press R to return to hub';
    this.deathOverlay.appendChild(subtitle);

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.deathOverlay);
  }

  private hideDeathScreen(): void {
    this.deathScreenVisible = false;
    if (this.deathOverlay) {
      this.deathOverlay.remove();
      this.deathOverlay = null;
    }
  }
}

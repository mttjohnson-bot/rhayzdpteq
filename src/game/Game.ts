import * as THREE from 'three';
import { SceneManager } from '../rendering/SceneManager';
import { GameCamera } from './Camera';
import { ActionManager, InputDevice } from './ActionManager';
import { getHint } from '../ui/InputHints';
import { Player } from './Player';
import { createHubScene, PortalInfo, LibraryDoorInfo, VaultInfo } from './Hub';
import { AssetLibrary, buildWeaponDisplayMesh } from './AssetLibrary';
import { LibraryAssetDialog } from '../ui/LibraryAssetDialog';
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
import { VaultUI } from '../ui/VaultUI';
import { SkillTreeUI } from '../ui/SkillTreeUI';
import { SettingsUI, GameSettings } from '../ui/SettingsUI';
import { DiagnosticsOverlay } from '../ui/DiagnosticsOverlay';
import { DiagnosticsInfoUI } from '../ui/DiagnosticsInfoUI';
import { MapUI } from '../ui/MapUI';
import { ControlsUI } from '../ui/ControlsUI';
import { MenuTabBar } from '../ui/MenuTabBar';
import type { MenuTab } from '../ui/MenuTabBar';
import { BossHealthBar } from '../ui/BossHealthBar';
import { generateDungeon, DungeonData } from '../dungeon/DungeonGenerator';
import { buildDungeonMesh, DungeonMeshData } from '../dungeon/FloorRenderer';
import { getFloorConfig, TOTAL_FLOORS } from '../dungeon/FloorConfig';
import { ObstacleSystem } from '../dungeon/ObstacleSystem';
import { CombatSystem } from '../combat/CombatSystem';
import { PlayerStats, ComputedStats } from '../rpg/Stats';
import { LevelSystem, enemyXP } from '../rpg/Leveling';
import { SkillTree } from '../rpg/SkillTree';
import { Inventory } from '../rpg/Inventory';
import { VaultStorage } from '../rpg/VaultStorage';
import { LootDropManager } from '../rpg/LootDrop';
import { rollEnemyLoot, rollBossLoot, Item } from '../rpg/LootTable';
import { events } from '../utils/EventBus';
import {
  TILE_SIZE,
  HUB_WIDTH,
  HUB_DEPTH,
  PLAYER_ATTACK_RANGE,
  PLAYER_ATTACK_ARC,
} from '../utils/constants';

export type GameState = 'menu' | 'hub' | 'dungeon' | 'library';

export class Game {
  private sceneManager: SceneManager;
  private camera: GameCamera;
  private actions: ActionManager;
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
  private vaultUI: VaultUI;
  private skillTreeUI: SkillTreeUI;
  private settingsUI: SettingsUI;
  private diagnosticsOverlay: DiagnosticsOverlay;
  private diagnosticsInfoUI: DiagnosticsInfoUI;
  private mapUI: MapUI;
  private controlsUI: ControlsUI;
  private menuTabBar: MenuTabBar;
  private bossHealthBar: BossHealthBar;
  private combatSystem: CombatSystem;

  // RPG systems
  private playerStats: PlayerStats;
  private levelSystem: LevelSystem;
  private skillTree: SkillTree;
  private inventory: Inventory;
  private vault: VaultStorage;
  private lootDrops: LootDropManager;
  private computedStats: ComputedStats;

  private state: GameState = 'menu';
  private clock = new THREE.Clock();

  // Hub state
  private hubGroup: THREE.Group | null = null;
  private portal: PortalInfo | null = null;
  private portalAnimTime = 0;
  private libraryDoor: LibraryDoorInfo | null = null;
  private vaultPoint: VaultInfo | null = null;

  // Library state
  private assetLibrary: AssetLibrary | null = null;
  private libraryDialog: LibraryAssetDialog;
  private libraryDialogOpen = false;

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
  private vaultOpen = false;
  private settingsOpen = false;
  private diagnosticsInfoOpen = false;
  private controlsOpen = false;
  private mapOpen = false;

  // Persisted settings
  private gameSettings: GameSettings = {
    cameraMode: 'third-person',
    controllerMode: 'auto',
    diagnosticsEnabled: false,
    characterModel: 'owl',
    enemyModelStyle: 'custom',
  };

  // Menu tab cycling
  private readonly menuTabs: MenuTab[] = [
    'inventory',
    'skills',
    'map',
    'controls',
    'settings',
    'diagnostics',
  ];
  private activeMenuTab: MenuTab | null = null;

  // Death/respawn state
  private deathScreenVisible = false;
  private deathOverlay: HTMLDivElement | null = null;

  // Win screen state
  private winScreenVisible = false;
  private winOverlay: HTMLDivElement | null = null;

  // Consumable buff timers
  private speedBuffTimer = 0;
  private speedBuffMult = 0;
  private strengthBuffTimer = 0;
  private strengthBuffDmg = 0;
  private shieldHp = 0;

  // Obstacle system
  private obstacleSystem: ObstacleSystem;
  private playerBurnAccumulator = 0;
  private playerObstacleSpeedMult = 1;
  private playerObstacleDmgMult = 1;

  // Auto-save timer
  private autoSaveTimer = 0;
  private readonly AUTO_SAVE_INTERVAL = 30; // seconds

  // Device detection for adaptive UI hints
  private currentInputDevice: InputDevice = 'keyboard';

  constructor() {
    this.sceneManager = new SceneManager();
    this.camera = new GameCamera(window.innerWidth / window.innerHeight);
    this.actions = ActionManager.createDefault();
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
    this.vaultUI = new VaultUI();
    this.skillTreeUI = new SkillTreeUI();
    this.settingsUI = new SettingsUI();
    this.diagnosticsOverlay = new DiagnosticsOverlay();
    this.diagnosticsInfoUI = new DiagnosticsInfoUI();
    this.mapUI = new MapUI();
    this.controlsUI = new ControlsUI();
    this.menuTabBar = new MenuTabBar();
    this.bossHealthBar = new BossHealthBar();
    this.libraryDialog = new LibraryAssetDialog();
    this.combatSystem = new CombatSystem(this.sceneManager.scene, this.player);

    // RPG systems
    this.playerStats = new PlayerStats();
    this.levelSystem = new LevelSystem();
    this.skillTree = new SkillTree();
    this.inventory = new Inventory();
    this.vault = new VaultStorage();
    this.lootDrops = new LootDropManager();
    this.obstacleSystem = new ObstacleSystem();

    // Compute initial stats
    this.computedStats = this.recomputeStats();

    this.damageNumbers.setCamera(this.camera.camera);

    // Wire auto-face: when player attacks, face nearest enemy
    this.player.setAutoFaceCallback((px, pz) => this.combatSystem.findNearestTarget(px, pz));

    // Wire mob collision: player cannot move through enemies or bosses
    this.player.setMobColliders(() => this.combatSystem.getColliders());

    // Listen for events
    events.on('playerDied', this.onPlayerDied);
    events.on('enemyKilled', this.onEnemyKilled);
    events.on('lootPickup', this.onLootPickup);
    events.on('useConsumable', this.onUseConsumable);
    events.on('equipmentChanged', this.onEquipmentChanged);
    events.on('bossKilled', this.onBossKilled);
    events.on('bossEnrage', this.onBossEnrage);

    // Wire the hamburger menu button to open the menu tab system
    this.instructions.setOnMenuOpen(() => {
      if (this.state === 'menu') return;
      if (
        this.inventoryOpen ||
        this.skillTreeOpen ||
        this.settingsOpen ||
        this.diagnosticsInfoOpen ||
        this.controlsOpen ||
        this.mapOpen
      ) {
        this.closeAllMenuTabs();
      } else {
        this.openMenuTab('inventory');
      }
    });

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

  private saveGame(gameCompleted?: boolean): void {
    SaveManager.save(
      this.maxUnlockedFloor,
      this.levelSystem,
      this.skillTree,
      this.inventory,
      gameCompleted,
      this.vault,
    );
  }

  private loadGame(): void {
    const data = SaveManager.load();
    if (data) {
      this.maxUnlockedFloor = SaveManager.apply(
        data,
        this.levelSystem,
        this.skillTree,
        this.inventory,
        this.vault,
      );
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
    this.updatePlayerEquipmentVisuals();
    return stats;
  }

  /** Build and attach 3D equipment visuals to the player based on current inventory. */
  private updatePlayerEquipmentVisuals(): void {
    const { weapon, armor, ring } = this.inventory.equipped;

    if (weapon && weapon.subtype) {
      this.player.setWeaponMesh(buildWeaponDisplayMesh(weapon.subtype, weapon.rarity));
    } else {
      this.player.setWeaponMesh(null);
    }

    this.player.updateArmorVisual(armor ? armor.rarity : null);
    this.player.updateRingVisual(ring ? ring.rarity : null);
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
    this.menuScreen.show(() => {
      this.loadGame(); // reload for selected slot
      this.enterHub();
    });
  }

  private enterHub(spawnX?: number, spawnZ?: number): void {
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
    this.vaultOpen = false;
    this.settingsOpen = false;
    this.diagnosticsInfoOpen = false;
    this.controlsOpen = false;
    this.mapOpen = false;
    this.activeMenuTab = null;
    this.hideDeathScreen();
    this.hideWinScreen();

    // Clear consumable buffs
    this.speedBuffTimer = 0;
    this.strengthBuffTimer = 0;
    this.shieldHp = 0;

    // Clean up dungeon if returning from one
    if (this.dungeonGroup) {
      this.combatSystem.clearEnemies();
      this.lootDrops.clear();
      this.obstacleSystem.setDungeon(null);
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

    // Restore combat-system auto-face and colliders (library overrides these)
    this.player.setAutoFaceCallback((px, pz) => this.combatSystem.findNearestTarget(px, pz));
    this.player.setMobColliders(() => this.combatSystem.getColliders());

    // Recompute stats and reset health
    this.recomputeStats();
    this.player.resetHealth();

    // Build hub if first time
    if (!this.hubGroup) {
      const hub = createHubScene();
      this.hubGroup = hub.group;
      this.portal = hub.portal;
      this.libraryDoor = hub.libraryDoor;
      this.vaultPoint = hub.vault;
      this.sceneManager.addGroup(this.hubGroup);
    } else {
      // Re-add existing hub
      this.sceneManager.scene.add(this.hubGroup);
    }

    // Add player to scene
    this.sceneManager.scene.add(this.player.mesh);

    // Apply voxel art model settings (deferred from constructor so models
    // only load once gameplay starts, avoiding console errors on the menu)
    if (this.gameSettings.characterModel !== this.player.getCharacterModelId()) {
      void this.player.setCharacterModel(this.gameSettings.characterModel);
    }
    this.combatSystem.setEnemyModelStyle(this.gameSettings.enemyModelStyle);

    // Place player at specified position or center of hub
    this.player.teleportTo(spawnX ?? 0, spawnZ ?? 0);

    // Set movement bounds to hub interior
    const halfW = (HUB_WIDTH * TILE_SIZE) / 2;
    const halfD = (HUB_DEPTH * TILE_SIZE) / 2;
    this.player.setBounds(-halfW, halfW, -halfD, halfD);

    this.camera.snapTo(this.player.position, this.player.facingAngle);
    this.hud.show();
    this.hud.showLevelInfo(this.levelSystem.level, this.maxUnlockedFloor);
    this.hud.setGamepadConnected(this.actions.hasGamepad);
    this.instructions.show();

    // Auto-save when returning to hub
    this.saveGame();
  }

  private enterDungeon(floor: number): void {
    this.state = 'dungeon';
    this.currentFloor = floor;
    this.hud.hidePrompt();
    this.floorSelectOpen = false;

    // Clear consumable buffs
    this.speedBuffTimer = 0;
    this.strengthBuffTimer = 0;
    this.shieldHp = 0;

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

    // Set up obstacle system
    this.obstacleSystem.setDungeon(this.dungeonData);
    this.playerBurnAccumulator = 0;
    this.playerObstacleSpeedMult = 1;
    this.playerObstacleDmgMult = 1;

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
    this.camera.snapTo(this.player.position, this.player.facingAngle);

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
    this.hud.setGamepadConnected(this.actions.hasGamepad);
  }

  // --- Game loop ---

  private loop = (): void => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05); // cap delta to avoid spiral

    this.actions.update();
    this.updateActiveDevice();
    this.update(dt);
    this.sceneManager.render(this.camera.camera);
    this.diagnosticsOverlay.update(dt, this.sceneManager.renderer);
    this.diagnosticsInfoUI.updateSnapshot({
      fps: this.diagnosticsOverlay.fps,
      drawCalls: this.diagnosticsOverlay.drawCalls,
      renderer: this.sceneManager.renderer,
    });
    this.actions.endFrame();
  };

  /** Sync primary device to HUD and InstructionsPanel when it changes */
  private updateActiveDevice(): void {
    // In manual controller mode, skip auto-detection
    if (this.gameSettings.controllerMode !== 'auto') return;

    const device = this.actions.primaryDevice;
    if (device !== this.currentInputDevice) {
      this.currentInputDevice = device;
      this.hud.setActiveDevice(device);
      this.inventoryUI.setInputDevice(device);
      this.vaultUI.setInputDevice(device);
      this.settingsUI.setInputDevice(device);
      this.diagnosticsInfoUI.setInputDevice(device);
      this.controlsUI.setInputDevice(device);
      this.mapUI.setInputDevice(device);
    }
  }

  private update(dt: number): void {
    switch (this.state) {
      case 'menu':
        this.menuScreen.handleActions(this.actions);
        break;

      case 'hub':
        this.routeUIActions();
        this.handleUIToggle();
        if (
          !this.floorSelectOpen &&
          !this.inventoryOpen &&
          !this.skillTreeOpen &&
          !this.vaultOpen &&
          !this.settingsOpen &&
          !this.diagnosticsInfoOpen &&
          !this.controlsOpen
        ) {
          this.player.update(dt, this.actions);
          this.camera.follow(this.player.position, dt, this.player.facingAngle);
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
        this.routeUIActions();
        this.handleUIToggle();
        if (
          !this.deathScreenVisible &&
          !this.winScreenVisible &&
          !this.inventoryOpen &&
          !this.skillTreeOpen &&
          !this.settingsOpen &&
          !this.diagnosticsInfoOpen &&
          !this.controlsOpen &&
          !this.mapOpen
        ) {
          this.player.update(dt, this.actions);
          this.camera.follow(this.player.position, dt, this.player.facingAngle);
          this.combatSystem.update(dt);
          this.lootDrops.update(dt, this.player.position.x, this.player.position.z);
          this.sceneManager.updateLightPosition(this.player.position.x, this.player.position.z);
          this.updateBuffTimers(dt);
          this.updateObstacleEffects(dt);
        }
        this.damageNumbers.update(dt);
        this.xpBar.update(dt);
        this.bossHealthBar.update(dt);
        this.updateDungeon();
        break;

      case 'library':
        this.routeUIActions();
        this.handleUIToggle();
        if (
          !this.libraryDialogOpen &&
          !this.inventoryOpen &&
          !this.skillTreeOpen &&
          !this.settingsOpen &&
          !this.diagnosticsInfoOpen &&
          !this.controlsOpen
        ) {
          this.player.update(dt, this.actions);
          this.camera.follow(this.player.position, dt, this.player.facingAngle);
        }
        this.updateLibrary(dt);
        break;
    }
  }

  /** Route actions to the currently active UI overlay. */
  private routeUIActions(): void {
    // Tab cycling with LB/RB when a menu tab is active
    if (this.activeMenuTab && !this.floorSelectOpen && !this.vaultOpen && !this.libraryDialogOpen) {
      this.handleTabCycling();
    }

    if (this.mapOpen) {
      this.mapUI.handleActions(this.actions);
      return;
    }
    if (this.controlsOpen) {
      this.controlsUI.handleActions(this.actions);
      return;
    }
    if (this.diagnosticsInfoOpen) {
      this.diagnosticsInfoUI.handleActions(this.actions);
      return;
    }
    if (this.settingsOpen) {
      this.settingsUI.handleActions(this.actions);
      return;
    }
    if (this.inventoryOpen) {
      this.inventoryUI.handleActions(this.actions);
      return;
    }
    if (this.vaultOpen) {
      this.vaultUI.handleActions(this.actions);
      return;
    }
    if (this.skillTreeOpen) {
      this.skillTreeUI.handleActions(this.actions);
      return;
    }
    if (this.floorSelectOpen) {
      this.floorSelectUI.handleActions(this.actions);
      return;
    }
    if (this.libraryDialogOpen) {
      this.libraryDialog.handleActions(this.actions);
      return;
    }
  }

  /** Handle menu toggles: ESC (menu), I (inventory), K (skills), M (map) */
  private handleUIToggle(): void {
    if (this.deathScreenVisible || this.winScreenVisible) return;

    // Start / Escape toggles menu — closes any open overlay, or opens
    // the inventory tab as the default menu if nothing is open
    if (this.actions.wasActionPressed('toggleMenu')) {
      // Close any tab-system menu
      if (
        this.settingsOpen ||
        this.inventoryOpen ||
        this.skillTreeOpen ||
        this.diagnosticsInfoOpen ||
        this.controlsOpen ||
        this.mapOpen
      ) {
        this.closeAllMenuTabs();
        return;
      }
      // Close non-tab overlays
      if (this.vaultOpen) {
        this.vaultUI.hide();
        this.vaultOpen = false;
        return;
      }
      if (this.floorSelectOpen) {
        this.floorSelectUI.cancel();
        return;
      }
      if (this.libraryDialogOpen) {
        this.libraryDialog.hide();
        this.libraryDialogOpen = false;
        return;
      }
      // Nothing open — open inventory as the default menu tab
      this.openMenuTab('inventory');
      return;
    }

    // Toggle inventory (I key)
    if (this.actions.wasActionPressed('toggleInventory')) {
      if (this.vaultOpen || this.floorSelectOpen || this.libraryDialogOpen) return;
      if (this.inventoryOpen) {
        this.closeAllMenuTabs();
      } else {
        this.openMenuTab('inventory');
      }
      return;
    }

    // Toggle skill tree (K key)
    if (this.actions.wasActionPressed('toggleSkillTree')) {
      if (this.vaultOpen || this.floorSelectOpen || this.libraryDialogOpen) return;
      if (this.skillTreeOpen) {
        this.closeAllMenuTabs();
      } else {
        this.openMenuTab('skills');
      }
      return;
    }

    // Toggle map (M key)
    if (this.actions.wasActionPressed('toggleMap')) {
      if (this.vaultOpen || this.floorSelectOpen || this.libraryDialogOpen) return;
      if (this.mapOpen) {
        this.closeAllMenuTabs();
      } else if (this.state === 'dungeon' && this.dungeonData) {
        this.openMenuTab('map');
      }
      return;
    }
  }

  /** Open a specific menu tab, closing any others */
  private openMenuTab(tab: MenuTab): void {
    // Close all first
    if (this.inventoryOpen) {
      this.inventoryUI.hide();
      this.inventoryOpen = false;
    }
    if (this.skillTreeOpen) {
      this.skillTreeUI.hide();
      this.skillTreeOpen = false;
    }
    if (this.settingsOpen) {
      this.settingsUI.hide();
      this.settingsOpen = false;
    }
    if (this.diagnosticsInfoOpen) {
      this.diagnosticsInfoUI.hide();
      this.diagnosticsInfoOpen = false;
    }
    if (this.controlsOpen) {
      this.controlsUI.hide();
      this.controlsOpen = false;
    }
    if (this.mapOpen) {
      this.mapUI.hide();
      this.mapOpen = false;
    }

    this.activeMenuTab = tab;

    // Determine which tabs are disabled (map only available in dungeon)
    const disabledTabs: MenuTab[] = [];
    if (this.state !== 'dungeon' || !this.dungeonData) {
      disabledTabs.push('map');
    }

    switch (tab) {
      case 'inventory':
        this.recomputeStats();
        this.inventoryOpen = true;
        this.inventoryUI.show(this.inventory, this.computedStats, () => {
          this.inventoryOpen = false;
          this.activeMenuTab = null;
          this.menuTabBar.hide();
          this.recomputeStats();
        });
        break;
      case 'skills':
        this.skillTreeOpen = true;
        this.skillTreeUI.show(this.skillTree, this.levelSystem, () => {
          this.skillTreeOpen = false;
          this.activeMenuTab = null;
          this.menuTabBar.hide();
          this.recomputeStats();
        });
        break;
      case 'settings':
        this.settingsOpen = true;
        this.settingsUI.show(
          this.gameSettings,
          (settings) => this.applySettings(settings),
          () => {
            this.settingsOpen = false;
            this.activeMenuTab = null;
            this.menuTabBar.hide();
          },
        );
        break;
      case 'diagnostics':
        this.diagnosticsInfoOpen = true;
        this.diagnosticsInfoUI.show(
          {
            fps: this.diagnosticsOverlay.fps,
            drawCalls: this.diagnosticsOverlay.drawCalls,
            renderer: this.sceneManager.renderer,
          },
          () => {
            this.diagnosticsInfoOpen = false;
            this.activeMenuTab = null;
            this.menuTabBar.hide();
          },
        );
        break;
      case 'controls':
        this.controlsOpen = true;
        this.controlsUI.setInputDevice(this.currentInputDevice);
        this.controlsUI.show(() => {
          this.controlsOpen = false;
          this.activeMenuTab = null;
          this.menuTabBar.hide();
        });
        break;
      case 'map':
        if (this.state === 'dungeon' && this.dungeonData) {
          this.mapOpen = true;
          const playerTile = this.minimap.getPlayerTile();
          this.mapUI.setDungeonData(this.dungeonData, this.minimap.getRevealed());
          this.mapUI.setPlayerPosition(playerTile.x, playerTile.z);
          this.mapUI.setInputDevice(this.currentInputDevice);
          this.mapUI.show(() => {
            this.mapOpen = false;
            this.activeMenuTab = null;
            this.menuTabBar.hide();
          });
        } else {
          // Map tab not available outside dungeon — skip to next tab
          this.activeMenuTab = null;
          return;
        }
        break;
    }

    // Show/update the tab bar
    this.menuTabBar.setInputDevice(this.currentInputDevice);
    this.menuTabBar.show(tab, disabledTabs, (selectedTab) => {
      this.openMenuTab(selectedTab);
    });
  }

  /** Close all menu tabs and the tab bar */
  private closeAllMenuTabs(): void {
    if (this.inventoryOpen) {
      this.inventoryUI.hide();
      this.inventoryOpen = false;
    }
    if (this.skillTreeOpen) {
      this.skillTreeUI.hide();
      this.skillTreeOpen = false;
    }
    if (this.settingsOpen) {
      this.settingsUI.hide();
      this.settingsOpen = false;
    }
    if (this.diagnosticsInfoOpen) {
      this.diagnosticsInfoUI.hide();
      this.diagnosticsInfoOpen = false;
    }
    if (this.controlsOpen) {
      this.controlsUI.hide();
      this.controlsOpen = false;
    }
    if (this.mapOpen) {
      this.mapUI.hide();
      this.mapOpen = false;
    }
    this.menuTabBar.hide();
    this.activeMenuTab = null;
    this.recomputeStats();
  }

  /** Handle [ ] or LB/RB tab cycling between menu tabs */
  private handleTabCycling(): void {
    if (!this.activeMenuTab) return;

    let direction = 0;
    if (this.actions.wasActionPressed('tabLeft')) direction = -1;
    if (this.actions.wasActionPressed('tabRight')) direction = 1;
    if (direction === 0) return;

    const mapAvailable = this.state === 'dungeon' && !!this.dungeonData;
    const currentIndex = this.menuTabs.indexOf(this.activeMenuTab);
    const len = this.menuTabs.length;

    // Find the next valid (non-disabled) tab in the given direction
    for (let i = 1; i < len; i++) {
      const nextIndex = (currentIndex + direction * i + len) % len;
      const nextTab = this.menuTabs[nextIndex];
      if (nextTab === 'map' && !mapAvailable) continue;
      if (nextTab !== this.activeMenuTab) {
        this.openMenuTab(nextTab);
      }
      return;
    }
  }

  /** Apply changed settings from the settings UI */
  private applySettings(settings: GameSettings): void {
    this.gameSettings = { ...settings };

    // Camera mode
    this.camera.setMode(settings.cameraMode);

    // Controller detection mode
    if (settings.controllerMode !== 'auto') {
      this.currentInputDevice = settings.controllerMode;
      this.hud.setActiveDevice(settings.controllerMode);
      this.inventoryUI.setInputDevice(settings.controllerMode);
      this.vaultUI.setInputDevice(settings.controllerMode);
      this.settingsUI.setInputDevice(settings.controllerMode);
      this.diagnosticsInfoUI.setInputDevice(settings.controllerMode);
      this.controlsUI.setInputDevice(settings.controllerMode);
      this.mapUI.setInputDevice(settings.controllerMode);
    }

    // Character model
    if (settings.characterModel !== this.player.getCharacterModelId()) {
      void this.player.setCharacterModel(settings.characterModel);
    }

    // Enemy model style
    this.combatSystem.setEnemyModelStyle(settings.enemyModelStyle);
    if (this.assetLibrary) {
      void this.assetLibrary.setEnemyModelStyle(settings.enemyModelStyle);
    }

    // Diagnostics overlay
    if (settings.diagnosticsEnabled) {
      this.diagnosticsOverlay.show();
    } else {
      this.diagnosticsOverlay.hide();
    }
  }

  private updateHub(dt: number): void {
    if (!this.portal) return;

    // Animate portal
    this.portalAnimTime += dt;
    this.portal.mesh.rotation.y = this.portalAnimTime * 0.5;
    const scale = 1 + Math.sin(this.portalAnimTime * 2) * 0.05;
    this.portal.mesh.scale.set(scale, 1, scale);

    if (
      this.inventoryOpen ||
      this.skillTreeOpen ||
      this.vaultOpen ||
      this.settingsOpen ||
      this.diagnosticsInfoOpen
    )
      return;

    // Check proximity to library door (east wall) — auto-enter on approach
    if (
      this.libraryDoor &&
      this.player.isNear(this.libraryDoor.x, this.libraryDoor.z, 2.5) &&
      !this.floorSelectOpen
    ) {
      this.enterLibrary();
      return;
    }

    // Check proximity to vault chest
    if (
      this.vaultPoint &&
      this.player.isNear(this.vaultPoint.x, this.vaultPoint.z, 2.5) &&
      !this.floorSelectOpen
    ) {
      const d = this.currentInputDevice;
      this.hud.showPrompt(
        `${getHint('interact', d)} to open vault | ${getHint('inventory', d)}: Inventory | ${getHint('skillTree', d)}: Skills`,
      );
      if (this.actions.wasActionPressed('interact')) {
        this.vaultOpen = true;
        this.hud.hidePrompt();
        this.vaultUI.show(this.inventory, this.vault, () => {
          this.vaultOpen = false;
          this.saveGame();
        });
      }
      return;
    }

    // Check proximity to portal
    if (this.player.isNear(this.portal.x, this.portal.z)) {
      if (!this.floorSelectOpen) {
        const d = this.currentInputDevice;
        this.hud.showPrompt(
          `${getHint('interact', d)} to select floor | ${getHint('inventory', d)}: Inventory | ${getHint('skillTree', d)}: Skills`,
        );
      }
      if (this.actions.wasActionPressed('interact') && !this.floorSelectOpen) {
        this.floorSelectOpen = true;
        this.hud.hidePrompt();
        this.floorSelectUI.show(
          this.maxUnlockedFloor,
          (floor: number) => {
            this.floorSelectOpen = false;
            this.enterDungeon(floor);
          },
          () => {
            this.floorSelectOpen = false;
          },
        );
      }
    } else {
      if (!this.floorSelectOpen) {
        const d = this.currentInputDevice;
        this.hud.showPrompt(
          `${getHint('inventory', d)}: Inventory | ${getHint('skillTree', d)}: Skills`,
        );
      }
    }
  }

  private enterLibrary(): void {
    this.state = 'library';
    this.hud.hidePrompt();
    this.floorSelectOpen = false;

    // Hide hub (keep in memory)
    if (this.hubGroup) {
      this.sceneManager.scene.remove(this.hubGroup);
    }

    // Build library on first visit; reuse on subsequent visits
    if (!this.assetLibrary) {
      this.assetLibrary = new AssetLibrary();
      this.sceneManager.addGroup(this.assetLibrary.group);
      // Apply current enemy model style so library matches dungeon rendering
      const currentStyle = this.settingsUI.getSettings().enemyModelStyle;
      if (currentStyle !== 'simple') {
        void this.assetLibrary.setEnemyModelStyle(currentStyle);
      }
    } else {
      this.sceneManager.scene.add(this.assetLibrary.group);
    }

    // Enable attack indicator for training dummies
    this.sceneManager.scene.add(this.player.attackIndicator);

    // Show damage numbers so hits on dummies are visible
    this.damageNumbers.show();

    // Auto-face nearest test dummy when attacking
    const dummies = this.assetLibrary.getTestDummies();
    this.player.setAutoFaceCallback((px, pz) => this.findNearestDummy(px, pz));

    // Collide with dummies so player can't walk through them
    this.player.setMobColliders(() =>
      dummies.map((d) => ({
        position: d.position,
        collisionRadius: d.collisionRadius,
        alive: true as boolean,
      })),
    );

    // Register library attack handler
    events.on('playerAttack', this.onPlayerAttackInLibrary);

    // Place player just inside the library entrance
    this.player.teleportTo(10, 0);
    this.player.setBounds(8.5, 64, -33, 23);
    this.player.setDungeonCollision(null);
    this.player.setWallSegments(this.assetLibrary.getWallSegments());

    this.sceneManager.resetLighting();
    this.camera.snapTo(this.player.position, this.player.facingAngle);
    this.hud.show();
    this.hud.showLevelInfo(this.levelSystem.level, this.maxUnlockedFloor);
    this.hud.setGamepadConnected(this.actions.hasGamepad);
  }

  private exitLibrary(): void {
    if (this.assetLibrary) {
      this.sceneManager.scene.remove(this.assetLibrary.group);
    }
    if (this.libraryDialogOpen) {
      this.libraryDialog.hide();
      this.libraryDialogOpen = false;
    }

    // Clean up library attack handling
    events.off('playerAttack', this.onPlayerAttackInLibrary);
    this.sceneManager.scene.remove(this.player.attackIndicator);
    this.damageNumbers.hide();
    this.player.setWallSegments([]);

    // Return to hub near the library door (spawn beyond the 2.5 trigger radius)
    const doorX = this.libraryDoor ? this.libraryDoor.x - 3.0 : 0;
    const doorZ = this.libraryDoor ? this.libraryDoor.z : 0;
    this.enterHub(doorX, doorZ);
  }

  private updateLibrary(dt: number): void {
    if (!this.assetLibrary) return;

    // Always update floating damage numbers
    this.damageNumbers.update(dt);

    if (this.libraryDialogOpen) return;

    this.assetLibrary.update(
      dt,
      this.player.position.x,
      this.player.position.z,
      this.player.facingAngle,
    );

    // Walk west past the door threshold → return to hub
    if (this.player.position.x < 9.5) {
      this.exitLibrary();
      return;
    }

    // Check if player is near the training area (separate room, south side at ~x=27.5, z=10.5)
    const nearTraining = this.player.isNear(27.5, 10.5, 8);

    const highlighted = this.assetLibrary.getHighlightedAsset();
    if (highlighted) {
      this.hud.showPrompt(
        `${getHint('interact', this.currentInputDevice)} to inspect: ${highlighted.name}`,
      );
      if (this.actions.wasActionPressed('interact')) {
        this.libraryDialogOpen = true;
        this.libraryDialog.show(highlighted, () => {
          this.libraryDialogOpen = false;
          this.hud.hidePrompt();
        });
      }
    } else if (nearTraining) {
      this.hud.showPrompt(
        `Training Area — ${getHint('attack', this.currentInputDevice)} to test damage!  |  ${getHint('inventory', this.currentInputDevice)}: Inventory`,
      );
    } else {
      this.hud.showPrompt('Walk toward an asset to highlight it  |  Walk west to return to Hub');
    }
  }

  private updateDungeon(): void {
    if (!this.dungeonMeshData) return;

    // Update minimap with player position
    this.minimap.updatePlayerPosition(this.player.position.x, this.player.position.z);

    if (this.deathScreenVisible) {
      // Wait for respawn input
      if (this.actions.wasActionPressed('respawn')) {
        this.hideDeathScreen();
        this.enterHub();
      }
      return;
    }

    if (this.winScreenVisible) {
      // Wait for continue input
      if (this.actions.wasActionPressed('respawn')) {
        this.hideWinScreen();
        this.enterHub();
      }
      return;
    }

    // Check if player reaches the exit tile
    const exit = this.dungeonMeshData.exitWorldPos;
    if (this.player.isNear(exit.x, exit.z)) {
      // Only allow exit if boss is defeated
      if (this.combatSystem.bossDefeated) {
        // Floor 10 boss defeated = game won!
        if (this.currentFloor === TOTAL_FLOORS) {
          this.hud.showPrompt(`${getHint('interact', this.currentInputDevice)} to claim victory!`);
          if (this.actions.wasActionPressed('interact')) {
            this.showWinScreen();
            this.saveGame(true); // mark game as completed
          }
        } else {
          this.hud.showPrompt(`${getHint('interact', this.currentInputDevice)} to ascend to hub`);
          if (this.actions.wasActionPressed('interact')) {
            // Unlock next floor
            if (this.currentFloor >= this.maxUnlockedFloor && this.currentFloor < TOTAL_FLOORS) {
              this.maxUnlockedFloor = this.currentFloor + 1;
            }
            this.hud.hideFloorIndicator();
            this.minimap.hide();
            this.healthBar.hide();
            this.damageNumbers.hide();
            this.xpBar.hide();
            this.bossHealthBar.hide();
            this.enterHub(this.portal?.x, this.portal ? this.portal.z + 1.5 : undefined);
          }
        }
      } else {
        this.hud.showPrompt('Defeat the boss to unlock the exit');
      }
    } else {
      if (
        !this.inventoryOpen &&
        !this.skillTreeOpen &&
        !this.settingsOpen &&
        !this.diagnosticsInfoOpen
      ) {
        this.hud.hidePrompt();
      }
    }
  }

  // --- Library training dummy attack handling ---

  /** Find nearest test dummy within auto-face range. */
  private findNearestDummy(px: number, pz: number): { x: number; z: number } | null {
    if (!this.assetLibrary) return null;
    const dummies = this.assetLibrary.getTestDummies();
    const range = PLAYER_ATTACK_RANGE * 1.5;

    let nearest: { x: number; z: number; dist: number } | null = null;
    for (const dummy of dummies) {
      const dx = dummy.position.x - px;
      const dz = dummy.position.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist <= range && (!nearest || dist < nearest.dist)) {
        nearest = { x: dummy.position.x, z: dummy.position.z, dist };
      }
    }
    return nearest ? { x: nearest.x, z: nearest.z } : null;
  }

  /** Handle player attacks against training dummies in the library. */
  private onPlayerAttackInLibrary = (_px: unknown, _pz: unknown, _angle: unknown): void => {
    if (this.state !== 'library' || !this.assetLibrary) return;

    const px = _px as number;
    const pz = _pz as number;
    const angle = _angle as number;

    const baseDamage = this.computedStats.attack;
    const critChance = this.computedStats.critChance;
    const critMult = this.computedStats.critMultiplier;

    for (const dummy of this.assetLibrary.getTestDummies()) {
      const dx = dummy.position.x - px;
      const dz = dummy.position.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > PLAYER_ATTACK_RANGE) continue;

      const angleToTarget = Math.atan2(dz, dx);
      let angleDiff = angleToTarget - angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= PLAYER_ATTACK_ARC / 2) {
        const isCrit = Math.random() < critChance;
        const damage = Math.round(isCrit ? baseDamage * critMult : baseDamage);
        dummy.takeDamage(damage);
        if (isCrit) {
          events.emit('damageNumber', dummy.position.x, dummy.position.z, damage, false, true);
        }
      }
    }
  };

  // --- Consumable buff timers ---

  private updateBuffTimers(dt: number): void {
    if (this.speedBuffTimer > 0) {
      this.speedBuffTimer -= dt;
      if (this.speedBuffTimer <= 0) {
        this.speedBuffTimer = 0;
        this.speedBuffMult = 0;
        this.recomputeStats(); // restore normal speed
      }
    }

    if (this.strengthBuffTimer > 0) {
      this.strengthBuffTimer -= dt;
      if (this.strengthBuffTimer <= 0) {
        this.strengthBuffTimer = 0;
        this.strengthBuffDmg = 0;
        this.recomputeStats(); // restore normal damage
      }
    }
  }

  // --- Obstacle effects ---

  private updateObstacleEffects(dt: number): void {
    if (!this.player.alive) return;

    const effects = this.obstacleSystem.getEffectsAt(
      this.player.position.x,
      this.player.position.z,
    );

    // Apply speed modifier from obstacles
    this.playerObstacleSpeedMult = effects.speedMult;
    this.player.setObstacleSpeedMult(effects.speedMult);

    // Store damage modifier for combat
    this.playerObstacleDmgMult = effects.damageMult;

    // Apply fire burn damage
    if (effects.burnDps > 0) {
      this.playerBurnAccumulator += effects.burnDps * dt;
      if (this.playerBurnAccumulator >= 1) {
        const burnDmg = Math.floor(this.playerBurnAccumulator);
        this.playerBurnAccumulator -= burnDmg;
        this.player.takeDamage(burnDmg);
        events.emit('damageNumber', this.player.position.x, this.player.position.z, burnDmg, true);
      }
    } else {
      this.playerBurnAccumulator = 0;
    }

    // Check for trap triggers
    const trapDmg = this.obstacleSystem.checkTrap(this.player.position.x, this.player.position.z);
    if (trapDmg > 0) {
      this.player.takeDamage(trapDmg);
      events.emit('damageNumber', this.player.position.x, this.player.position.z, trapDmg, true);
      this.hud.showPrompt('Trap exploded!');
      setTimeout(() => this.hud.hidePrompt(), 1500);
    }

    // Apply obstacle effects to enemies
    this.combatSystem.updateObstacleEffects(dt, this.obstacleSystem);
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
    const x = _x as number;
    const z = _z as number;
    const floor = _floor as number;

    // Boss grants 5x XP
    const xp = enemyXP(floor) * 5;
    this.levelSystem.addXP(xp);
    this.recomputeStats();

    // Boss drops special loot
    const bossItems = rollBossLoot(floor);
    for (const item of bossItems) {
      this.lootDrops.spawnDrop(item, x, z);
    }

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
    switch (item.consumeEffect) {
      case 'heal':
        if (item.consumeValue) {
          this.player.heal(item.consumeValue);
        }
        break;
      case 'speedBoost':
        if (item.consumeValue && item.consumeDuration) {
          this.speedBuffMult = item.consumeValue / 100;
          this.speedBuffTimer = item.consumeDuration;
          this.hud.showPrompt(`Speed boost! (${item.consumeDuration}s)`);
          setTimeout(() => this.hud.hidePrompt(), 1500);
        }
        break;
      case 'strengthBoost':
        if (item.consumeValue && item.consumeDuration) {
          this.strengthBuffDmg = item.consumeValue;
          this.strengthBuffTimer = item.consumeDuration;
          this.hud.showPrompt(
            `Strength boost! +${item.consumeValue} dmg (${item.consumeDuration}s)`,
          );
          setTimeout(() => this.hud.hidePrompt(), 1500);
        }
        break;
      case 'manaShield':
        if (item.consumeValue) {
          this.shieldHp = item.consumeValue;
          this.hud.showPrompt(`Shield active! ${item.consumeValue} HP`);
          setTimeout(() => this.hud.hidePrompt(), 1500);
        }
        break;
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
      pointerEvents: 'auto',
      cursor: 'pointer',
      animation: 'fadeIn 0.5s ease-out',
    });

    this.deathOverlay.addEventListener('click', () => {
      this.hideDeathScreen();
      this.enterHub();
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
    subtitle.textContent = `${getHint('respawn', this.currentInputDevice)} to return to hub`;
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

  // --- Win Screen ---

  private showWinScreen(): void {
    this.winScreenVisible = true;

    this.winOverlay = document.createElement('div');
    Object.assign(this.winOverlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#ffdd44',
      zIndex: '100',
      pointerEvents: 'auto',
      cursor: 'pointer',
    });

    this.winOverlay.addEventListener('click', () => {
      this.hideWinScreen();
      this.enterHub();
    });

    const crown = document.createElement('div');
    Object.assign(crown.style, {
      fontSize: '4rem',
      marginBottom: '0.5rem',
      textShadow: '0 0 30px rgba(255, 200, 50, 0.8)',
    });
    crown.textContent = 'VICTORY';
    this.winOverlay.appendChild(crown);

    const title = document.createElement('div');
    Object.assign(title.style, {
      fontSize: '2rem',
      fontWeight: 'bold',
      textShadow: '2px 2px 8px #000',
      marginBottom: '0.5rem',
      color: '#fff',
    });
    title.textContent = 'The Darkness Has Been Vanquished!';
    this.winOverlay.appendChild(title);

    const subtitle = document.createElement('div');
    Object.assign(subtitle.style, {
      fontSize: '1.1rem',
      color: '#cc99ff',
      textShadow: '1px 1px 4px #000',
      marginBottom: '0.5rem',
    });
    subtitle.textContent = `You have conquered all ${TOTAL_FLOORS} floors of the dungeon.`;
    this.winOverlay.appendChild(subtitle);

    const stats = document.createElement('div');
    Object.assign(stats.style, {
      fontSize: '0.9rem',
      color: '#aaa',
      marginBottom: '1.5rem',
      textAlign: 'center',
      lineHeight: '1.6',
    });
    stats.innerHTML = `Level ${this.levelSystem.level}<br>Floors Cleared: ${TOTAL_FLOORS}/${TOTAL_FLOORS}`;
    this.winOverlay.appendChild(stats);

    const continueText = document.createElement('div');
    Object.assign(continueText.style, {
      fontSize: '1rem',
      color: '#88cc88',
      textShadow: '1px 1px 4px #000',
    });
    continueText.textContent = `${getHint('respawn', this.currentInputDevice)} to return to hub`;
    this.winOverlay.appendChild(continueText);

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.winOverlay);
  }

  private hideWinScreen(): void {
    this.winScreenVisible = false;
    if (this.winOverlay) {
      this.winOverlay.remove();
      this.winOverlay = null;
    }
  }
}

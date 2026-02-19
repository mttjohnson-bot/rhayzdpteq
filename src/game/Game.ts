import * as THREE from 'three';
import { SceneManager } from '../rendering/SceneManager';
import { GameCamera } from './Camera';
import { InputManager } from './InputManager';
import { Player } from './Player';
import { createHubScene, PortalInfo, LibraryDoorInfo } from './Hub';
import { AssetLibrary, buildWeaponDisplayMesh, buildArmorDisplayMesh, buildRingDisplayMesh } from './AssetLibrary';
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
import { SkillTreeUI } from '../ui/SkillTreeUI';
import { BossHealthBar } from '../ui/BossHealthBar';
import { generateDungeon, DungeonData } from '../dungeon/DungeonGenerator';
import { buildDungeonMesh, DungeonMeshData } from '../dungeon/FloorRenderer';
import { getFloorConfig } from '../dungeon/FloorConfig';
import { ObstacleSystem } from '../dungeon/ObstacleSystem';
import { CombatSystem } from '../combat/CombatSystem';
import { TestDummy } from '../combat/TestDummy';
import { PlayerStats, ComputedStats } from '../rpg/Stats';
import { LevelSystem, enemyXP } from '../rpg/Leveling';
import { SkillTree } from '../rpg/SkillTree';
import { Inventory } from '../rpg/Inventory';
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
  private libraryDoor: LibraryDoorInfo | null = null;

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
    this.libraryDialog = new LibraryAssetDialog();
    this.combatSystem = new CombatSystem(this.sceneManager.scene, this.player);

    // RPG systems
    this.playerStats = new PlayerStats();
    this.levelSystem = new LevelSystem();
    this.skillTree = new SkillTree();
    this.inventory = new Inventory();
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
    SaveManager.save(this.maxUnlockedFloor, this.levelSystem, this.skillTree, this.inventory, gameCompleted);
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
    this.hud.setGamepadConnected(this.input.hasGamepad);
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
    this.hud.setGamepadConnected(this.input.hasGamepad);
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
        if (!this.deathScreenVisible && !this.winScreenVisible && !this.inventoryOpen && !this.skillTreeOpen) {
          this.player.update(dt, this.input);
          this.camera.follow(this.player.position, dt);
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
        this.handleUIToggle();
        if (!this.libraryDialogOpen && !this.inventoryOpen && !this.skillTreeOpen) {
          this.player.update(dt, this.input);
          this.camera.follow(this.player.position, dt);
        }
        this.updateLibrary(dt);
        break;
    }
  }

  /** Handle I (inventory) and K (skill tree) toggles */
  private handleUIToggle(): void {
    if (this.deathScreenVisible || this.winScreenVisible) return;

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

    // Update gamepad indicator
    this.hud.setGamepadConnected(this.input.hasGamepad);

    if (this.inventoryOpen || this.skillTreeOpen) return;

    // Check proximity to library door (east wall) — auto-enter on approach
    if (this.libraryDoor && this.player.isNear(this.libraryDoor.x, this.libraryDoor.z, 2.5) && !this.floorSelectOpen) {
      this.enterLibrary();
      return;
    }

    // Check proximity to portal
    if (this.player.isNear(this.portal.x, this.portal.z)) {
      if (!this.floorSelectOpen) {
        this.hud.showPrompt('Press E to select floor | I: Inventory | K: Skills');
      }
      if (this.input.wasPressed('KeyE') && !this.floorSelectOpen) {
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
        this.hud.showPrompt('I: Inventory | K: Skills');
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
      dummies.map(d => ({ position: d.position, collisionRadius: d.collisionRadius, alive: true as boolean })),
    );

    // Register library attack handler
    events.on('playerAttack', this.onPlayerAttackInLibrary);

    // Place player just inside the library entrance
    this.player.teleportTo(10, 0);
    this.player.setBounds(8.5, 49.5, -23.5, 23.5);
    this.player.setDungeonCollision(null);

    this.sceneManager.resetLighting();
    this.camera.snapTo(this.player.position);
    this.hud.show();
    this.hud.showLevelInfo(this.levelSystem.level, this.maxUnlockedFloor);
    this.hud.setGamepadConnected(this.input.hasGamepad);
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

    this.enterHub();
  }

  private updateLibrary(dt: number): void {
    if (!this.assetLibrary) return;

    this.hud.setGamepadConnected(this.input.hasGamepad);

    // Always update floating damage numbers
    this.damageNumbers.update(dt);

    if (this.libraryDialogOpen) return;

    this.assetLibrary.update(dt, this.player.position.x, this.player.position.z, this.player.facingAngle);

    // Walk west past the door threshold → return to hub
    if (this.player.position.x < 9.5) {
      this.exitLibrary();
      return;
    }

    // Check if player is near the training area (centered around x=16, z=0)
    const nearTraining = this.player.isNear(16, 0, 6);

    const highlighted = this.assetLibrary.getHighlightedAsset();
    if (highlighted) {
      this.hud.showPrompt(`Press E to inspect: ${highlighted.name}`);
      if (this.input.wasPressed('KeyE')) {
        this.libraryDialogOpen = true;
        this.libraryDialog.show(highlighted, () => {
          this.libraryDialogOpen = false;
          this.hud.hidePrompt();
        });
      }
    } else if (nearTraining) {
      this.hud.showPrompt('Training Area — Attack the dummies to test your damage!  |  I: Inventory');
    } else {
      this.hud.showPrompt('Walk toward an asset to highlight it  |  Walk west to return to Hub');
    }
  }

  private updateDungeon(): void {
    if (!this.dungeonMeshData) return;

    // Update minimap with player position
    this.minimap.updatePlayerPosition(this.player.position.x, this.player.position.z);

    // Update gamepad indicator
    this.hud.setGamepadConnected(this.input.hasGamepad);

    if (this.deathScreenVisible) {
      // Wait for respawn input — R key, Enter, or Space (gamepad A button)
      if (this.input.wasPressed('KeyR') || this.input.wasPressed('Enter') || this.input.wasPressed('Space')) {
        this.hideDeathScreen();
        this.enterHub();
      }
      return;
    }

    if (this.winScreenVisible) {
      // Wait for continue input
      if (this.input.wasPressed('KeyR') || this.input.wasPressed('Enter') || this.input.wasPressed('Space')) {
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
        if (this.currentFloor === 10) {
          this.hud.showPrompt('Press E to claim victory!');
          if (this.input.wasPressed('KeyE')) {
            this.showWinScreen();
            this.saveGame(true); // mark game as completed
          }
        } else {
          this.hud.showPrompt('Press E to ascend to hub');
          if (this.input.wasPressed('KeyE')) {
            // Unlock next floor
            if (this.currentFloor >= this.maxUnlockedFloor && this.currentFloor < 10) {
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

    const effects = this.obstacleSystem.getEffectsAt(this.player.position.x, this.player.position.z);

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
          this.hud.showPrompt(`Strength boost! +${item.consumeValue} dmg (${item.consumeDuration}s)`);
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
    subtitle.textContent = 'Press R or A button to return to hub';
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
    subtitle.textContent = 'You have conquered all 10 floors of the dungeon.';
    this.winOverlay.appendChild(subtitle);

    const stats = document.createElement('div');
    Object.assign(stats.style, {
      fontSize: '0.9rem',
      color: '#aaa',
      marginBottom: '1.5rem',
      textAlign: 'center',
      lineHeight: '1.6',
    });
    stats.innerHTML = `Level ${this.levelSystem.level}<br>Floors Cleared: 10/10`;
    this.winOverlay.appendChild(stats);

    const continueText = document.createElement('div');
    Object.assign(continueText.style, {
      fontSize: '1rem',
      color: '#88cc88',
      textShadow: '1px 1px 4px #000',
    });
    continueText.textContent = 'Press R or Enter to return to hub';
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

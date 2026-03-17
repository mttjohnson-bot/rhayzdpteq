import * as THREE from 'three';
import {
  PLAYER_SPEED,
  PLAYER_SIZE,
  PLAYER_HEIGHT,
  COLORS,
  TILE_SIZE,
  PLAYER_MAX_HP,
  PLAYER_ATTACK_COOLDOWN,
  PLAYER_INVINCIBILITY_TIME,
  MODEL_SCALE_OWL,
  MODEL_SCALE_OWLBEAR,
  MODEL_SCALE_DEFAULT,
  RESTING_IDLE_TIME,
  RESTING_COMBAT_COOLDOWN,
  RESTING_REGEN_RATE,
} from '../utils/constants';
import { clamp } from '../utils/math';
import { ActionManager } from './ActionManager';
import { DungeonData, TileType } from '../dungeon/DungeonGenerator';
import { events } from '../utils/EventBus';
import { ComputedStats } from '../rpg/Stats';
import {
  createOcclusionSilhouette,
  createOcclusionSilhouetteFromModel,
  enableStencilWrite,
  enableStencilWriteOnGroup,
} from '../rendering/OcclusionOutline';
import { ItemRarity } from '../rpg/LootTable';
import { RARITY_HEX, type WallAABB } from './AssetLibrary';
import { loadCharacterModel, type CharacterModelId } from '../rendering/CharacterModelLoader';

export class Player {
  readonly mesh: THREE.Mesh;
  readonly position: THREE.Vector3;

  hp: number = PLAYER_MAX_HP;
  maxHp: number = PLAYER_MAX_HP;
  alive: boolean = true;

  attackCooldown: number = 0;
  isAttacking: boolean = false;
  private attackTimer: number = 0;
  private readonly attackDuration = 0.35;

  invincibleTimer: number = 0;
  facingAngle: number = 0;

  private baseMaterial: THREE.MeshLambertMaterial;
  private hitFlashTimer: number = 0;

  readonly attackIndicator: THREE.Mesh;

  private bounds = { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity };
  private dungeonData: DungeonData | null = null;
  private dungeonOffsetX = 0;
  private dungeonOffsetZ = 0;
  private wallSegments: WallAABB[] = [];

  private moveSpeedMultiplier = 1;
  private obstacleSpeedMult = 1;
  private attackSpeedMultiplier = 1;
  private hpRegen = 0;
  private regenAccumulator = 0;

  // Resting health regeneration
  private idleTimer = 0;
  private outOfCombatTimer = 0;
  private restingRegenAccumulator = 0;
  private _isResting = false;

  // Knockback
  private knockbackVelX = 0;
  private knockbackVelZ = 0;
  private knockbackTimer = 0;
  private readonly knockbackDuration = 0.15;

  // Auto-face callback
  private autoFaceCallback: ((px: number, pz: number) => { x: number; z: number } | null) | null =
    null;

  // Mob collision callback
  private getMobColliders:
    | (() => Array<{ position: THREE.Vector3; collisionRadius: number; alive: boolean }>)
    | null = null;

  // Equipment visuals
  private weaponPivot: THREE.Group | null = null;
  private weaponMesh: THREE.Group | null = null;
  private armorPadL: THREE.Mesh | null = null;
  private armorPadR: THREE.Mesh | null = null;
  private ringVisual: THREE.Mesh | null = null;

  // Character model switching
  private activeModelId: CharacterModelId = 'simple';
  private loadedModelGroup: THREE.Group | null = null;
  private loadedModelSilhouette: THREE.Mesh | null = null;
  private simpleGeometry: THREE.BufferGeometry;
  private simpleSilhouette: THREE.Mesh;

  /** Whether the player is currently occluded by a wall/structure from the camera's view. */
  private _occluded = false;

  /** Collision radius — scales with the active character model. */
  collisionRadius: number = PLAYER_SIZE / 2;

  constructor() {
    const geometry = new THREE.BoxGeometry(PLAYER_SIZE, PLAYER_HEIGHT, PLAYER_SIZE);
    this.simpleGeometry = geometry;
    this.baseMaterial = new THREE.MeshLambertMaterial({ color: COLORS.player });
    enableStencilWrite(this.baseMaterial);
    this.mesh = new THREE.Mesh(geometry, this.baseMaterial);
    this.mesh.castShadow = true;
    this.mesh.position.y = PLAYER_HEIGHT / 2;
    this.position = this.mesh.position;

    // Occlusion silhouette: visible through walls (starts hidden; toggled by setOccluded)
    this.simpleSilhouette = createOcclusionSilhouette(
      PLAYER_SIZE,
      PLAYER_HEIGHT,
      PLAYER_SIZE,
      0x66ccff,
    );
    this.simpleSilhouette.visible = false;
    this.mesh.add(this.simpleSilhouette);

    const arcGeo = new THREE.CylinderGeometry(0, 1.0, 0.1, 8, 1, false, 0, Math.PI / 2);
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
    });
    this.attackIndicator = new THREE.Mesh(arcGeo, arcMat);
    this.attackIndicator.visible = false;
    this.attackIndicator.position.y = 0.3;
  }

  /**
   * Toggle the occlusion silhouette based on whether the player is hidden
   * behind a wall or structure from the camera's perspective.
   */
  setOccluded(occluded: boolean): void {
    this._occluded = occluded;
    if (this.activeModelId === 'simple') {
      this.simpleSilhouette.visible = occluded;
    } else {
      this.simpleSilhouette.visible = false;
      if (this.loadedModelSilhouette) {
        this.loadedModelSilhouette.visible = occluded;
      }
    }
  }

  setAutoFaceCallback(cb: (px: number, pz: number) => { x: number; z: number } | null): void {
    this.autoFaceCallback = cb;
  }

  setMobColliders(
    cb: () => Array<{ position: THREE.Vector3; collisionRadius: number; alive: boolean }>,
  ): void {
    this.getMobColliders = cb;
  }

  applyStats(stats: ComputedStats): void {
    this.maxHp = stats.maxHp;
    this.moveSpeedMultiplier = stats.moveSpeed;
    this.attackSpeedMultiplier = stats.attackSpeed;
    this.hpRegen = stats.hpRegen;
    if (this.hp > this.maxHp) this.hp = this.maxHp;
  }

  /** Set obstacle-based speed modifier (1.0 = normal, < 1.0 = slowed by obstacle). */
  setObstacleSpeedMult(mult: number): void {
    this.obstacleSpeedMult = mult;
  }

  heal(amount: number): void {
    if (!this.alive) return;
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    if (this.hp !== before) {
      events.emit('playerDamaged', this.hp, this.maxHp, 0);
    }
  }

  setBounds(minX: number, maxX: number, minZ: number, maxZ: number): void {
    this.bounds = { minX, maxX, minZ, maxZ };
  }

  setDungeonCollision(dungeon: DungeonData | null): void {
    this.dungeonData = dungeon;
    if (dungeon) {
      this.dungeonOffsetX = -(dungeon.width * TILE_SIZE) / 2;
      this.dungeonOffsetZ = -(dungeon.height * TILE_SIZE) / 2;
    }
  }

  setWallSegments(segments: WallAABB[]): void {
    this.wallSegments = segments;
  }

  teleportTo(x: number, z: number): void {
    this.position.x = x;
    this.position.z = z;
    this.position.y = PLAYER_HEIGHT / 2;
  }

  resetHealth(): void {
    this.hp = this.maxHp;
    this.alive = true;
    this.invincibleTimer = 0;
    this.hitFlashTimer = 0;
    this.regenAccumulator = 0;
    this.idleTimer = 0;
    this.outOfCombatTimer = 0;
    this.restingRegenAccumulator = 0;
    this._isResting = false;
    this.knockbackVelX = 0;
    this.knockbackVelZ = 0;
    this.knockbackTimer = 0;
    this.baseMaterial.color.setHex(COLORS.player);
  }

  /** Whether the player is currently resting (idle + out of combat long enough). */
  get isResting(): boolean {
    return this._isResting;
  }

  takeDamage(amount: number): void {
    if (!this.alive || this.invincibleTimer > 0) return;
    this.outOfCombatTimer = 0;
    this.hp = Math.max(0, this.hp - amount);
    this.invincibleTimer = PLAYER_INVINCIBILITY_TIME;
    this.hitFlashTimer = 0.15;
    events.emit('playerDamaged', this.hp, this.maxHp, amount);
    if (this.hp <= 0) {
      this.alive = false;
      events.emit('playerDied');
    }
  }

  applyKnockback(vx: number, vz: number): void {
    this.knockbackVelX = vx;
    this.knockbackVelZ = vz;
    this.knockbackTimer = this.knockbackDuration;
  }

  update(dt: number, actions: ActionManager): void {
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      this.baseMaterial.color.setHex(0xffffff);
    } else {
      this.baseMaterial.color.setHex(COLORS.player);
    }

    if (this.invincibleTimer > 0) {
      this.mesh.visible = Math.floor(this.invincibleTimer * 10) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }

    if (this.isAttacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.attackIndicator.visible = false;
      }
    }

    // Animate equipped weapon pivot (all rotations are in player-mesh local space)
    if (this.weaponPivot && this.weaponMesh) {
      const swingT = this.isAttacking ? 1 - this.attackTimer / this.attackDuration : 0;
      const swingArc = Math.sin(swingT * Math.PI) * (Math.PI * 0.85);
      // Resting: weapon held 45° to the right of facing; sweeps through to the left during attack
      const sweepAngle = Math.PI / 4 - swingArc;
      // Local-space only — player mesh rotation handles world-space orientation
      this.weaponPivot.rotation.y = sweepAngle;
      // Tilt weapon forward at the peak of the swing
      this.weaponPivot.rotation.x = -swingArc * 0.45;
    }

    if (!this.alive) return;

    // Knockback
    if (this.knockbackTimer > 0) {
      this.knockbackTimer -= dt;
      const t = this.knockbackTimer / this.knockbackDuration;
      const kbMoveX = this.knockbackVelX * t * dt * 10;
      const kbMoveZ = this.knockbackVelZ * t * dt * 10;
      this.applyMovement(kbMoveX, kbMoveZ);
    }

    // HP regeneration
    if (this.hpRegen > 0 && this.hp < this.maxHp) {
      this.regenAccumulator += this.hpRegen * dt;
      if (this.regenAccumulator >= 1) {
        const healAmount = Math.floor(this.regenAccumulator);
        this.regenAccumulator -= healAmount;
        this.heal(healAmount);
      }
    }

    // Resting health regeneration — track idle and out-of-combat timers
    this.outOfCombatTimer += dt;

    // Movement
    const move = actions.getMovement();
    if (move.x !== 0 || move.z !== 0) {
      this.idleTimer = 0;
      const angle = -Math.PI / 4;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const worldX = move.x * cos - move.z * sin;
      const worldZ = move.x * sin + move.z * cos;

      this.facingAngle = Math.atan2(worldZ, worldX);

      const attackHeld = actions.isActionHeld('attack');
      const attackSpeedFactor = attackHeld ? 0.25 : 1;
      const speed =
        PLAYER_SPEED * this.moveSpeedMultiplier * this.obstacleSpeedMult * attackSpeedFactor;
      this.applyMovement(worldX * speed * dt, worldZ * speed * dt);
    } else {
      this.idleTimer += dt;
    }

    // Attack input
    const adjustedCooldown = PLAYER_ATTACK_COOLDOWN / this.attackSpeedMultiplier;
    if (
      (actions.wasActionPressed('attack') || actions.isActionHeld('attack')) &&
      this.attackCooldown <= 0
    ) {
      // Auto-face nearest enemy when attacking
      if (this.autoFaceCallback) {
        const target = this.autoFaceCallback(this.position.x, this.position.z);
        if (target) {
          const dx = target.x - this.position.x;
          const dz = target.z - this.position.z;
          this.facingAngle = Math.atan2(dz, dx);
        }
      }
      this.outOfCombatTimer = 0;
      this.startAttack(adjustedCooldown);
    }

    if (this.attackIndicator.visible) {
      this.attackIndicator.position.x = this.position.x;
      this.attackIndicator.position.z = this.position.z;
      this.attackIndicator.rotation.y = -this.facingAngle + Math.PI / 4;
    }

    // Resting health regeneration — activates when idle and out of combat
    const wasResting = this._isResting;
    this._isResting =
      this.idleTimer >= RESTING_IDLE_TIME && this.outOfCombatTimer >= RESTING_COMBAT_COOLDOWN;
    if (this._isResting && this.hp < this.maxHp) {
      this.restingRegenAccumulator += RESTING_REGEN_RATE * dt;
      if (this.restingRegenAccumulator >= 1) {
        const healAmount = Math.floor(this.restingRegenAccumulator);
        this.restingRegenAccumulator -= healAmount;
        this.heal(healAmount);
      }
    } else {
      this.restingRegenAccumulator = 0;
    }
    if (this._isResting !== wasResting) {
      events.emit('playerRestingChanged', this._isResting);
    }

    // Rotate player mesh to face the current movement/attack direction.
    // facingAngle = atan2(worldZ, worldX) uses CCW-positive convention;
    // Three.js rotation.y uses CW-positive, so the offset is +π/2.
    this.mesh.rotation.y = Math.PI / 2 - this.facingAngle;
  }

  private applyMovement(moveX: number, moveZ: number): void {
    const half = this.collisionRadius;
    const newX = this.position.x + moveX;
    const newZ = this.position.z + moveZ;

    if (this.dungeonData) {
      if (this.isWalkable(newX, this.position.z) && !this.isBlockedByMob(newX, this.position.z)) {
        this.position.x = newX;
      }
      if (this.isWalkable(this.position.x, newZ) && !this.isBlockedByMob(this.position.x, newZ)) {
        this.position.z = newZ;
      }
    } else {
      // Hub/Library: bounds clamping + wall segment collision
      if (!this.isBlockedByMob(newX, this.position.z)) {
        const clampedX = clamp(newX, this.bounds.minX + half, this.bounds.maxX - half);
        if (!this.collidesWithWall(clampedX, this.position.z, half)) {
          this.position.x = clampedX;
        }
      }
      if (!this.isBlockedByMob(this.position.x, newZ)) {
        const clampedZ = clamp(newZ, this.bounds.minZ + half, this.bounds.maxZ - half);
        if (!this.collidesWithWall(this.position.x, clampedZ, half)) {
          this.position.z = clampedZ;
        }
      }
    }
  }

  /** Check if a player-sized AABB at (cx, cz) overlaps any wall segment. */
  private collidesWithWall(cx: number, cz: number, half: number): boolean {
    const pMinX = cx - half;
    const pMaxX = cx + half;
    const pMinZ = cz - half;
    const pMaxZ = cz + half;
    for (const w of this.wallSegments) {
      if (pMaxX > w.minX && pMinX < w.maxX && pMaxZ > w.minZ && pMinZ < w.maxZ) {
        return true;
      }
    }
    return false;
  }

  private startAttack(cooldown: number): void {
    this.isAttacking = true;
    this.attackTimer = this.attackDuration;
    this.attackCooldown = cooldown;
    this.attackIndicator.visible = true;
    events.emit('playerAttack', this.position.x, this.position.z, this.facingAngle);
  }

  private isBlockedByMob(worldX: number, worldZ: number): boolean {
    if (!this.getMobColliders) return false;
    const colliders = this.getMobColliders();
    const playerRadius = this.collisionRadius;
    for (const mob of colliders) {
      if (!mob.alive) continue;
      const minDist = playerRadius + mob.collisionRadius;
      const newDx = worldX - mob.position.x;
      const newDz = worldZ - mob.position.z;
      const newDist = Math.sqrt(newDx * newDx + newDz * newDz);
      if (newDist < minDist) {
        // Only block if this move brings us closer to the mob (allows escaping overlaps)
        const curDx = this.position.x - mob.position.x;
        const curDz = this.position.z - mob.position.z;
        const curDist = Math.sqrt(curDx * curDx + curDz * curDz);
        if (newDist < curDist) return true;
      }
    }
    return false;
  }

  private isWalkable(worldX: number, worldZ: number): boolean {
    if (!this.dungeonData) return true;

    const half = this.collisionRadius;
    const corners = [
      [worldX - half, worldZ - half],
      [worldX + half, worldZ - half],
      [worldX - half, worldZ + half],
      [worldX + half, worldZ + half],
    ];

    for (const [cx, cz] of corners) {
      const tileX = Math.floor((cx - this.dungeonOffsetX) / TILE_SIZE);
      const tileZ = Math.floor((cz - this.dungeonOffsetZ) / TILE_SIZE);

      if (
        tileX < 0 ||
        tileX >= this.dungeonData.width ||
        tileZ < 0 ||
        tileZ >= this.dungeonData.height
      ) {
        return false;
      }

      const tile = this.dungeonData.tiles[tileZ][tileX];
      if (tile === TileType.Empty || tile === TileType.Wall) {
        return false;
      }
    }

    return true;
  }

  /** Attach/replace the 3D weapon model on the player. Pass null to remove it. */
  setWeaponMesh(mesh: THREE.Group | null): void {
    if (this.weaponPivot) {
      this.mesh.remove(this.weaponPivot);
      this.weaponPivot = null;
      this.weaponMesh = null;
    }
    if (mesh) {
      const pivot = new THREE.Group();
      // Position at the player's hand level
      pivot.position.set(0, -0.05, 0);
      // Scale weapon to be clearly visible at isometric distance
      mesh.scale.setScalar(0.8);
      // Place weapon forward of the pivot so it extends in the facing direction
      mesh.position.set(0, 0, 0.55);
      // Tilt blade forward so it's visible from the 45° isometric camera
      mesh.rotation.x = -0.5;
      pivot.add(mesh);
      this.mesh.add(pivot);
      this.weaponPivot = pivot;
      this.weaponMesh = mesh;
    }
  }

  /** Show/update coloured shoulder pads based on equipped armor rarity. Pass null to remove. */
  updateArmorVisual(rarity: ItemRarity | null): void {
    if (this.armorPadL) {
      this.mesh.remove(this.armorPadL);
      this.armorPadL = null;
    }
    if (this.armorPadR) {
      this.mesh.remove(this.armorPadR);
      this.armorPadR = null;
    }
    if (!rarity) return;
    const color = RARITY_HEX[rarity];
    const padGeo = new THREE.BoxGeometry(0.18, 0.18, 0.14);
    const padMat = new THREE.MeshLambertMaterial({ color });
    this.armorPadL = new THREE.Mesh(padGeo, padMat);
    this.armorPadL.position.set(-0.38, 0.22, 0);
    this.mesh.add(this.armorPadL);
    this.armorPadR = new THREE.Mesh(padGeo.clone(), padMat.clone());
    this.armorPadR.position.set(0.38, 0.22, 0);
    this.mesh.add(this.armorPadR);
  }

  /** Show/update a glowing ring indicator based on equipped ring rarity. Pass null to remove. */
  updateRingVisual(rarity: ItemRarity | null): void {
    if (this.ringVisual) {
      this.mesh.remove(this.ringVisual);
      this.ringVisual = null;
    }
    if (!rarity) return;
    const color = RARITY_HEX[rarity];
    const geo = new THREE.TorusGeometry(0.12, 0.03, 6, 12);
    const mat = new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: 0.5 });
    this.ringVisual = new THREE.Mesh(geo, mat);
    this.ringVisual.rotation.x = Math.PI / 2;
    // Position at the player's right wrist area
    this.ringVisual.position.set(0.38, -0.18, 0);
    this.mesh.add(this.ringVisual);
  }

  isNear(x: number, z: number, range: number = TILE_SIZE * 1.5): boolean {
    const dx = this.position.x - x;
    const dz = this.position.z - z;
    return Math.sqrt(dx * dx + dz * dz) < range;
  }

  /** Get the currently active character model ID. */
  getCharacterModelId(): CharacterModelId {
    return this.activeModelId;
  }

  /**
   * Switch the player's visual model.
   * 'simple' restores the default box geometry.
   * Other IDs asynchronously load the corresponding .glb model.
   * Falls back to simple if the model fails to load.
   */
  async setCharacterModel(id: CharacterModelId): Promise<void> {
    if (id === this.activeModelId) return;

    // Remove any previously loaded model group and its silhouette
    if (this.loadedModelGroup) {
      this.mesh.remove(this.loadedModelGroup);
      this.loadedModelGroup = null;
    }
    if (this.loadedModelSilhouette) {
      this.mesh.remove(this.loadedModelSilhouette);
      this.loadedModelSilhouette = null;
    }

    if (id === 'simple') {
      // Restore default box appearance
      this.mesh.geometry = this.simpleGeometry;
      this.mesh.material = this.baseMaterial;
      this.simpleSilhouette.visible = this._occluded;
      this.activeModelId = 'simple';
      this.collisionRadius = PLAYER_SIZE / 2;
      return;
    }

    // Load the GLB model
    const group = await loadCharacterModel(id);
    if (!group) {
      // Loading failed — keep current model
      console.warn(`Character model "${id}" failed to load, keeping current model`);
      return;
    }

    // Hide the simple box geometry (make it invisible but keep the mesh as a
    // positional container so all existing code that references this.mesh and
    // this.position continues to work).
    this.mesh.geometry = new THREE.BufferGeometry(); // empty geometry — nothing rendered
    this.mesh.material = new THREE.MeshBasicMaterial({ visible: false });
    this.simpleSilhouette.visible = false;

    // Per-model scale multiplier
    const modelMult =
      id === 'owl' ? MODEL_SCALE_OWL : id === 'owlbear' ? MODEL_SCALE_OWLBEAR : MODEL_SCALE_DEFAULT;

    // Scale the loaded model to roughly match player dimensions, then apply multiplier
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = Math.max(PLAYER_SIZE, PLAYER_HEIGHT);
    const scale = (targetSize / maxDim) * modelMult;
    group.scale.setScalar(scale);

    // Center the model vertically within the player mesh
    const center = new THREE.Vector3();
    box.getCenter(center);
    group.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

    // Mark all model meshes for stencil so they don't trigger their own silhouette
    enableStencilWriteOnGroup(group);

    this.mesh.add(group);
    this.loadedModelGroup = group;
    this.activeModelId = id;
    this.collisionRadius = (PLAYER_SIZE / 2) * modelMult;

    // Create occlusion silhouette matching the GLB model's actual shape
    const shapedSilhouette = createOcclusionSilhouetteFromModel(group, 0x66ccff);
    if (shapedSilhouette) {
      shapedSilhouette.visible = this._occluded;
      this.mesh.add(shapedSilhouette);
      this.loadedModelSilhouette = shapedSilhouette;
    } else {
      // Fallback to bounding-box silhouette if geometry merge fails
      const silBox = new THREE.Box3().setFromObject(group);
      const silSize = new THREE.Vector3();
      silBox.getSize(silSize);
      const silCenter = new THREE.Vector3();
      silBox.getCenter(silCenter);
      const silhouette = createOcclusionSilhouette(
        silSize.x,
        silSize.y,
        silSize.z,
        0x66ccff,
        silCenter.y,
      );
      silhouette.visible = this._occluded;
      this.mesh.add(silhouette);
      this.loadedModelSilhouette = silhouette;
    }
  }
}

import * as THREE from 'three';
import {
  ENEMY_HP,
  ENEMY_ATTACK_DAMAGE,
  COLORS,
  TILE_SIZE,
  MODEL_SCALE_DEFAULT,
} from '../utils/constants';
import { events } from '../utils/EventBus';
import { DungeonData, TileType } from '../dungeon/DungeonGenerator';
import { BossConfig, BossAbility } from '../dungeon/FloorConfig';
import { createOcclusionSilhouette } from '../rendering/OcclusionOutline';
import { loadBossModel } from '../rendering/CharacterModelLoader';

export type BossModelStyle = 'simple' | 'custom';

export class Boss {
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;

  hp: number;
  maxHp: number;
  alive: boolean = true;
  readonly config: BossConfig;
  private floor: number;

  // AI
  private abilityCooldowns: Map<BossAbility, number> = new Map();
  private currentAbility: BossAbility | null = null;
  private abilityTimer = 0;
  private attackCooldown = 0;

  // Charge
  private chargeDir = { x: 0, z: 0 };
  private chargeTimer = 0;

  // Slam
  private slamPhase: 'rise' | 'fall' = 'rise';
  private slamTimer = 0;

  // Enrage
  private enraged = false;
  private enrageBonus = 1;
  private enrageDamageBonus = 1;

  // Summon count
  private summonCount = 0;

  // Death
  private deathTimer = 0;
  private readonly deathDuration = 1.0;

  // Visual
  private bodyMaterial: THREE.MeshLambertMaterial;
  private hornMaterial!: THREE.MeshLambertMaterial;
  private eyeMaterial!: THREE.MeshBasicMaterial;
  private hitFlashTimer = 0;
  private healthBarFg: THREE.Mesh;

  // Invisibility
  private invisActive = false;
  private invisPhase: 'fadingIn' | 'peeking' | 'fadingOut' | 'hidden' = 'fadingIn';
  private invisPhaseTimer = 0;

  // Collision
  private dungeonData: DungeonData | null = null;
  private dungeonOffsetX = 0;
  private dungeonOffsetZ = 0;
  readonly collisionRadius: number;

  // Model switching
  private modelStyle: BossModelStyle = 'simple';
  private simpleChildren: THREE.Object3D[] = [];
  private loadedModelGroup: THREE.Group | null = null;

  // Obstacle effects
  private obstacleSpeedMult = 1;
  private burnAccumulator = 0;

  constructor(x: number, z: number, floor: number, config: BossConfig) {
    this.config = config;
    this.floor = floor;
    const hpBase = ENEMY_HP * config.hpMultiplier * (1 + (floor - 1) * 0.3);
    this.maxHp = Math.round(hpBase);
    this.hp = this.maxHp;
    this.collisionRadius = config.scale * 0.3;

    this.mesh = new THREE.Group();

    // Body
    const size = config.scale;
    const height = size * 1.2;
    const bodyGeo = new THREE.BoxGeometry(size * 0.7, height, size * 0.7);
    this.bodyMaterial = new THREE.MeshLambertMaterial({
      color: config.color,
      transparent: true,
      opacity: 1.0,
    });
    const body = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    body.castShadow = true;
    body.position.y = height / 2;
    this.mesh.add(body);

    // Occlusion silhouette: visible through walls
    const silhouette = createOcclusionSilhouette(
      size * 0.7,
      height,
      size * 0.7,
      0xff4444,
      height / 2,
    );
    this.mesh.add(silhouette);

    // Boss horns
    const hornGeo = new THREE.ConeGeometry(size * 0.1, size * 0.4, 4);
    this.hornMaterial = new THREE.MeshLambertMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 1.0,
    });
    const leftHorn = new THREE.Mesh(hornGeo, this.hornMaterial);
    leftHorn.position.set(-size * 0.25, height + size * 0.15, 0);
    leftHorn.rotation.z = 0.3;
    this.mesh.add(leftHorn);
    const rightHorn = new THREE.Mesh(hornGeo, this.hornMaterial);
    rightHorn.position.set(size * 0.25, height + size * 0.15, 0);
    rightHorn.rotation.z = -0.3;
    this.mesh.add(rightHorn);

    // Eyes (larger, menacing)
    const eyeSize = size * 0.08;
    const eyeGeo = new THREE.BoxGeometry(eyeSize, eyeSize * 1.5, eyeSize);
    this.eyeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff2200,
      transparent: true,
      opacity: 1.0,
    });
    const leftEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    leftEye.position.set(-size * 0.15, height * 0.75, -size * 0.35 - 0.01);
    this.mesh.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    rightEye.position.set(size * 0.15, height * 0.75, -size * 0.35 - 0.01);
    this.mesh.add(rightEye);

    // Health bar
    const barWidth = size * 0.8;
    const hbBgGeo = new THREE.BoxGeometry(barWidth, 0.1, 0.1);
    const hbBgMat = new THREE.MeshBasicMaterial({ color: COLORS.healthBarBg });
    const healthBarBg = new THREE.Mesh(hbBgGeo, hbBgMat);
    healthBarBg.position.y = height + size * 0.4;
    this.mesh.add(healthBarBg);

    const hbFgGeo = new THREE.BoxGeometry(barWidth, 0.1, 0.1);
    const hbFgMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
    this.healthBarFg = new THREE.Mesh(hbFgGeo, hbFgMat);
    this.healthBarFg.position.y = height + size * 0.4;
    this.mesh.add(this.healthBarFg);

    this.mesh.position.set(x, 0, z);
    this.position = this.mesh.position;

    // Snapshot simple children for model style toggling
    this.simpleChildren = [...this.mesh.children];

    // Initialize cooldowns
    for (const ability of config.abilities) {
      this.abilityCooldowns.set(ability, 2); // initial delay
    }
  }

  /**
   * Switch between simple (procedural box) and custom (GLB voxel) model.
   */
  async setModelStyle(style: BossModelStyle): Promise<void> {
    if (style === this.modelStyle) return;
    this.modelStyle = style;

    const size = this.config.scale;
    const height = size * 1.2;

    if (style === 'custom') {
      for (const child of this.simpleChildren) {
        child.visible = false;
      }

      const group = await loadBossModel(this.config.name);
      if (!group || this.modelStyle !== 'custom') {
        for (const child of this.simpleChildren) {
          child.visible = true;
        }
        this.modelStyle = 'simple';
        return;
      }

      // Scale GLB to match boss dimensions with model scale multiplier
      const box = new THREE.Box3().setFromObject(group);
      const modelSize = new THREE.Vector3();
      box.getSize(modelSize);
      const maxDim = Math.max(modelSize.x, modelSize.y, modelSize.z);
      const targetDim = Math.max(size * 0.7, height);
      const scale = (targetDim / maxDim) * MODEL_SCALE_DEFAULT;
      group.scale.setScalar(scale);

      const center = new THREE.Vector3();
      box.getCenter(center);
      group.position.set(-center.x * scale, -center.y * scale + height / 2, -center.z * scale);

      this.mesh.add(group);
      this.loadedModelGroup = group;

      // Re-show health bar
      this.healthBarFg.visible = true;
    } else {
      if (this.loadedModelGroup) {
        this.mesh.remove(this.loadedModelGroup);
        this.loadedModelGroup = null;
      }
      for (const child of this.simpleChildren) {
        child.visible = true;
      }
    }
  }

  getModelStyle(): BossModelStyle {
    return this.modelStyle;
  }

  setDungeonCollision(dungeon: DungeonData): void {
    this.dungeonData = dungeon;
    this.dungeonOffsetX = -(dungeon.width * TILE_SIZE) / 2;
    this.dungeonOffsetZ = -(dungeon.height * TILE_SIZE) / 2;
  }

  /** Set obstacle-based speed modifier for this boss. */
  setObstacleSpeedMult(mult: number): void {
    this.obstacleSpeedMult = mult;
  }

  /** Apply accumulated burn damage from fire obstacles. */
  applyBurnDamage(amount: number): void {
    this.burnAccumulator += amount;
    if (this.burnAccumulator >= 1) {
      const dmg = Math.floor(this.burnAccumulator);
      this.burnAccumulator -= dmg;
      this.takeDamage(dmg);
    }
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashTimer = 0.15;
    this.updateHealthBar();

    events.emit('enemyDamaged', this.position.x, this.position.z, amount);

    // Enrage trigger at 50% HP
    if (!this.enraged && this.hp < this.maxHp * 0.5 && this.config.abilities.includes('enrage')) {
      this.triggerEnrage();
    }

    if (this.hp <= 0) {
      this.alive = false;
      this.deathTimer = this.deathDuration;
      events.emit('bossKilled', this.position.x, this.position.z, this.floor);
    }
  }

  get shouldRemove(): boolean {
    return !this.alive && this.deathTimer <= 0;
  }

  update(dt: number, playerX: number, playerZ: number): void {
    // Hit flash
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      this.bodyMaterial.color.setHex(0xffffff);
    } else if (this.alive) {
      this.bodyMaterial.color.setHex(this.enraged ? 0xff2200 : this.config.color);
    }

    // Invisibility cycling (runs every frame; hit flash temporarily overrides opacity)
    if (this.invisActive) {
      this.updateInvisibility(dt);
    }

    if (!this.alive) {
      this.deathTimer -= dt;
      const t = Math.max(0, this.deathTimer / this.deathDuration);
      this.mesh.scale.set(t, t, t);
      this.mesh.position.y = (1 - t) * -1;
      // Fade out body opacity in sync with the shrink so the death reads clearly
      if (this.invisActive) {
        this.bodyMaterial.opacity = t;
        this.hornMaterial.opacity = t;
        this.eyeMaterial.opacity = t;
      }
      return;
    }

    // Update cooldowns
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    for (const [ability, cd] of this.abilityCooldowns) {
      if (cd > 0) this.abilityCooldowns.set(ability, cd - dt);
    }

    const dx = playerX - this.position.x;
    const dz = playerZ - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Face player
    this.mesh.rotation.y = Math.atan2(-dx, -dz);

    // Execute current ability
    if (this.currentAbility) {
      this.updateAbility(dt, playerX, playerZ);
      return;
    }

    // Try to use an ability
    const availableAbilities = this.config.abilities.filter((a) => {
      if (a === 'enrage') return false; // passive
      const cd = this.abilityCooldowns.get(a) ?? 0;
      return cd <= 0;
    });

    if (availableAbilities.length > 0 && Math.random() < 0.04) {
      const ability = availableAbilities[Math.floor(Math.random() * availableAbilities.length)];
      this.startAbility(ability, dx, dz, dist);
      return;
    }

    // Standard melee behavior
    const speed = this.config.speed * this.enrageBonus * this.obstacleSpeedMult;
    if (dist > 1.5) {
      // Chase
      const moveX = (dx / dist) * speed * dt;
      const moveZ = (dz / dist) * speed * dt;
      this.tryMove(moveX, moveZ);
    } else if (this.attackCooldown <= 0) {
      // Melee attack
      const dmg = Math.round(
        ENEMY_ATTACK_DAMAGE * this.config.dmgMultiplier * this.enrageDamageBonus,
      );
      this.attackCooldown = this.config.attackCooldown * (this.enraged ? 0.4 : 1);
      events.emit('enemyAttack', this, dmg);
    }
  }

  private startAbility(ability: BossAbility, dx: number, dz: number, _dist: number): void {
    this.currentAbility = ability;

    switch (ability) {
      case 'charge': {
        const len = Math.sqrt(dx * dx + dz * dz) || 1;
        this.chargeDir = { x: dx / len, z: dz / len };
        this.chargeTimer = 0.8;
        this.abilityTimer = 0.8;
        this.abilityCooldowns.set('charge', 2.5);
        break;
      }
      case 'slam': {
        this.slamPhase = 'rise';
        this.slamTimer = 0.5;
        this.abilityTimer = 0.5;
        this.abilityCooldowns.set('slam', 3);
        break;
      }
      case 'summon': {
        if (this.summonCount < 6) {
          events.emit('bossSummon', this.position.x, this.position.z, this.floor);
          this.summonCount++;
        }
        this.abilityTimer = 0.5;
        this.abilityCooldowns.set('summon', 5);
        break;
      }
      case 'teleport': {
        const angle = Math.random() * Math.PI * 2;
        const tpDist = 3 + Math.random() * 3;
        const newX = this.position.x + Math.cos(angle) * tpDist;
        const newZ = this.position.z + Math.sin(angle) * tpDist;
        if (this.isWalkable(newX, newZ)) {
          this.position.x = newX;
          this.position.z = newZ;
        }
        this.abilityTimer = 0.3;
        this.abilityCooldowns.set('teleport', 3.5);
        break;
      }
      case 'invisibility': {
        // One-shot activation: enable the passive cycling loop and never re-trigger.
        if (!this.invisActive) {
          this.invisActive = true;
          this.invisPhase = 'fadingOut';
          this.invisPhaseTimer = 0.5;
        }
        this.abilityTimer = 0.1; // end the "ability" immediately; cycling runs passively
        this.abilityCooldowns.set('invisibility', 9999);
        break;
      }
    }
  }

  private updateAbility(dt: number, playerX: number, playerZ: number): void {
    this.abilityTimer -= dt;

    switch (this.currentAbility) {
      case 'charge': {
        this.chargeTimer -= dt;
        const speed = this.config.speed * 6 * this.enrageBonus;
        this.tryMove(this.chargeDir.x * speed * dt, this.chargeDir.z * speed * dt);

        // Damage on contact
        const dx = playerX - this.position.x;
        const dz = playerZ - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 1.5) {
          const dmg = Math.round(
            ENEMY_ATTACK_DAMAGE * this.config.dmgMultiplier * 2.5 * this.enrageDamageBonus,
          );
          events.emit('enemyAttack', this, dmg);
        }
        break;
      }
      case 'slam': {
        this.slamTimer -= dt;
        if (this.slamPhase === 'rise') {
          this.position.y += dt * 3;
          if (this.slamTimer <= 0) {
            this.slamPhase = 'fall';
            this.slamTimer = 0.15;
          }
        } else {
          this.position.y = Math.max(0, this.position.y - dt * 20);
          if (this.position.y <= 0) {
            this.position.y = 0;
            // AoE damage
            const dx = playerX - this.position.x;
            const dz = playerZ - this.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < 5) {
              const dmg = Math.round(
                ENEMY_ATTACK_DAMAGE * this.config.dmgMultiplier * 3.5 * this.enrageDamageBonus,
              );
              events.emit('enemyAttack', this, dmg);
            }
            events.emit('bossSlam', this.position.x, this.position.z);
          }
        }
        break;
      }
    }

    if (this.abilityTimer <= 0) {
      this.currentAbility = null;
    }
  }

  /**
   * Cycles boss opacity for the fading-invisibility effect.
   * Peak opacity is 25% so the boss is ghostly even at its most visible.
   * Eyes stay slightly brighter than the body for a haunting glow effect.
   * Hit flashes override opacity momentarily so damage feedback still reads.
   */
  private updateInvisibility(dt: number): void {
    // Opacity targets
    const BODY_PEEK = 0.25; // body/horns at most-visible point
    const EYE_PEEK = 0.4; // eyes slightly brighter for the haunting glow
    const EYE_FLOOR = 0.04; // faint ember glow when fully hidden

    // Phase durations (seconds)
    const FADE_DUR = 0.5; // cross-fade length
    const PEEK_DUR = 1.8; // how long the boss is at peak visibility
    const HIDDEN_DUR = 4.2; // how long the boss is fully invisible

    // During a hit flash, snap visible so the player sees the damage register
    if (this.hitFlashTimer > 0) {
      this.bodyMaterial.opacity = 0.9;
      this.hornMaterial.opacity = 0.9;
      this.eyeMaterial.opacity = 1.0;
      return;
    }

    this.invisPhaseTimer -= dt;

    switch (this.invisPhase) {
      case 'fadingIn': {
        // 0 → PEEK_OPACITY as timer counts down from FADE_DUR to 0
        const t = 1.0 - Math.max(0, this.invisPhaseTimer / FADE_DUR);
        this.bodyMaterial.opacity = t * BODY_PEEK;
        this.hornMaterial.opacity = t * BODY_PEEK;
        this.eyeMaterial.opacity = EYE_FLOOR + t * (EYE_PEEK - EYE_FLOOR);
        if (this.invisPhaseTimer <= 0) {
          this.invisPhase = 'peeking';
          this.invisPhaseTimer = PEEK_DUR;
        }
        break;
      }
      case 'peeking': {
        this.bodyMaterial.opacity = BODY_PEEK;
        this.hornMaterial.opacity = BODY_PEEK;
        this.eyeMaterial.opacity = EYE_PEEK;
        if (this.invisPhaseTimer <= 0) {
          this.invisPhase = 'fadingOut';
          this.invisPhaseTimer = FADE_DUR;
        }
        break;
      }
      case 'fadingOut': {
        // PEEK_OPACITY → 0 as timer counts down from FADE_DUR to 0
        const t = Math.max(0, this.invisPhaseTimer / FADE_DUR);
        this.bodyMaterial.opacity = t * BODY_PEEK;
        this.hornMaterial.opacity = t * BODY_PEEK;
        this.eyeMaterial.opacity = EYE_FLOOR + t * (EYE_PEEK - EYE_FLOOR);
        if (this.invisPhaseTimer <= 0) {
          this.invisPhase = 'hidden';
          this.invisPhaseTimer = HIDDEN_DUR;
        }
        break;
      }
      case 'hidden': {
        this.bodyMaterial.opacity = 0;
        this.hornMaterial.opacity = 0;
        this.eyeMaterial.opacity = EYE_FLOOR;
        if (this.invisPhaseTimer <= 0) {
          this.invisPhase = 'fadingIn';
          this.invisPhaseTimer = FADE_DUR;
        }
        break;
      }
    }
  }

  private triggerEnrage(): void {
    this.enraged = true;
    this.enrageBonus = 1.8;
    this.enrageDamageBonus = 1.6;
    events.emit('bossEnrage', this.config.name);
  }

  private tryMove(dx: number, dz: number): void {
    const newX = this.position.x + dx;
    const newZ = this.position.z + dz;

    if (this.isWalkable(newX, this.position.z)) {
      this.position.x = newX;
    }
    if (this.isWalkable(this.position.x, newZ)) {
      this.position.z = newZ;
    }
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

  private updateHealthBar(): void {
    const ratio = this.hp / this.maxHp;
    this.healthBarFg.scale.x = Math.max(0.001, ratio);
    const barOffset = -this.config.scale * 0.4 * (1 - ratio);
    this.healthBarFg.position.x = barOffset;
  }

  dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
}

/**
 * Builds a visual-only display mesh for use in the Asset Library.
 * Replicates boss appearance without health bars, occlusion silhouettes, or AI state.
 */
export function buildBossDisplayMesh(config: BossConfig): THREE.Group {
  const group = new THREE.Group();
  const size = config.scale;
  const height = size * 1.2;

  // Body
  const bodyGeo = new THREE.BoxGeometry(size * 0.7, height, size * 0.7);
  const bodyMat = new THREE.MeshLambertMaterial({ color: config.color });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.position.y = height / 2;
  group.add(body);

  // Horns
  const hornGeo = new THREE.ConeGeometry(size * 0.1, size * 0.4, 4);
  const hornMat = new THREE.MeshLambertMaterial({ color: 0xdddddd });
  const leftHorn = new THREE.Mesh(hornGeo, hornMat);
  leftHorn.position.set(-size * 0.25, height + size * 0.15, 0);
  leftHorn.rotation.z = 0.3;
  group.add(leftHorn);
  const rightHorn = new THREE.Mesh(hornGeo.clone(), hornMat);
  rightHorn.position.set(size * 0.25, height + size * 0.15, 0);
  rightHorn.rotation.z = -0.3;
  group.add(rightHorn);

  // Eyes (larger, menacing)
  const eyeSize = size * 0.08;
  const eyeGeo = new THREE.BoxGeometry(eyeSize, eyeSize * 1.5, eyeSize);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-size * 0.15, height * 0.75, -size * 0.35 - 0.01);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo.clone(), eyeMat);
  rightEye.position.set(size * 0.15, height * 0.75, -size * 0.35 - 0.01);
  group.add(rightEye);

  // Normalize scale so all bosses display at a consistent size in the library
  group.scale.setScalar(1.0 / size);

  return group;
}

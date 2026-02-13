import * as THREE from 'three';
import {
  PLAYER_SPEED, PLAYER_SIZE, PLAYER_HEIGHT, COLORS, TILE_SIZE,
  PLAYER_MAX_HP, PLAYER_ATTACK_COOLDOWN, PLAYER_INVINCIBILITY_TIME,
} from '../utils/constants';
import { clamp } from '../utils/math';
import { InputManager } from './InputManager';
import { DungeonData, TileType } from '../dungeon/DungeonGenerator';
import { events } from '../utils/EventBus';
import { ComputedStats } from '../rpg/Stats';

export class Player {
  readonly mesh: THREE.Mesh;
  readonly position: THREE.Vector3;

  // Health
  hp: number = PLAYER_MAX_HP;
  maxHp: number = PLAYER_MAX_HP;
  alive: boolean = true;

  // Attack state
  attackCooldown: number = 0;
  isAttacking: boolean = false;
  private attackTimer: number = 0;
  private readonly attackDuration = 0.15; // visual swing time

  // Invincibility after taking damage
  invincibleTimer: number = 0;

  // Facing direction (angle in radians, 0 = +X)
  facingAngle: number = 0;

  // Visual feedback
  private baseMaterial: THREE.MeshLambertMaterial;
  private hitFlashTimer: number = 0;

  // Attack visual (sword swing indicator)
  readonly attackIndicator: THREE.Mesh;

  // Boundaries
  private bounds = { minX: -Infinity, maxX: Infinity, minZ: -Infinity, maxZ: Infinity };
  private dungeonData: DungeonData | null = null;
  private dungeonOffsetX = 0;
  private dungeonOffsetZ = 0;

  // RPG stats (updated from computed stats)
  private moveSpeedMultiplier = 1;
  private attackSpeedMultiplier = 1;
  private hpRegen = 0;
  private regenAccumulator = 0;

  constructor() {
    const geometry = new THREE.BoxGeometry(PLAYER_SIZE, PLAYER_HEIGHT, PLAYER_SIZE);
    this.baseMaterial = new THREE.MeshLambertMaterial({ color: COLORS.player });
    this.mesh = new THREE.Mesh(geometry, this.baseMaterial);
    this.mesh.castShadow = true;
    this.mesh.position.y = PLAYER_HEIGHT / 2;
    this.position = this.mesh.position;

    // Attack arc indicator (flat wedge)
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

  /** Apply computed stats from RPG system */
  applyStats(stats: ComputedStats): void {
    this.maxHp = stats.maxHp;
    this.moveSpeedMultiplier = stats.moveSpeed;
    this.attackSpeedMultiplier = stats.attackSpeed;
    this.hpRegen = stats.hpRegen;
    // Clamp current HP to new max
    if (this.hp > this.maxHp) this.hp = this.maxHp;
  }

  /** Heal by amount (from potions, regen, etc.) */
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
    this.baseMaterial.color.setHex(COLORS.player);
  }

  takeDamage(amount: number): void {
    if (!this.alive || this.invincibleTimer > 0) return;
    this.hp = Math.max(0, this.hp - amount);
    this.invincibleTimer = PLAYER_INVINCIBILITY_TIME;
    this.hitFlashTimer = 0.15;
    events.emit('playerDamaged', this.hp, this.maxHp, amount);
    if (this.hp <= 0) {
      this.alive = false;
      events.emit('playerDied');
    }
  }

  update(dt: number, input: InputManager): void {
    // Timers
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

    // Hit flash visual
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      this.baseMaterial.color.setHex(0xffffff);
    } else {
      this.baseMaterial.color.setHex(COLORS.player);
    }

    // Invincibility blink
    if (this.invincibleTimer > 0) {
      this.mesh.visible = Math.floor(this.invincibleTimer * 10) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }

    // Attack animation
    if (this.isAttacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.attackIndicator.visible = false;
      }
    }

    if (!this.alive) return;

    // HP regeneration
    if (this.hpRegen > 0 && this.hp < this.maxHp) {
      this.regenAccumulator += this.hpRegen * dt;
      if (this.regenAccumulator >= 1) {
        const healAmount = Math.floor(this.regenAccumulator);
        this.regenAccumulator -= healAmount;
        this.heal(healAmount);
      }
    }

    // Movement
    const move = input.getMovement();
    if (move.x !== 0 || move.z !== 0) {
      // Rotate movement to match isometric camera orientation
      const angle = -Math.PI / 4;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const worldX = move.x * cos - move.z * sin;
      const worldZ = move.x * sin + move.z * cos;

      // Update facing direction based on movement
      this.facingAngle = Math.atan2(worldZ, worldX);

      const half = PLAYER_SIZE / 2;
      const speed = PLAYER_SPEED * this.moveSpeedMultiplier;
      const newX = this.position.x + worldX * speed * dt;
      const newZ = this.position.z + worldZ * speed * dt;

      if (this.dungeonData) {
        if (this.isWalkable(newX, this.position.z)) {
          this.position.x = newX;
        }
        if (this.isWalkable(this.position.x, newZ)) {
          this.position.z = newZ;
        }
      } else {
        this.position.x = clamp(newX, this.bounds.minX + half, this.bounds.maxX - half);
        this.position.z = clamp(newZ, this.bounds.minZ + half, this.bounds.maxZ - half);
      }
    }

    // Attack input (mouse click or Space) — cooldown scaled by attack speed
    const adjustedCooldown = PLAYER_ATTACK_COOLDOWN / this.attackSpeedMultiplier;
    if ((input.wasMousePressed() || input.wasPressed('Space')) && this.attackCooldown <= 0) {
      this.startAttack(adjustedCooldown);
    }

    // Update attack indicator position
    if (this.attackIndicator.visible) {
      this.attackIndicator.position.x = this.position.x;
      this.attackIndicator.position.z = this.position.z;
      this.attackIndicator.rotation.y = -this.facingAngle + Math.PI / 4;
    }
  }

  private startAttack(cooldown: number): void {
    this.isAttacking = true;
    this.attackTimer = this.attackDuration;
    this.attackCooldown = cooldown;
    this.attackIndicator.visible = true;
    events.emit('playerAttack', this.position.x, this.position.z, this.facingAngle);
  }

  private isWalkable(worldX: number, worldZ: number): boolean {
    if (!this.dungeonData) return true;

    const half = PLAYER_SIZE / 2;
    const corners = [
      [worldX - half, worldZ - half],
      [worldX + half, worldZ - half],
      [worldX - half, worldZ + half],
      [worldX + half, worldZ + half],
    ];

    for (const [cx, cz] of corners) {
      const tileX = Math.floor((cx - this.dungeonOffsetX) / TILE_SIZE);
      const tileZ = Math.floor((cz - this.dungeonOffsetZ) / TILE_SIZE);

      if (tileX < 0 || tileX >= this.dungeonData.width ||
          tileZ < 0 || tileZ >= this.dungeonData.height) {
        return false;
      }

      const tile = this.dungeonData.tiles[tileZ][tileX];
      if (tile === TileType.Empty || tile === TileType.Wall) {
        return false;
      }
    }

    return true;
  }

  isNear(x: number, z: number, range: number = TILE_SIZE * 1.5): boolean {
    const dx = this.position.x - x;
    const dz = this.position.z - z;
    return Math.sqrt(dx * dx + dz * dz) < range;
  }
}

/**
 * Boss enemy with special abilities.
 *
 * Bosses appear in the exit room of each floor. They are larger, tougher,
 * and have unique abilities based on their BossConfig.
 */

import * as THREE from 'three';
import {
  ENEMY_HP, ENEMY_ATTACK_DAMAGE, TILE_SIZE,
} from '../utils/constants';
import { events } from '../utils/EventBus';
import { DungeonData, TileType } from '../dungeon/DungeonGenerator';
import { BossConfig, BossAbility } from '../dungeon/FloorConfig';

export type BossState = 'idle' | 'chase' | 'attack' | 'ability' | 'dead';

export class Boss {
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;

  hp: number;
  maxHp: number;
  alive: boolean = true;
  state: BossState = 'idle';
  readonly isBoss = true;

  // Config
  private config: BossConfig;
  private floor: number;
  private speed: number;
  damage: number;

  // AI
  private attackCooldown: number = 0;
  private abilityCooldown: number = 0;
  private abilityTimer: number = 0;
  private currentAbility: BossAbility | null = null;
  private enraged: boolean = false;

  // Charge state
  private chargeDirection = new THREE.Vector3();
  private chargeTimer: number = 0;

  // Slam state
  private slamTimer: number = 0;

  // Summon tracking
  private summonCount: number = 0;

  // Visual
  private bodyMaterial: THREE.MeshLambertMaterial;
  private hitFlashTimer: number = 0;
  private deathTimer: number = 0;
  private readonly deathDuration = 1.0;
  private nameTag: THREE.Mesh | null = null;

  // Health bar
  private healthBarFg: THREE.Mesh;
  private healthBarBg: THREE.Mesh;

  // Collision
  private dungeonData: DungeonData | null = null;
  private dungeonOffsetX = 0;
  private dungeonOffsetZ = 0;

  constructor(x: number, z: number, floor: number, config: BossConfig) {
    this.config = config;
    this.floor = floor;
    this.speed = config.speed;
    this.damage = Math.round(ENEMY_ATTACK_DAMAGE * config.dmgMultiplier);

    const baseHp = ENEMY_HP * config.hpMultiplier;
    this.maxHp = Math.round(baseHp * (1 + (floor - 1) * 0.3));
    this.hp = this.maxHp;

    this.mesh = new THREE.Group();
    const size = 0.5 * config.scale;
    const height = 0.8 * config.scale;

    // Body
    const bodyGeo = new THREE.BoxGeometry(size, height, size);
    this.bodyMaterial = new THREE.MeshLambertMaterial({ color: config.color });
    const body = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    body.castShadow = true;
    body.position.y = height / 2;
    this.mesh.add(body);

    // Crown/horns to distinguish from regular enemies
    const crownGeo = new THREE.ConeGeometry(size * 0.3, size * 0.5, 4);
    const crownMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = height + size * 0.2;
    this.mesh.add(crown);

    // Eyes (larger, glowing)
    const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-size * 0.25, height * 0.75, -size / 2 - 0.01);
    this.mesh.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(size * 0.25, height * 0.75, -size / 2 - 0.01);
    this.mesh.add(rightEye);

    // Health bar (wider for bosses)
    const barWidth = 1.2;
    const hbBgGeo = new THREE.BoxGeometry(barWidth, 0.08, 0.08);
    const hbBgMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    this.healthBarBg = new THREE.Mesh(hbBgGeo, hbBgMat);
    this.healthBarBg.position.y = height + size * 0.6;
    this.mesh.add(this.healthBarBg);

    const hbFgGeo = new THREE.BoxGeometry(barWidth, 0.08, 0.08);
    const hbFgMat = new THREE.MeshBasicMaterial({ color: 0xcc2222 });
    this.healthBarFg = new THREE.Mesh(hbFgGeo, hbFgMat);
    this.healthBarFg.position.y = height + size * 0.6;
    this.mesh.add(this.healthBarFg);

    this.mesh.position.set(x, 0, z);
    this.position = this.mesh.position;

    // Initial ability cooldown
    this.abilityCooldown = 3;
  }

  setDungeonCollision(dungeon: DungeonData): void {
    this.dungeonData = dungeon;
    this.dungeonOffsetX = -(dungeon.width * TILE_SIZE) / 2;
    this.dungeonOffsetZ = -(dungeon.height * TILE_SIZE) / 2;
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashTimer = 0.15;
    this.updateHealthBar();

    events.emit('enemyDamaged', this.position.x, this.position.z, amount);

    // Enrage at low HP if ability available
    if (!this.enraged && this.hp < this.maxHp * 0.3 && this.config.abilities.includes('enrage')) {
      this.enrage();
    }

    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'dead';
      this.deathTimer = this.deathDuration;
      events.emit('bossKilled', this.position.x, this.position.z, this.floor);
      events.emit('enemyKilled', this.position.x, this.position.z);
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

    if (!this.alive) {
      this.deathTimer -= dt;
      const t = Math.max(0, this.deathTimer / this.deathDuration);
      this.mesh.scale.set(t, t, t);
      this.mesh.position.y = (1 - t) * -0.5;
      return;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.abilityCooldown > 0) this.abilityCooldown -= dt;

    const dx = playerX - this.position.x;
    const dz = playerZ - this.position.z;
    const distToPlayer = Math.sqrt(dx * dx + dz * dz);

    // Face player
    if (distToPlayer > 0.1) {
      this.mesh.rotation.y = Math.atan2(dx, dz);
    }

    // Handle active ability
    if (this.state === 'ability') {
      this.updateAbility(dt, playerX, playerZ);
      return;
    }

    // Try to use ability
    if (this.abilityCooldown <= 0 && distToPlayer < 10) {
      const ability = this.pickAbility(distToPlayer);
      if (ability) {
        this.startAbility(ability, playerX, playerZ);
        return;
      }
    }

    // Standard combat AI
    if (distToPlayer <= 1.2) {
      // Attack
      if (this.attackCooldown <= 0) {
        this.attackCooldown = this.config.attackCooldown * (this.enraged ? 0.6 : 1);
        events.emit('enemyAttack', this, this.damage * (this.enraged ? 1.3 : 1));
      }
    } else if (distToPlayer < 12) {
      // Chase
      const spd = this.speed * (this.enraged ? 1.4 : 1);
      const moveX = (dx / distToPlayer) * spd * dt;
      const moveZ = (dz / distToPlayer) * spd * dt;
      this.tryMove(moveX, moveZ);
    }
  }

  private pickAbility(distToPlayer: number): BossAbility | null {
    const available = this.config.abilities.filter(a => {
      if (a === 'enrage') return false; // triggered automatically
      if (a === 'charge' && distToPlayer < 3) return false; // need distance to charge
      if (a === 'summon' && this.summonCount >= 3) return false; // limit summons
      return true;
    });
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  private startAbility(ability: BossAbility, playerX: number, playerZ: number): void {
    this.state = 'ability';
    this.currentAbility = ability;

    const dx = playerX - this.position.x;
    const dz = playerZ - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    switch (ability) {
      case 'charge':
        this.chargeDirection.set(dx / dist, 0, dz / dist);
        this.chargeTimer = 0.6;
        this.abilityCooldown = 4;
        break;
      case 'slam':
        this.slamTimer = 0.5;
        this.abilityCooldown = 5;
        break;
      case 'summon':
        this.summonCount++;
        this.abilityCooldown = 8;
        events.emit('bossSummon', this.position.x, this.position.z, this.floor);
        this.abilityTimer = 0.5; // brief pause
        break;
      case 'teleport':
        // Teleport near player
        const angle = Math.random() * Math.PI * 2;
        const teleportDist = 2 + Math.random() * 2;
        const newX = playerX + Math.cos(angle) * teleportDist;
        const newZ = playerZ + Math.sin(angle) * teleportDist;
        if (this.isWalkable(newX, newZ)) {
          this.position.x = newX;
          this.position.z = newZ;
        }
        this.abilityCooldown = 6;
        this.abilityTimer = 0.3;
        break;
    }
  }

  private updateAbility(dt: number, playerX: number, playerZ: number): void {
    switch (this.currentAbility) {
      case 'charge': {
        this.chargeTimer -= dt;
        if (this.chargeTimer <= 0) {
          this.state = 'chase';
          this.currentAbility = null;
          break;
        }
        // Rush forward fast
        const chargeSpeed = this.speed * 4;
        const mx = this.chargeDirection.x * chargeSpeed * dt;
        const mz = this.chargeDirection.z * chargeSpeed * dt;
        this.tryMove(mx, mz);

        // Check if hitting player during charge
        const cdx = playerX - this.position.x;
        const cdz = playerZ - this.position.z;
        if (Math.sqrt(cdx * cdx + cdz * cdz) < 1.2) {
          events.emit('enemyAttack', this, Math.round(this.damage * 1.5));
          this.chargeTimer = 0;
          this.state = 'chase';
          this.currentAbility = null;
        }
        break;
      }
      case 'slam': {
        this.slamTimer -= dt;
        if (this.slamTimer <= 0) {
          // AoE damage around boss
          const sdx = playerX - this.position.x;
          const sdz = playerZ - this.position.z;
          const slamRange = 2.5;
          if (Math.sqrt(sdx * sdx + sdz * sdz) < slamRange) {
            events.emit('enemyAttack', this, Math.round(this.damage * 2));
          }
          events.emit('bossSlam', this.position.x, this.position.z);
          this.state = 'chase';
          this.currentAbility = null;
        } else {
          // Visual: boss rises up before slamming
          this.mesh.position.y = this.slamTimer * 2;
        }
        break;
      }
      case 'summon':
      case 'teleport':
        this.abilityTimer -= dt;
        if (this.abilityTimer <= 0) {
          this.state = 'chase';
          this.currentAbility = null;
        }
        break;
    }
  }

  private enrage(): void {
    this.enraged = true;
    this.bodyMaterial.color.setHex(0xff2200);
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
    const half = 0.5 * this.config.scale / 2;
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

  private updateHealthBar(): void {
    const ratio = this.hp / this.maxHp;
    this.healthBarFg.scale.x = Math.max(0.001, ratio);
    this.healthBarFg.position.x = -0.6 * (1 - ratio);
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

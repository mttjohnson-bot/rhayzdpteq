import * as THREE from 'three';
import {
  ENEMY_HP, ENEMY_SPEED, ENEMY_ATTACK_DAMAGE, ENEMY_ATTACK_RANGE,
  ENEMY_ATTACK_COOLDOWN, ENEMY_CHASE_RANGE, ENEMY_PATROL_RANGE,
  ENEMY_SIZE, ENEMY_HEIGHT, COLORS, TILE_SIZE,
} from '../utils/constants';
import { events } from '../utils/EventBus';
import { DungeonData, TileType } from '../dungeon/DungeonGenerator';

export type EnemyState = 'patrol' | 'chase' | 'attack' | 'dead';

export class Enemy {
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;

  hp: number;
  maxHp: number;
  alive: boolean = true;
  state: EnemyState = 'patrol';

  // AI
  private patrolOrigin: THREE.Vector3;
  private patrolTarget: THREE.Vector3;
  private attackCooldown: number = 0;
  private patrolWaitTimer: number = 0;

  // Visual
  private bodyMaterial: THREE.MeshLambertMaterial;
  private hitFlashTimer: number = 0;
  private deathTimer: number = 0;
  private readonly deathDuration = 0.5;

  // Health bar
  private healthBarFg: THREE.Mesh;
  private healthBarBg: THREE.Mesh;

  // Collision
  private dungeonData: DungeonData | null = null;
  private dungeonOffsetX = 0;
  private dungeonOffsetZ = 0;

  // Scaling per floor
  private speed: number;
  damage: number;

  constructor(x: number, z: number, floor: number) {
    const hpScale = 1 + (floor - 1) * 0.3;
    const dmgScale = 1 + (floor - 1) * 0.2;

    this.maxHp = Math.round(ENEMY_HP * hpScale);
    this.hp = this.maxHp;
    this.speed = ENEMY_SPEED * (1 + (floor - 1) * 0.05);
    this.damage = Math.round(ENEMY_ATTACK_DAMAGE * dmgScale);

    this.mesh = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(ENEMY_SIZE, ENEMY_HEIGHT, ENEMY_SIZE);
    this.bodyMaterial = new THREE.MeshLambertMaterial({ color: COLORS.enemy });
    const body = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    body.castShadow = true;
    body.position.y = ENEMY_HEIGHT / 2;
    this.mesh.add(body);

    // Eyes (two small white cubes)
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.12, ENEMY_HEIGHT * 0.7, -ENEMY_SIZE / 2 - 0.01);
    this.mesh.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.12, ENEMY_HEIGHT * 0.7, -ENEMY_SIZE / 2 - 0.01);
    this.mesh.add(rightEye);

    // Health bar background
    const hbBgGeo = new THREE.BoxGeometry(0.6, 0.06, 0.06);
    const hbBgMat = new THREE.MeshBasicMaterial({ color: COLORS.healthBarBg });
    this.healthBarBg = new THREE.Mesh(hbBgGeo, hbBgMat);
    this.healthBarBg.position.y = ENEMY_HEIGHT + 0.25;
    this.mesh.add(this.healthBarBg);

    // Health bar foreground
    const hbFgGeo = new THREE.BoxGeometry(0.6, 0.06, 0.06);
    const hbFgMat = new THREE.MeshBasicMaterial({ color: COLORS.healthBar });
    this.healthBarFg = new THREE.Mesh(hbFgGeo, hbFgMat);
    this.healthBarFg.position.y = ENEMY_HEIGHT + 0.25;
    this.mesh.add(this.healthBarFg);

    this.mesh.position.set(x, 0, z);
    this.position = this.mesh.position;

    this.patrolOrigin = new THREE.Vector3(x, 0, z);
    this.patrolTarget = new THREE.Vector3(x, 0, z);
    this.pickNewPatrolTarget();
  }

  setDungeonCollision(dungeon: DungeonData): void {
    this.dungeonData = dungeon;
    this.dungeonOffsetX = -(dungeon.width * TILE_SIZE) / 2;
    this.dungeonOffsetZ = -(dungeon.height * TILE_SIZE) / 2;
  }

  takeDamage(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hitFlashTimer = 0.12;
    this.updateHealthBar();

    events.emit('enemyDamaged', this.position.x, this.position.z, amount);

    if (this.hp <= 0) {
      this.alive = false;
      this.state = 'dead';
      this.deathTimer = this.deathDuration;
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
      this.bodyMaterial.color.setHex(COLORS.enemyHit);
    } else if (this.alive) {
      this.bodyMaterial.color.setHex(COLORS.enemy);
    }

    if (!this.alive) {
      // Death animation: shrink and fade
      this.deathTimer -= dt;
      const t = Math.max(0, this.deathTimer / this.deathDuration);
      this.mesh.scale.set(t, t, t);
      this.mesh.position.y = (1 - t) * -0.5;
      return;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    const dx = playerX - this.position.x;
    const dz = playerZ - this.position.z;
    const distToPlayer = Math.sqrt(dx * dx + dz * dz);

    // Face towards player when in chase/attack range
    if (distToPlayer < ENEMY_CHASE_RANGE) {
      const faceAngle = Math.atan2(dx, dz);
      this.mesh.rotation.y = faceAngle;
    }

    // State transitions
    if (distToPlayer <= ENEMY_ATTACK_RANGE) {
      this.state = 'attack';
    } else if (distToPlayer <= ENEMY_CHASE_RANGE) {
      this.state = 'chase';
    } else {
      this.state = 'patrol';
    }

    switch (this.state) {
      case 'patrol':
        this.updatePatrol(dt);
        break;
      case 'chase':
        this.updateChase(dt, playerX, playerZ, distToPlayer);
        break;
      case 'attack':
        this.updateAttack(dt);
        break;
    }
  }

  private updatePatrol(dt: number): void {
    if (this.patrolWaitTimer > 0) {
      this.patrolWaitTimer -= dt;
      return;
    }

    const dx = this.patrolTarget.x - this.position.x;
    const dz = this.patrolTarget.z - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.2) {
      this.patrolWaitTimer = 1 + Math.random() * 2;
      this.pickNewPatrolTarget();
      return;
    }

    const moveX = (dx / dist) * this.speed * 0.5 * dt;
    const moveZ = (dz / dist) * this.speed * 0.5 * dt;
    this.tryMove(moveX, moveZ);

    // Face patrol direction
    this.mesh.rotation.y = Math.atan2(dx, dz);
  }

  private updateChase(dt: number, playerX: number, playerZ: number, dist: number): void {
    if (dist < 0.1) return;
    const dx = playerX - this.position.x;
    const dz = playerZ - this.position.z;
    const moveX = (dx / dist) * this.speed * dt;
    const moveZ = (dz / dist) * this.speed * dt;
    this.tryMove(moveX, moveZ);
  }

  private updateAttack(_dt: number): void {
    if (this.attackCooldown <= 0) {
      this.attackCooldown = ENEMY_ATTACK_COOLDOWN;
      events.emit('enemyAttack', this, this.damage);
    }
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

    const half = ENEMY_SIZE / 2;
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

  private pickNewPatrolTarget(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * ENEMY_PATROL_RANGE;
    this.patrolTarget.set(
      this.patrolOrigin.x + Math.cos(angle) * dist,
      0,
      this.patrolOrigin.z + Math.sin(angle) * dist,
    );
  }

  private updateHealthBar(): void {
    const ratio = this.hp / this.maxHp;
    this.healthBarFg.scale.x = Math.max(0.001, ratio);
    this.healthBarFg.position.x = -0.3 * (1 - ratio);
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

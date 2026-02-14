import * as THREE from 'three';
import {
  ENEMY_HP, ENEMY_SPEED, ENEMY_ATTACK_DAMAGE,
  ENEMY_CHASE_RANGE, ENEMY_PATROL_RANGE,
  ENEMY_SIZE, ENEMY_HEIGHT, COLORS, TILE_SIZE,
  EnemyTypeId, EnemyTypeConfig, ENEMY_TYPES,
  CAPTAIN_SCALE, CAPTAIN_HP_MULT, CAPTAIN_DMG_MULT,
} from '../utils/constants';
import { events } from '../utils/EventBus';
import { DungeonData, TileType } from '../dungeon/DungeonGenerator';
import { FloorDifficulty } from '../dungeon/FloorConfig';
import { createOcclusionSilhouette } from '../rendering/OcclusionOutline';

export type EnemyState = 'patrol' | 'chase' | 'attack' | 'dead';

export class Enemy {
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;

  hp: number;
  maxHp: number;
  alive: boolean = true;
  state: EnemyState = 'patrol';

  // Type info
  readonly enemyType: EnemyTypeConfig;
  readonly isCaptain: boolean;

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
  private attackRange: number;
  private attackCooldownBase: number;
  readonly collisionRadius: number;

  constructor(
    x: number, z: number, floor: number,
    difficulty?: FloorDifficulty,
    typeId?: EnemyTypeId,
    captain?: boolean,
  ) {
    const type = typeId ? ENEMY_TYPES[typeId] : ENEMY_TYPES.grunt;
    this.enemyType = type;
    this.isCaptain = captain ?? false;

    const hpScale = difficulty ? difficulty.enemyHpScale : (1 + (floor - 1) * 0.3);
    const dmgScale = difficulty ? difficulty.enemyDmgScale : (1 + (floor - 1) * 0.2);
    const spdScale = difficulty ? difficulty.enemySpeedScale : (1 + (floor - 1) * 0.05);

    const captainHpMult = this.isCaptain ? CAPTAIN_HP_MULT : 1;
    const captainDmgMult = this.isCaptain ? CAPTAIN_DMG_MULT : 1;
    const captainSizeMult = this.isCaptain ? CAPTAIN_SCALE : 1;

    this.maxHp = Math.round(ENEMY_HP * hpScale * type.hpMult * captainHpMult);
    this.hp = this.maxHp;
    this.speed = ENEMY_SPEED * spdScale * type.speedMult;
    this.damage = Math.round(ENEMY_ATTACK_DAMAGE * dmgScale * type.dmgMult * captainDmgMult);
    this.attackRange = type.attackRange;
    this.attackCooldownBase = type.attackCooldown;

    const bodyScale = type.bodyScale * captainSizeMult;
    const size = ENEMY_SIZE * bodyScale;
    const height = ENEMY_HEIGHT * type.heightScale * captainSizeMult;
    this.collisionRadius = size / 2;

    this.mesh = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(size, height, size);
    this.bodyMaterial = new THREE.MeshLambertMaterial({ color: type.color });
    const body = new THREE.Mesh(bodyGeo, this.bodyMaterial);
    body.castShadow = true;
    body.position.y = height / 2;
    this.mesh.add(body);

    // Occlusion silhouette: visible through walls
    const silhouette = createOcclusionSilhouette(size, height, size, 0xff6644, height / 2);
    this.mesh.add(silhouette);

    // Type-specific decorations
    this.addTypeDecorations(type, size, height);

    // Captain crown
    if (this.isCaptain) {
      const crownGeo = new THREE.ConeGeometry(size * 0.25, size * 0.4, 4);
      const crownMat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.y = height + size * 0.15;
      this.mesh.add(crown);
    }

    // Eyes
    const eyeSize = 0.08 * bodyScale;
    const eyeGeo = new THREE.BoxGeometry(eyeSize, eyeSize, eyeSize);
    const eyeColor = type.id === 'mage' ? 0xaa44ff : type.id === 'assassin' ? 0xff0000 : 0xffffff;
    const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-size * 0.24, height * 0.7, -size / 2 - 0.01);
    this.mesh.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(size * 0.24, height * 0.7, -size / 2 - 0.01);
    this.mesh.add(rightEye);

    // Health bar background
    const barWidth = 0.6 * bodyScale;
    const hbBgGeo = new THREE.BoxGeometry(barWidth, 0.06, 0.06);
    const hbBgMat = new THREE.MeshBasicMaterial({ color: COLORS.healthBarBg });
    this.healthBarBg = new THREE.Mesh(hbBgGeo, hbBgMat);
    this.healthBarBg.position.y = height + 0.25;
    this.mesh.add(this.healthBarBg);

    // Health bar foreground
    const hbFgGeo = new THREE.BoxGeometry(barWidth, 0.06, 0.06);
    const hbFgMat = new THREE.MeshBasicMaterial({ color: COLORS.healthBar });
    this.healthBarFg = new THREE.Mesh(hbFgGeo, hbFgMat);
    this.healthBarFg.position.y = height + 0.25;
    this.mesh.add(this.healthBarFg);

    this.mesh.position.set(x, 0, z);
    this.position = this.mesh.position;

    this.patrolOrigin = new THREE.Vector3(x, 0, z);
    this.patrolTarget = new THREE.Vector3(x, 0, z);
    this.pickNewPatrolTarget();
  }

  private addTypeDecorations(type: EnemyTypeConfig, size: number, height: number): void {
    switch (type.id) {
      case 'brute': {
        // Shoulder pads
        const padGeo = new THREE.BoxGeometry(size * 0.3, size * 0.2, size * 0.3);
        const padMat = new THREE.MeshLambertMaterial({ color: 0x664422 });
        const lPad = new THREE.Mesh(padGeo, padMat);
        lPad.position.set(-size * 0.5, height * 0.8, 0);
        this.mesh.add(lPad);
        const rPad = new THREE.Mesh(padGeo, padMat);
        rPad.position.set(size * 0.5, height * 0.8, 0);
        this.mesh.add(rPad);
        break;
      }
      case 'archer': {
        // Quiver on back
        const quiverGeo = new THREE.CylinderGeometry(0.04, 0.04, height * 0.4, 4);
        const quiverMat = new THREE.MeshLambertMaterial({ color: 0x886633 });
        const quiver = new THREE.Mesh(quiverGeo, quiverMat);
        quiver.position.set(0, height * 0.6, size * 0.4);
        this.mesh.add(quiver);
        break;
      }
      case 'mage': {
        // Hat/pointed top
        const hatGeo = new THREE.ConeGeometry(size * 0.3, size * 0.5, 6);
        const hatMat = new THREE.MeshLambertMaterial({ color: 0x4422aa });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.y = height + size * 0.1;
        this.mesh.add(hat);
        break;
      }
      case 'assassin': {
        // Hood/cloak (smaller triangular shape on top)
        const hoodGeo = new THREE.ConeGeometry(size * 0.35, size * 0.3, 3);
        const hoodMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const hood = new THREE.Mesh(hoodGeo, hoodMat);
        hood.position.y = height + size * 0.05;
        this.mesh.add(hood);
        break;
      }
    }
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
      this.bodyMaterial.color.setHex(this.enemyType.color);
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
    if (distToPlayer <= this.attackRange) {
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

    // Don't get closer than 0.8 to player (collision avoidance)
    const minDist = 0.8;
    if (dist < minDist) return;

    const moveX = (dx / dist) * this.speed * dt;
    const moveZ = (dz / dist) * this.speed * dt;
    this.tryMove(moveX, moveZ);
  }

  private updateAttack(_dt: number): void {
    if (this.attackCooldown <= 0) {
      this.attackCooldown = this.attackCooldownBase;
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

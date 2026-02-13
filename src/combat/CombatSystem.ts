import * as THREE from 'three';
import { Enemy } from './Enemy';
import { Boss } from './Boss';
import { Player } from '../game/Player';
import {
  PLAYER_ATTACK_RANGE, PLAYER_ATTACK_ARC,
} from '../utils/constants';
import { events } from '../utils/EventBus';
import { DungeonData } from '../dungeon/DungeonGenerator';
import { ComputedStats } from '../rpg/Stats';
import { getFloorConfig } from '../dungeon/FloorConfig';

export class CombatSystem {
  private enemies: Enemy[] = [];
  private bosses: Boss[] = [];
  private scene: THREE.Scene;
  private player: Player;
  private computedStats: ComputedStats | null = null;
  private currentDungeon: DungeonData | null = null;

  constructor(scene: THREE.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    events.on('playerAttack', this.onPlayerAttack);
    events.on('enemyAttack', this.onEnemyAttack);
    events.on('bossSummon', this.onBossSummon);
  }

  setComputedStats(stats: ComputedStats): void {
    this.computedStats = stats;
  }

  spawnEnemiesForDungeon(dungeon: DungeonData, floor: number, offsetX: number, offsetZ: number): void {
    this.clearEnemies();
    this.currentDungeon = dungeon;

    const config = getFloorConfig(floor);

    for (const room of dungeon.rooms) {
      if (room === dungeon.entranceRoom) continue;

      // Boss room (exit room) - spawn boss instead of regular enemies
      if (room === dungeon.exitRoom) {
        const bossX = room.centerX + offsetX + 0.5;
        const bossZ = room.centerZ + offsetZ + 0.5;
        const boss = new Boss(bossX, bossZ, floor, config.boss);
        boss.setDungeonCollision(dungeon);
        this.bosses.push(boss);
        this.scene.add(boss.mesh);
        continue;
      }

      const count = config.difficulty.enemyCountMin +
        Math.floor(Math.random() * (config.difficulty.enemyCountExtra + 1));
      for (let i = 0; i < count; i++) {
        const wx = (room.x + 1 + Math.random() * (room.width - 2)) + offsetX + 0.5;
        const wz = (room.z + 1 + Math.random() * (room.height - 2)) + offsetZ + 0.5;

        const enemy = new Enemy(wx, wz, floor, config.difficulty);
        enemy.setDungeonCollision(dungeon);
        this.enemies.push(enemy);
        this.scene.add(enemy.mesh);
      }
    }
  }

  update(dt: number): void {
    const px = this.player.position.x;
    const pz = this.player.position.z;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt, px, pz);

      if (enemy.shouldRemove) {
        this.scene.remove(enemy.mesh);
        enemy.dispose();
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.bosses.length - 1; i >= 0; i--) {
      const boss = this.bosses[i];
      boss.update(dt, px, pz);

      if (boss.shouldRemove) {
        this.scene.remove(boss.mesh);
        boss.dispose();
        this.bosses.splice(i, 1);
      }
    }
  }

  clearEnemies(): void {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh);
      enemy.dispose();
    }
    this.enemies = [];

    for (const boss of this.bosses) {
      this.scene.remove(boss.mesh);
      boss.dispose();
    }
    this.bosses = [];
  }

  get enemyCount(): number {
    return this.enemies.filter(e => e.alive).length +
           this.bosses.filter(b => b.alive).length;
  }

  /** Check if all bosses on the floor are defeated */
  get bossDefeated(): boolean {
    return this.bosses.length === 0 || this.bosses.every(b => !b.alive);
  }

  private onPlayerAttack = (_px: unknown, _pz: unknown, _angle: unknown): void => {
    const px = _px as number;
    const pz = _pz as number;
    const angle = _angle as number;

    const baseDamage = this.computedStats ? this.computedStats.attack : 20;
    const critChance = this.computedStats ? this.computedStats.critChance : 0;
    const critMult = this.computedStats ? this.computedStats.critMultiplier : 1.5;

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;
      this.tryHitTarget(enemy, px, pz, angle, baseDamage, critChance, critMult);
    }

    for (const boss of this.bosses) {
      if (!boss.alive) continue;
      this.tryHitTarget(boss, px, pz, angle, baseDamage, critChance, critMult);
    }
  };

  private tryHitTarget(
    target: { position: THREE.Vector3; alive: boolean; takeDamage: (n: number) => void },
    px: number, pz: number, angle: number,
    baseDamage: number, critChance: number, critMult: number,
  ): void {
    const dx = target.position.x - px;
    const dz = target.position.z - pz;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist > PLAYER_ATTACK_RANGE) return;

    const angleToTarget = Math.atan2(dz, dx);
    let angleDiff = angleToTarget - angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) <= PLAYER_ATTACK_ARC / 2) {
      const isCrit = Math.random() < critChance;
      const damage = Math.round(isCrit ? baseDamage * critMult : baseDamage);
      target.takeDamage(damage);
      if (isCrit) {
        events.emit('damageNumber', target.position.x, target.position.z, damage, false, true);
      }
    }
  }

  private onEnemyAttack = (_enemy: unknown, _damage: unknown): void => {
    const enemy = _enemy as Enemy | Boss;
    const rawDamage = _damage as number;

    const dx = this.player.position.x - enemy.position.x;
    const dz = this.player.position.z - enemy.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= 1.5 && this.player.alive) {
      const defense = this.computedStats ? this.computedStats.defense : 0;
      const damage = Math.max(1, Math.round(rawDamage - defense * 0.5));
      this.player.takeDamage(damage);
      events.emit('damageNumber', this.player.position.x, this.player.position.z, damage, true);
    }
  };

  private onBossSummon = (_x: unknown, _z: unknown, _floor: unknown): void => {
    const x = _x as number;
    const z = _z as number;
    const floor = _floor as number;

    if (!this.currentDungeon) return;

    const config = getFloorConfig(floor);
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const dist = 2 + Math.random();
      const sx = x + Math.cos(angle) * dist;
      const sz = z + Math.sin(angle) * dist;

      const enemy = new Enemy(sx, sz, floor, config.difficulty);
      enemy.setDungeonCollision(this.currentDungeon);
      this.enemies.push(enemy);
      this.scene.add(enemy.mesh);
    }
  };

  dispose(): void {
    events.off('playerAttack', this.onPlayerAttack);
    events.off('enemyAttack', this.onEnemyAttack);
    events.off('bossSummon', this.onBossSummon);
    this.clearEnemies();
  }
}

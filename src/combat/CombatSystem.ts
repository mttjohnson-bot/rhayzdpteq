import * as THREE from 'three';
import { Enemy } from './Enemy';
import { Player } from '../game/Player';
import {
  PLAYER_ATTACK_RANGE, PLAYER_ATTACK_ARC,
} from '../utils/constants';
import { events } from '../utils/EventBus';
import { DungeonData } from '../dungeon/DungeonGenerator';
import { ComputedStats } from '../rpg/Stats';

export class CombatSystem {
  private enemies: Enemy[] = [];
  private scene: THREE.Scene;
  private player: Player;
  private computedStats: ComputedStats | null = null;

  constructor(scene: THREE.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    events.on('playerAttack', this.onPlayerAttack);
    events.on('enemyAttack', this.onEnemyAttack);
  }

  setComputedStats(stats: ComputedStats): void {
    this.computedStats = stats;
  }

  spawnEnemiesForDungeon(dungeon: DungeonData, floor: number, offsetX: number, offsetZ: number): void {
    this.clearEnemies();

    for (const room of dungeon.rooms) {
      if (room === dungeon.entranceRoom || room === dungeon.exitRoom) continue;

      const count = 1 + Math.floor(Math.random() * Math.min(floor, 3));
      for (let i = 0; i < count; i++) {
        const wx = (room.x + 1 + Math.random() * (room.width - 2)) + offsetX + 0.5;
        const wz = (room.z + 1 + Math.random() * (room.height - 2)) + offsetZ + 0.5;

        const enemy = new Enemy(wx, wz, floor);
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
  }

  clearEnemies(): void {
    for (const enemy of this.enemies) {
      this.scene.remove(enemy.mesh);
      enemy.dispose();
    }
    this.enemies = [];
  }

  get enemyCount(): number {
    return this.enemies.filter(e => e.alive).length;
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

      const dx = enemy.position.x - px;
      const dz = enemy.position.z - pz;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > PLAYER_ATTACK_RANGE) continue;

      const angleToEnemy = Math.atan2(dz, dx);
      let angleDiff = angleToEnemy - angle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) <= PLAYER_ATTACK_ARC / 2) {
        const isCrit = Math.random() < critChance;
        const damage = Math.round(isCrit ? baseDamage * critMult : baseDamage);
        enemy.takeDamage(damage);
        if (isCrit) {
          events.emit('damageNumber', enemy.position.x, enemy.position.z, damage, false, true);
        }
      }
    }
  };

  private onEnemyAttack = (_enemy: unknown, _damage: unknown): void => {
    const enemy = _enemy as Enemy;
    const rawDamage = _damage as number;

    const dx = this.player.position.x - enemy.position.x;
    const dz = this.player.position.z - enemy.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= 1.2 && this.player.alive) {
      const defense = this.computedStats ? this.computedStats.defense : 0;
      const damage = Math.max(1, Math.round(rawDamage - defense * 0.5));
      this.player.takeDamage(damage);
      events.emit('damageNumber', this.player.position.x, this.player.position.z, damage, true);
    }
  };

  dispose(): void {
    events.off('playerAttack', this.onPlayerAttack);
    events.off('enemyAttack', this.onEnemyAttack);
    this.clearEnemies();
  }
}

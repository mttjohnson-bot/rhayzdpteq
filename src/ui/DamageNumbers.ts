import * as THREE from 'three';
import { events } from '../utils/EventBus';

interface DamagePopup {
  el: HTMLDivElement;
  worldX: number;
  worldZ: number;
  timer: number;
  vy: number;
  offsetY: number;
}

const POPUP_DURATION = 0.8;

export class DamageNumbers {
  private container: HTMLDivElement;
  private popups: DamagePopup[] = [];
  private camera: THREE.Camera | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'damage-numbers';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      overflow: 'hidden',
    });

    events.on('enemyDamaged', this.onEnemyDamaged);
    events.on('damageNumber', this.onDamageNumber);
  }

  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  show(): void {
    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  hide(): void {
    this.container.remove();
    this.clear();
  }

  update(dt: number): void {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.timer -= dt;
      p.offsetY += p.vy * dt;
      p.vy += 60 * dt; // decelerate upward motion (starts negative)

      if (p.timer <= 0) {
        p.el.remove();
        this.popups.splice(i, 1);
        continue;
      }

      // Project world position to screen
      if (this.camera) {
        const pos = new THREE.Vector3(p.worldX, 1.5 + p.offsetY * 0.01, p.worldZ);
        pos.project(this.camera);

        const x = (pos.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-pos.y * 0.5 + 0.5) * window.innerHeight + p.offsetY;

        p.el.style.left = `${x}px`;
        p.el.style.top = `${y}px`;
        p.el.style.opacity = `${Math.min(1, p.timer / 0.2)}`;
      }
    }
  }

  clear(): void {
    for (const p of this.popups) {
      p.el.remove();
    }
    this.popups = [];
  }

  private spawnPopup(worldX: number, worldZ: number, amount: number, isPlayerDamage: boolean): void {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontWeight: 'bold',
      fontSize: isPlayerDamage ? '1.3rem' : '1.1rem',
      color: isPlayerDamage ? '#ff4444' : '#ffcc00',
      textShadow: '1px 1px 2px #000, -1px -1px 2px #000',
      transform: 'translate(-50%, -50%)',
      whiteSpace: 'nowrap',
    });
    el.textContent = `-${amount}`;
    this.container.appendChild(el);

    this.popups.push({
      el,
      worldX,
      worldZ,
      timer: POPUP_DURATION,
      vy: -80,
      offsetY: 0,
    });
  }

  private onEnemyDamaged = (_x: unknown, _z: unknown, _amount: unknown): void => {
    this.spawnPopup(_x as number, _z as number, _amount as number, false);
  };

  private onDamageNumber = (_x: unknown, _z: unknown, _amount: unknown, _isPlayer: unknown): void => {
    this.spawnPopup(_x as number, _z as number, _amount as number, _isPlayer as boolean);
  };

  dispose(): void {
    events.off('enemyDamaged', this.onEnemyDamaged);
    events.off('damageNumber', this.onDamageNumber);
    this.clear();
  }
}

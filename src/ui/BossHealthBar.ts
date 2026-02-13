/**
 * Boss health bar shown at the top of the screen during boss encounters.
 *
 * Listens to enemyDamaged events and displays when a boss is actively being fought.
 */

import { events } from '../utils/EventBus';

export class BossHealthBar {
  private container: HTMLDivElement;
  private barFill: HTMLDivElement;
  private nameEl: HTMLDivElement;
  private hpText: HTMLDivElement;
  private visible = false;
  private showTimer = 0;

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '320px',
      display: 'none',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      pointerEvents: 'none',
    });

    // Boss name
    this.nameEl = document.createElement('div');
    Object.assign(this.nameEl.style, {
      fontSize: '1rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontWeight: 'bold',
      color: '#ff6644',
      textShadow: '1px 1px 3px #000',
      textAlign: 'center',
    });
    this.container.appendChild(this.nameEl);

    // Bar background
    const barBg = document.createElement('div');
    Object.assign(barBg.style, {
      width: '100%',
      height: '14px',
      background: 'rgba(0, 0, 0, 0.7)',
      border: '1px solid rgba(255, 68, 68, 0.5)',
      borderRadius: '3px',
      overflow: 'hidden',
      position: 'relative',
    });

    this.barFill = document.createElement('div');
    Object.assign(this.barFill.style, {
      width: '100%',
      height: '100%',
      background: 'linear-gradient(180deg, #cc2222, #881111)',
      transition: 'width 0.2s ease-out',
    });
    barBg.appendChild(this.barFill);

    this.hpText = document.createElement('div');
    Object.assign(this.hpText.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '0.6rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#fff',
      textShadow: '1px 1px 1px #000',
    });
    barBg.appendChild(this.hpText);

    this.container.appendChild(barBg);

    events.on('bossKilled', this.onBossKilled);
  }

  show(): void {
    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
    this.container.style.display = 'flex';
    this.visible = true;
  }

  hide(): void {
    this.container.style.display = 'none';
    this.container.remove();
    this.visible = false;
  }

  setBoss(name: string, hp: number, maxHp: number): void {
    if (!this.visible) this.show();
    this.nameEl.textContent = name;
    this.updateBar(hp, maxHp);
  }

  updateBar(hp: number, maxHp: number): void {
    const ratio = maxHp > 0 ? hp / maxHp : 0;
    this.barFill.style.width = `${ratio * 100}%`;
    this.hpText.textContent = `${hp} / ${maxHp}`;

    // Color changes based on health
    if (ratio > 0.5) {
      this.barFill.style.background = 'linear-gradient(180deg, #cc2222, #881111)';
    } else if (ratio > 0.25) {
      this.barFill.style.background = 'linear-gradient(180deg, #cc6622, #884411)';
    } else {
      this.barFill.style.background = 'linear-gradient(180deg, #cc1111, #660000)';
    }
  }

  update(_dt: number): void {
    // Could add pulsing or animation effects here
  }

  private onBossKilled = (): void => {
    this.hide();
  };

  dispose(): void {
    events.off('bossKilled', this.onBossKilled);
    this.hide();
  }
}

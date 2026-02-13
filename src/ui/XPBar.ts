/**
 * XP bar UI element shown during dungeon exploration.
 *
 * Shows level and XP progress. Flashes on XP gain and level up.
 */

import { events } from '../utils/EventBus';

export class XPBar {
  private container: HTMLDivElement;
  private barFill: HTMLDivElement;
  private labelEl: HTMLDivElement;
  private levelUpEl: HTMLDivElement;
  private levelUpTimer = 0;

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      bottom: '46px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '200px',
      height: '10px',
      background: 'rgba(0, 0, 0, 0.6)',
      border: '1px solid rgba(170, 68, 255, 0.3)',
      borderRadius: '2px',
      overflow: 'hidden',
    });

    this.barFill = document.createElement('div');
    Object.assign(this.barFill.style, {
      width: '0%',
      height: '100%',
      background: 'linear-gradient(180deg, #aa66ff, #7733cc)',
      transition: 'width 0.3s ease-out',
    });
    this.container.appendChild(this.barFill);

    this.labelEl = document.createElement('div');
    Object.assign(this.labelEl.style, {
      position: 'absolute',
      top: '-16px',
      left: '0',
      width: '100%',
      textAlign: 'center',
      fontSize: '0.6rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#cc99ff',
      textShadow: '1px 1px 1px #000',
    });
    this.container.appendChild(this.labelEl);

    // Level up notification
    this.levelUpEl = document.createElement('div');
    Object.assign(this.levelUpEl.style, {
      position: 'absolute',
      bottom: '62px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '0.3rem 1rem',
      background: 'rgba(170, 68, 255, 0.8)',
      borderRadius: '4px',
      fontSize: '1rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontWeight: 'bold',
      color: '#fff',
      textShadow: '1px 1px 2px #000',
      display: 'none',
      pointerEvents: 'none',
    });

    events.on('levelUp', this.onLevelUp);
    events.on('xpGained', this.onXPGained);
  }

  show(): void {
    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
    overlay?.appendChild(this.levelUpEl);
  }

  hide(): void {
    this.container.remove();
    this.levelUpEl.remove();
  }

  setXP(xp: number, xpToNext: number, level: number): void {
    const progress = xpToNext > 0 ? (xp / xpToNext) * 100 : 100;
    this.barFill.style.width = `${progress}%`;
    this.labelEl.textContent = `Lv.${level}  ${xp}/${xpToNext} XP`;
  }

  update(dt: number): void {
    if (this.levelUpTimer > 0) {
      this.levelUpTimer -= dt;
      if (this.levelUpTimer <= 0) {
        this.levelUpEl.style.display = 'none';
      }
    }
  }

  private onLevelUp = (_level: unknown): void => {
    const level = _level as number;
    this.levelUpEl.textContent = `Level Up! Lv.${level}`;
    this.levelUpEl.style.display = 'block';
    this.levelUpTimer = 2.5;
  };

  private onXPGained = (_xp: unknown, _xpToNext: unknown, _level: unknown): void => {
    this.setXP(_xp as number, _xpToNext as number, _level as number);
  };

  dispose(): void {
    events.off('levelUp', this.onLevelUp);
    events.off('xpGained', this.onXPGained);
    this.hide();
  }
}

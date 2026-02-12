import { events } from '../utils/EventBus';

export class HealthBar {
  private container: HTMLDivElement;
  private barFill: HTMLDivElement;
  private hpText: HTMLDivElement;
  private currentHp: number = 100;
  private maxHp: number = 100;

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '200px',
      height: '20px',
      background: 'rgba(0, 0, 0, 0.7)',
      border: '1px solid rgba(170, 68, 255, 0.4)',
      borderRadius: '3px',
      overflow: 'hidden',
    });

    this.barFill = document.createElement('div');
    Object.assign(this.barFill.style, {
      width: '100%',
      height: '100%',
      background: 'linear-gradient(180deg, #55dd55, #33aa33)',
      transition: 'width 0.15s ease-out',
    });
    this.container.appendChild(this.barFill);

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
      fontSize: '0.7rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#fff',
      textShadow: '1px 1px 1px #000',
      pointerEvents: 'none',
    });
    this.container.appendChild(this.hpText);

    events.on('playerDamaged', this.onPlayerDamaged);
  }

  show(): void {
    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
    this.updateDisplay();
  }

  hide(): void {
    this.container.remove();
  }

  setHealth(hp: number, maxHp: number): void {
    this.currentHp = hp;
    this.maxHp = maxHp;
    this.updateDisplay();
  }

  private updateDisplay(): void {
    const ratio = this.maxHp > 0 ? this.currentHp / this.maxHp : 0;
    this.barFill.style.width = `${ratio * 100}%`;

    // Color changes based on health
    if (ratio > 0.5) {
      this.barFill.style.background = 'linear-gradient(180deg, #55dd55, #33aa33)';
    } else if (ratio > 0.25) {
      this.barFill.style.background = 'linear-gradient(180deg, #dddd44, #aaaa22)';
    } else {
      this.barFill.style.background = 'linear-gradient(180deg, #dd4444, #aa2222)';
    }

    this.hpText.textContent = `${this.currentHp} / ${this.maxHp}`;
  }

  private onPlayerDamaged = (_hp: unknown, _maxHp: unknown): void => {
    this.setHealth(_hp as number, _maxHp as number);
  };

  dispose(): void {
    events.off('playerDamaged', this.onPlayerDamaged);
    this.hide();
  }
}

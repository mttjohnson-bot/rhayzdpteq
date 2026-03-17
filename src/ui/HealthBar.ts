import { events } from '../utils/EventBus';

export class HealthBar {
  private container: HTMLDivElement;
  private barFill: HTMLDivElement;
  private hpText: HTMLDivElement;
  private restingLabel: HTMLDivElement;
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

    this.restingLabel = document.createElement('div');
    Object.assign(this.restingLabel.style, {
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '4px',
      fontSize: '0.6rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#88ff88',
      textShadow: '0 0 4px #44aa44',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.5s ease-in-out',
    });
    this.restingLabel.textContent = 'Resting';
    this.container.appendChild(this.restingLabel);

    events.on('playerDamaged', this.onPlayerDamaged);
    events.on('playerRestingChanged', this.onRestingChanged);
    events.on('playerDeepRestingChanged', this.onDeepRestingChanged);
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

  private onRestingChanged = (resting: unknown): void => {
    this.restingLabel.style.opacity = resting ? '1' : '0';
    if (!resting) {
      this.restingLabel.textContent = 'Resting';
    }
  };

  private onDeepRestingChanged = (deepResting: unknown): void => {
    if (deepResting) {
      this.restingLabel.textContent = 'Deep Rest';
      this.restingLabel.style.color = '#aaffaa';
      this.restingLabel.style.textShadow = '0 0 6px #66cc66';
    } else {
      this.restingLabel.textContent = 'Resting';
      this.restingLabel.style.color = '#88ff88';
      this.restingLabel.style.textShadow = '0 0 4px #44aa44';
    }
  };

  dispose(): void {
    events.off('playerDamaged', this.onPlayerDamaged);
    events.off('playerRestingChanged', this.onRestingChanged);
    events.off('playerDeepRestingChanged', this.onDeepRestingChanged);
    this.hide();
  }
}

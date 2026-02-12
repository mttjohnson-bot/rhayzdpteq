export class HUD {
  private container: HTMLDivElement;
  private promptEl: HTMLDivElement;
  private floorEl: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      pointerEvents: 'none',
    });

    // Floor indicator (top-center)
    this.floorEl = document.createElement('div');
    Object.assign(this.floorEl.style, {
      position: 'absolute',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '0.3rem 1rem',
      background: 'rgba(0, 0, 0, 0.6)',
      border: '1px solid rgba(170, 68, 255, 0.4)',
      borderRadius: '4px',
      fontSize: '0.9rem',
      letterSpacing: '0.1em',
      display: 'none',
    });
    this.container.appendChild(this.floorEl);

    // Interaction prompt (shows "Press E to enter portal" etc.)
    this.promptEl = document.createElement('div');
    Object.assign(this.promptEl.style, {
      position: 'absolute',
      bottom: '15%',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '0.5rem 1.5rem',
      background: 'rgba(0, 0, 0, 0.6)',
      border: '1px solid rgba(170, 68, 255, 0.4)',
      borderRadius: '4px',
      fontSize: '1rem',
      letterSpacing: '0.05em',
      display: 'none',
    });
    this.container.appendChild(this.promptEl);
  }

  show(): void {
    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  hide(): void {
    this.container.remove();
  }

  showPrompt(text: string): void {
    this.promptEl.textContent = text;
    this.promptEl.style.display = 'block';
  }

  hidePrompt(): void {
    this.promptEl.style.display = 'none';
  }

  showFloorIndicator(floor: number): void {
    this.floorEl.textContent = `Floor ${floor}`;
    this.floorEl.style.display = 'block';
  }

  hideFloorIndicator(): void {
    this.floorEl.style.display = 'none';
  }
}

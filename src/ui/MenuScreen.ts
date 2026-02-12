export class MenuScreen {
  private container: HTMLDivElement;
  private onStart: (() => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'menu-screen';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(10, 10, 20, 0.85)',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      zIndex: '10',
    });

    const title = document.createElement('h1');
    title.textContent = 'Dungeon Ascent';
    Object.assign(title.style, {
      fontSize: '3rem',
      marginBottom: '0.5rem',
      letterSpacing: '0.1em',
      color: '#aa88ff',
      textShadow: '0 0 20px rgba(170, 68, 255, 0.5)',
    });

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Climb the tower. Defeat the darkness.';
    Object.assign(subtitle.style, {
      fontSize: '1.1rem',
      marginBottom: '2.5rem',
      color: '#888',
    });

    const startBtn = document.createElement('button');
    startBtn.textContent = 'Start Game';
    Object.assign(startBtn.style, {
      padding: '0.8rem 2.5rem',
      fontSize: '1.2rem',
      border: '2px solid #aa44ff',
      background: 'transparent',
      color: '#cc88ff',
      cursor: 'pointer',
      letterSpacing: '0.05em',
      transition: 'all 0.2s',
    });
    startBtn.addEventListener('mouseenter', () => {
      startBtn.style.background = '#aa44ff';
      startBtn.style.color = '#fff';
    });
    startBtn.addEventListener('mouseleave', () => {
      startBtn.style.background = 'transparent';
      startBtn.style.color = '#cc88ff';
    });
    startBtn.addEventListener('click', () => {
      this.onStart?.();
    });

    this.container.appendChild(title);
    this.container.appendChild(subtitle);
    this.container.appendChild(startBtn);
  }

  show(onStart: () => void): void {
    this.onStart = onStart;
    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  hide(): void {
    this.container.remove();
    this.onStart = null;
  }
}

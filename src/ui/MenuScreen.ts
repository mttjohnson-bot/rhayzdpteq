import { SaveManager } from '../game/SaveManager';

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
      marginBottom: '2rem',
      color: '#888',
    });

    this.container.appendChild(title);
    this.container.appendChild(subtitle);

    // Save info
    const saveInfo = SaveManager.getSaveInfo();
    if (saveInfo) {
      const saveEl = document.createElement('div');
      Object.assign(saveEl.style, {
        marginBottom: '1.5rem',
        padding: '0.5rem 1rem',
        background: 'rgba(170, 68, 255, 0.1)',
        border: '1px solid rgba(170, 68, 255, 0.3)',
        borderRadius: '4px',
        fontSize: '0.85rem',
        color: '#aa88cc',
        textAlign: 'center',
      });
      saveEl.textContent = `Save found: Lv.${saveInfo.level} | Floor ${saveInfo.floor}/5`;
      this.container.appendChild(saveEl);
    }

    // Start/Continue button
    const startBtn = document.createElement('button');
    startBtn.textContent = saveInfo ? 'Continue' : 'Start Game';
    Object.assign(startBtn.style, {
      padding: '0.8rem 2.5rem',
      fontSize: '1.2rem',
      border: '2px solid #aa44ff',
      background: 'transparent',
      color: '#cc88ff',
      cursor: 'pointer',
      letterSpacing: '0.05em',
      transition: 'all 0.2s',
      marginBottom: '0.8rem',
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
    this.container.appendChild(startBtn);

    // New game button (only if save exists)
    if (saveInfo) {
      const newBtn = document.createElement('button');
      newBtn.textContent = 'New Game';
      Object.assign(newBtn.style, {
        padding: '0.5rem 1.5rem',
        fontSize: '0.9rem',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        background: 'transparent',
        color: '#888',
        cursor: 'pointer',
        transition: 'all 0.2s',
      });
      newBtn.addEventListener('mouseenter', () => {
        newBtn.style.color = '#ff6644';
        newBtn.style.borderColor = '#ff6644';
      });
      newBtn.addEventListener('mouseleave', () => {
        newBtn.style.color = '#888';
        newBtn.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      });
      newBtn.addEventListener('click', () => {
        if (confirm('Delete saved progress and start a new game?')) {
          SaveManager.deleteSave();
          window.location.reload();
        }
      });
      this.container.appendChild(newBtn);
    }
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

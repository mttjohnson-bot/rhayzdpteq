import { getFloorConfig } from '../dungeon/FloorConfig';

export class FloorSelectUI {
  private container: HTMLDivElement;
  private listEl: HTMLDivElement;
  private maxUnlockedFloor = 1;
  private onSelect: ((floor: number) => void) | null = null;

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(10, 10, 20, 0.95)',
      border: '2px solid rgba(170, 68, 255, 0.6)',
      borderRadius: '8px',
      padding: '1.5rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      minWidth: '260px',
      zIndex: '100',
    });

    const title = document.createElement('h2');
    title.textContent = 'Select Floor';
    Object.assign(title.style, {
      margin: '0 0 1rem 0',
      textAlign: 'center',
      fontSize: '1.3rem',
      color: '#dd88ff',
    });
    this.container.appendChild(title);

    this.listEl = document.createElement('div');
    Object.assign(this.listEl.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    });
    this.container.appendChild(this.listEl);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cancel';
    Object.assign(closeBtn.style, {
      marginTop: '1rem',
      padding: '0.4rem 1rem',
      background: 'transparent',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '4px',
      color: '#aaa',
      cursor: 'pointer',
      fontSize: '0.9rem',
      width: '100%',
    });
    closeBtn.addEventListener('click', () => this.hide());
    this.container.appendChild(closeBtn);
  }

  show(maxUnlocked: number, onSelect: (floor: number) => void): void {
    this.maxUnlockedFloor = maxUnlocked;
    this.onSelect = onSelect;
    this.buildList();

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  hide(): void {
    this.container.remove();
  }

  private buildList(): void {
    this.listEl.innerHTML = '';
    const totalFloors = 5; // MVP has 5 floors

    for (let i = 1; i <= totalFloors; i++) {
      const btn = document.createElement('button');
      const unlocked = i <= this.maxUnlockedFloor;

      const floorConfig = getFloorConfig(i);
      btn.textContent = unlocked
        ? `Floor ${i} - ${floorConfig.theme.name}`
        : `Floor ${i} - ${floorConfig.theme.name} (Locked)`;
      Object.assign(btn.style, {
        padding: '0.6rem 1rem',
        background: unlocked ? 'rgba(170, 68, 255, 0.2)' : 'rgba(50, 50, 50, 0.5)',
        border: unlocked ? '1px solid rgba(170, 68, 255, 0.5)' : '1px solid rgba(100, 100, 100, 0.3)',
        borderRadius: '4px',
        color: unlocked ? '#eee' : '#666',
        cursor: unlocked ? 'pointer' : 'default',
        fontSize: '1rem',
        textAlign: 'left',
      });

      if (unlocked) {
        btn.addEventListener('mouseenter', () => {
          btn.style.background = 'rgba(170, 68, 255, 0.4)';
        });
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'rgba(170, 68, 255, 0.2)';
        });
        btn.addEventListener('click', () => {
          this.hide();
          this.onSelect?.(i);
        });
      }

      this.listEl.appendChild(btn);
    }
  }
}

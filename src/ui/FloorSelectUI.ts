import { getFloorConfig } from '../dungeon/FloorConfig';

export class FloorSelectUI {
  private container: HTMLDivElement;
  private listEl: HTMLDivElement;
  private maxUnlockedFloor = 1;
  private onSelect: ((floor: number) => void) | null = null;
  private onCancel: (() => void) | null = null;
  private selectedIndex = 0;
  private buttons: HTMLButtonElement[] = [];
  private _keyHandler: (e: KeyboardEvent) => void;

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
      maxHeight: '50vh',
      overflowY: 'auto',
    });
    this.container.appendChild(this.listEl);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Cancel (Esc)';
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
    closeBtn.addEventListener('click', () => this.cancel());
    this.container.appendChild(closeBtn);

    const hint = document.createElement('div');
    hint.textContent = '0-9 or arrows to select, Enter to confirm. Gamepad: D-pad + A, B to cancel.';
    Object.assign(hint.style, {
      textAlign: 'center',
      fontSize: '0.65rem',
      color: '#555',
      marginTop: '0.5rem',
    });
    this.container.appendChild(hint);

    this._keyHandler = this.handleKey.bind(this);
  }

  show(maxUnlocked: number, onSelect: (floor: number) => void, onCancel?: () => void): void {
    this.maxUnlockedFloor = maxUnlocked;
    this.onSelect = onSelect;
    this.onCancel = onCancel ?? null;
    this.selectedIndex = 0;
    this.buildList();

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);

    window.addEventListener('keydown', this._keyHandler);
  }

  hide(): void {
    this.container.remove();
    window.removeEventListener('keydown', this._keyHandler);
    this.onSelect = null;
    this.onCancel = null;
  }

  private cancel(): void {
    const cb = this.onCancel;
    this.hide();
    cb?.();
  }

  private confirm(floor: number): void {
    const cb = this.onSelect;
    this.hide();
    cb?.(floor);
  }

  private handleKey(e: KeyboardEvent): void {
    const totalFloors = 10;

    // Number keys: 1-9 for floors 1-9, 0 for floor 10
    const num = parseInt(e.key, 10);
    if (!isNaN(num)) {
      const floor = num === 0 ? 10 : num;
      if (floor >= 1 && floor <= totalFloors) {
        this.selectedIndex = floor - 1;
        this.updateHighlight();
        if (floor <= this.maxUnlockedFloor) {
          this.confirm(floor);
        }
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.updateHighlight();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.selectedIndex = Math.min(totalFloors - 1, this.selectedIndex + 1);
        this.updateHighlight();
        break;
      case 'Enter':
      case ' ': {
        const floor = this.selectedIndex + 1;
        if (floor <= this.maxUnlockedFloor) {
          this.confirm(floor);
        }
        break;
      }
      case 'Escape':
        this.cancel();
        break;
    }
  }

  private updateHighlight(): void {
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const unlocked = i + 1 <= this.maxUnlockedFloor;
      const selected = i === this.selectedIndex;

      if (selected && unlocked) {
        btn.style.background = 'rgba(170, 68, 255, 0.5)';
        btn.style.borderColor = 'rgba(170, 68, 255, 0.8)';
      } else if (unlocked) {
        btn.style.background = 'rgba(170, 68, 255, 0.2)';
        btn.style.borderColor = 'rgba(170, 68, 255, 0.5)';
      } else {
        btn.style.background = 'rgba(50, 50, 50, 0.5)';
        btn.style.borderColor = 'rgba(100, 100, 100, 0.3)';
      }
    }
  }

  private buildList(): void {
    this.listEl.innerHTML = '';
    this.buttons = [];
    const totalFloors = 10;

    for (let i = 1; i <= totalFloors; i++) {
      const btn = document.createElement('button');
      const unlocked = i <= this.maxUnlockedFloor;
      const selected = i - 1 === this.selectedIndex;

      const floorConfig = getFloorConfig(i);
      btn.textContent = unlocked
        ? `${i}. Floor ${i} - ${floorConfig.theme.name}`
        : `${i}. Floor ${i} - ${floorConfig.theme.name} (Locked)`;
      Object.assign(btn.style, {
        padding: '0.6rem 1rem',
        background: selected && unlocked
          ? 'rgba(170, 68, 255, 0.5)'
          : unlocked ? 'rgba(170, 68, 255, 0.2)' : 'rgba(50, 50, 50, 0.5)',
        border: selected && unlocked
          ? '1px solid rgba(170, 68, 255, 0.8)'
          : unlocked ? '1px solid rgba(170, 68, 255, 0.5)' : '1px solid rgba(100, 100, 100, 0.3)',
        borderRadius: '4px',
        color: unlocked ? '#eee' : '#666',
        cursor: unlocked ? 'pointer' : 'default',
        fontSize: '1rem',
        textAlign: 'left',
      });

      if (unlocked) {
        btn.addEventListener('mouseenter', () => {
          this.selectedIndex = i - 1;
          this.updateHighlight();
        });
        btn.addEventListener('click', () => {
          this.confirm(i);
        });
      }

      this.buttons.push(btn);
      this.listEl.appendChild(btn);
    }
  }
}

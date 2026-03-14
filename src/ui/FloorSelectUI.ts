import { getFloorConfig, TOTAL_FLOORS } from '../dungeon/FloorConfig';
import type { ActionManager } from '../game/ActionManager';
import type { InputAction } from '../game/InputAction';

export interface FloorSelectResult {
  floor: number;
  bossOnly: boolean;
}

export class FloorSelectUI {
  private container: HTMLDivElement;
  private listEl: HTMLDivElement;
  private maxUnlockedFloor = 1;
  private onSelect: ((result: FloorSelectResult) => void) | null = null;
  private onCancel: (() => void) | null = null;
  private selectedIndex = 0;
  private buttons: HTMLButtonElement[] = [];

  /** Sub-menu state for entry mode selection on completed floors */
  private entryModeEl: HTMLDivElement | null = null;
  private entryModeFloor = 0;
  private entryModeIndex = 0;
  private entryModeButtons: HTMLButtonElement[] = [];

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '60px',
      left: '50%',
      transform: 'translateX(-50%)',
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
    hint.textContent =
      '0-9 or arrows to select, Enter to confirm. Gamepad: D-pad + A, B to cancel. ★ = Boss Challenge available.';
    Object.assign(hint.style, {
      textAlign: 'center',
      fontSize: '0.65rem',
      color: '#555',
      marginTop: '0.5rem',
    });
    this.container.appendChild(hint);
  }

  show(
    maxUnlocked: number,
    onSelect: (result: FloorSelectResult) => void,
    onCancel?: () => void,
  ): void {
    this.maxUnlockedFloor = maxUnlocked;
    this.onSelect = onSelect;
    this.onCancel = onCancel ?? null;
    this.selectedIndex = 0;
    this.dismissEntryMode();
    this.buildList();

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  hide(): void {
    this.dismissEntryMode();
    this.container.remove();
    this.onSelect = null;
    this.onCancel = null;
  }

  cancel(): void {
    const cb = this.onCancel;
    this.hide();
    cb?.();
  }

  private confirm(floor: number): void {
    // Completed floors (below max unlocked) offer a boss-only entry option
    if (floor < this.maxUnlockedFloor) {
      this.showEntryMode(floor);
      return;
    }
    // Current frontier floor — enter normally
    const cb = this.onSelect;
    this.hide();
    cb?.({ floor, bossOnly: false });
  }

  private confirmEntry(floor: number, bossOnly: boolean): void {
    const cb = this.onSelect;
    this.hide();
    cb?.({ floor, bossOnly });
  }

  /** Called each frame by Game.ts while the floor select is active. */
  handleActions(actions: ActionManager): void {
    // If the entry mode sub-menu is showing, delegate input to it
    if (this.entryModeEl) {
      this.handleEntryModeActions(actions);
      return;
    }

    const totalFloors = TOTAL_FLOORS;

    // Direct floor selection via number actions (selectFloor0–selectFloor9)
    for (let n = 0; n <= 9; n++) {
      const actionName = `selectFloor${n}` as InputAction;
      if (actions.wasActionPressed(actionName)) {
        const floor = n === 0 ? 10 : n;
        if (floor >= 1 && floor <= totalFloors) {
          this.selectedIndex = floor - 1;
          this.updateHighlight();
          if (floor <= this.maxUnlockedFloor) {
            this.confirm(floor);
          }
        }
        return;
      }
    }

    // Navigate up/down
    if (actions.wasActionPressed('uiUp')) {
      this.selectedIndex = Math.max(0, this.selectedIndex - 1);
      this.updateHighlight();
    }
    if (actions.wasActionPressed('uiDown')) {
      this.selectedIndex = Math.min(totalFloors - 1, this.selectedIndex + 1);
      this.updateHighlight();
    }

    // Confirm selection
    if (actions.wasActionPressed('uiConfirm')) {
      const floor = this.selectedIndex + 1;
      if (floor <= this.maxUnlockedFloor) {
        this.confirm(floor);
      }
    }

    // Cancel
    if (actions.wasActionPressed('uiCancel')) {
      this.cancel();
    }
  }

  // --- Entry mode sub-menu (Full Floor vs Boss Challenge) ---

  private showEntryMode(floor: number): void {
    this.dismissEntryMode();
    this.entryModeFloor = floor;
    this.entryModeIndex = 0;
    this.entryModeButtons = [];

    this.entryModeEl = document.createElement('div');
    Object.assign(this.entryModeEl.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(10, 10, 20, 0.97)',
      border: '2px solid rgba(170, 68, 255, 0.7)',
      borderRadius: '8px',
      padding: '1.5rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      minWidth: '240px',
      zIndex: '110',
    });

    const floorConfig = getFloorConfig(floor);
    const title = document.createElement('h3');
    title.textContent = `Floor ${floor} - ${floorConfig.theme.name}`;
    Object.assign(title.style, {
      margin: '0 0 0.5rem 0',
      textAlign: 'center',
      fontSize: '1.1rem',
      color: '#dd88ff',
    });
    this.entryModeEl.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = 'Choose entry point:';
    Object.assign(subtitle.style, {
      textAlign: 'center',
      fontSize: '0.85rem',
      color: '#aaa',
      marginBottom: '0.75rem',
    });
    this.entryModeEl.appendChild(subtitle);

    const options: { label: string; description: string; bossOnly: boolean }[] = [
      {
        label: 'Full Floor',
        description: 'Enter from the beginning',
        bossOnly: false,
      },
      {
        label: 'Boss Challenge',
        description: 'Skip to the boss room',
        bossOnly: true,
      },
    ];

    const btnContainer = document.createElement('div');
    Object.assign(btnContainer.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
    });

    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const btn = document.createElement('button');
      const selected = i === this.entryModeIndex;

      const labelSpan = document.createElement('div');
      labelSpan.textContent = opt.label;
      Object.assign(labelSpan.style, { fontSize: '1rem', fontWeight: 'bold' });

      const descSpan = document.createElement('div');
      descSpan.textContent = opt.description;
      Object.assign(descSpan.style, { fontSize: '0.75rem', color: '#999', marginTop: '2px' });

      btn.appendChild(labelSpan);
      btn.appendChild(descSpan);

      Object.assign(btn.style, {
        padding: '0.6rem 1rem',
        background: selected ? 'rgba(170, 68, 255, 0.5)' : 'rgba(170, 68, 255, 0.15)',
        border: selected
          ? '1px solid rgba(170, 68, 255, 0.8)'
          : '1px solid rgba(170, 68, 255, 0.4)',
        borderRadius: '4px',
        color: '#eee',
        cursor: 'pointer',
        textAlign: 'left',
      });

      btn.addEventListener('mouseenter', () => {
        this.entryModeIndex = i;
        this.updateEntryModeHighlight();
      });
      btn.addEventListener('click', () => {
        this.confirmEntry(floor, opt.bossOnly);
      });

      this.entryModeButtons.push(btn);
      btnContainer.appendChild(btn);
    }

    this.entryModeEl.appendChild(btnContainer);

    const backBtn = document.createElement('button');
    backBtn.textContent = 'Back (Esc)';
    Object.assign(backBtn.style, {
      marginTop: '0.75rem',
      padding: '0.3rem 0.8rem',
      background: 'transparent',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '4px',
      color: '#aaa',
      cursor: 'pointer',
      fontSize: '0.8rem',
      width: '100%',
    });
    backBtn.addEventListener('click', () => this.dismissEntryMode());
    this.entryModeEl.appendChild(backBtn);

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.entryModeEl);
  }

  private dismissEntryMode(): void {
    if (this.entryModeEl) {
      this.entryModeEl.remove();
      this.entryModeEl = null;
      this.entryModeButtons = [];
    }
  }

  private updateEntryModeHighlight(): void {
    for (let i = 0; i < this.entryModeButtons.length; i++) {
      const btn = this.entryModeButtons[i];
      const selected = i === this.entryModeIndex;
      btn.style.background = selected ? 'rgba(170, 68, 255, 0.5)' : 'rgba(170, 68, 255, 0.15)';
      btn.style.borderColor = selected ? 'rgba(170, 68, 255, 0.8)' : 'rgba(170, 68, 255, 0.4)';
    }
  }

  private handleEntryModeActions(actions: ActionManager): void {
    if (actions.wasActionPressed('uiUp')) {
      this.entryModeIndex = Math.max(0, this.entryModeIndex - 1);
      this.updateEntryModeHighlight();
    }
    if (actions.wasActionPressed('uiDown')) {
      this.entryModeIndex = Math.min(this.entryModeButtons.length - 1, this.entryModeIndex + 1);
      this.updateEntryModeHighlight();
    }
    if (actions.wasActionPressed('uiConfirm')) {
      const bossOnly = this.entryModeIndex === 1;
      this.confirmEntry(this.entryModeFloor, bossOnly);
    }
    if (actions.wasActionPressed('uiCancel')) {
      this.dismissEntryMode();
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
    const totalFloors = TOTAL_FLOORS;

    for (let i = 1; i <= totalFloors; i++) {
      const btn = document.createElement('button');
      const unlocked = i <= this.maxUnlockedFloor;
      const selected = i - 1 === this.selectedIndex;

      const floorConfig = getFloorConfig(i);
      const completed = i < this.maxUnlockedFloor;
      btn.textContent = unlocked
        ? completed
          ? `${i}. Floor ${i} - ${floorConfig.theme.name} ★`
          : `${i}. Floor ${i} - ${floorConfig.theme.name}`
        : `${i}. Floor ${i} - ${floorConfig.theme.name} (Locked)`;
      Object.assign(btn.style, {
        padding: '0.6rem 1rem',
        background:
          selected && unlocked
            ? 'rgba(170, 68, 255, 0.5)'
            : unlocked
              ? 'rgba(170, 68, 255, 0.2)'
              : 'rgba(50, 50, 50, 0.5)',
        border:
          selected && unlocked
            ? '1px solid rgba(170, 68, 255, 0.8)'
            : unlocked
              ? '1px solid rgba(170, 68, 255, 0.5)'
              : '1px solid rgba(100, 100, 100, 0.3)',
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

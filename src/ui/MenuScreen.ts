import { SaveManager, MAX_SAVE_SLOTS } from '../game/SaveManager';

export class MenuScreen {
  private container: HTMLDivElement;
  private onStart: (() => void) | null = null;
  private slotListEl: HTMLDivElement;
  private actionsEl: HTMLDivElement;

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
    title.textContent = 'Rhayzd Pteq';
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
      marginBottom: '1.5rem',
      color: '#888',
    });

    this.container.appendChild(title);
    this.container.appendChild(subtitle);

    // Save slot label
    const slotLabel = document.createElement('div');
    slotLabel.textContent = 'Select Save Slot';
    Object.assign(slotLabel.style, {
      fontSize: '0.95rem',
      color: '#aa88cc',
      marginBottom: '0.5rem',
    });
    this.container.appendChild(slotLabel);

    // Save slot buttons
    this.slotListEl = document.createElement('div');
    Object.assign(this.slotListEl.style, {
      display: 'flex',
      gap: '0.5rem',
      marginBottom: '1.5rem',
    });
    this.container.appendChild(this.slotListEl);

    // Action buttons container
    this.actionsEl = document.createElement('div');
    Object.assign(this.actionsEl.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.5rem',
    });
    this.container.appendChild(this.actionsEl);

    // Controls hint
    const hint = document.createElement('div');
    hint.textContent = 'Keys 1-4 or arrows = slot, Enter = start. Gamepad: D-pad + A.';
    Object.assign(hint.style, {
      fontSize: '0.7rem',
      color: '#555',
      marginTop: '1rem',
    });
    this.container.appendChild(hint);

    this._keyHandler = this._keyHandler.bind(this);
  }

  show(onStart: () => void): void {
    this.onStart = onStart;
    this.buildSlotList();

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);

    window.addEventListener('keydown', this._keyHandler);
  }

  hide(): void {
    this.container.remove();
    this.onStart = null;
    window.removeEventListener('keydown', this._keyHandler);
  }

  private _keyHandler(e: KeyboardEvent): void {
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= MAX_SAVE_SLOTS) {
      SaveManager.activeSlot = num;
      this.buildSlotList();
      return;
    }

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A': {
        const prev = SaveManager.activeSlot - 1;
        SaveManager.activeSlot = prev < 1 ? MAX_SAVE_SLOTS : prev;
        this.buildSlotList();
        break;
      }
      case 'ArrowRight':
      case 'd':
      case 'D': {
        const next = SaveManager.activeSlot + 1;
        SaveManager.activeSlot = next > MAX_SAVE_SLOTS ? 1 : next;
        this.buildSlotList();
        break;
      }
      case 'Enter':
      case ' ':
        this.onStart?.();
        break;
    }
  }

  private buildSlotList(): void {
    this.slotListEl.innerHTML = '';
    const slots = SaveManager.getAllSlotInfo();

    for (const slot of slots) {
      const btn = document.createElement('button');
      const isActive = slot.slot === SaveManager.activeSlot;

      Object.assign(btn.style, {
        padding: '0.6rem 0.8rem',
        minWidth: '110px',
        background: isActive ? 'rgba(170, 68, 255, 0.3)' : 'rgba(30, 30, 40, 0.8)',
        border: isActive ? '2px solid #aa44ff' : '1px solid rgba(100, 100, 130, 0.4)',
        borderRadius: '6px',
        color: '#eee',
        cursor: 'pointer',
        fontSize: '0.8rem',
        textAlign: 'center',
        transition: 'all 0.15s',
      });

      const label = document.createElement('div');
      label.textContent = `Slot ${slot.slot}`;
      Object.assign(label.style, { fontWeight: 'bold', marginBottom: '0.2rem' });
      btn.appendChild(label);

      const info = document.createElement('div');
      Object.assign(info.style, { fontSize: '0.65rem', color: '#999' });
      if (slot.exists) {
        const status = slot.gameCompleted ? ' (Done)' : '';
        info.textContent = `Lv.${slot.level} | Floor ${slot.floor}/5${status}`;
      } else {
        info.textContent = 'Empty';
      }
      btn.appendChild(info);

      btn.addEventListener('click', () => {
        SaveManager.activeSlot = slot.slot;
        this.buildSlotList();
      });
      btn.addEventListener('mouseenter', () => {
        if (!isActive) btn.style.background = 'rgba(170, 68, 255, 0.15)';
      });
      btn.addEventListener('mouseleave', () => {
        if (!isActive) btn.style.background = 'rgba(30, 30, 40, 0.8)';
      });

      this.slotListEl.appendChild(btn);
    }

    this.buildActionButtons();
  }

  private buildActionButtons(): void {
    this.actionsEl.innerHTML = '';
    const hasSave = SaveManager.hasSave(SaveManager.activeSlot);

    const startBtn = document.createElement('button');
    startBtn.textContent = hasSave ? 'Continue' : 'New Game';
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
    startBtn.addEventListener('click', () => this.onStart?.());
    this.actionsEl.appendChild(startBtn);

    if (hasSave) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete Save';
      Object.assign(delBtn.style, {
        padding: '0.4rem 1rem',
        fontSize: '0.8rem',
        border: '1px solid rgba(255, 100, 100, 0.3)',
        background: 'transparent',
        color: '#aa6666',
        cursor: 'pointer',
        transition: 'all 0.2s',
      });
      delBtn.addEventListener('mouseenter', () => {
        delBtn.style.color = '#ff6644';
        delBtn.style.borderColor = '#ff6644';
      });
      delBtn.addEventListener('mouseleave', () => {
        delBtn.style.color = '#aa6666';
        delBtn.style.borderColor = 'rgba(255, 100, 100, 0.3)';
      });
      delBtn.addEventListener('click', () => {
        if (confirm(`Delete save in Slot ${SaveManager.activeSlot}?`)) {
          SaveManager.deleteSave(SaveManager.activeSlot);
          this.buildSlotList();
        }
      });
      this.actionsEl.appendChild(delBtn);
    }
  }
}

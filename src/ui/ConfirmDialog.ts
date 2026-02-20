/**
 * In-game confirmation dialog that works with keyboard, mouse, and gamepad.
 *
 * Shows a message with Yes/No buttons. Keyboard Enter/Y confirms, Esc/N cancels.
 * Gamepad A confirms, B cancels (via synthetic key events from InputManager).
 */

export class ConfirmDialog {
  private overlay: HTMLDivElement;
  private messageEl: HTMLDivElement;
  private selectedButton: 'yes' | 'no' = 'no';
  private yesBtn: HTMLButtonElement;
  private noBtn: HTMLButtonElement;
  private hintEl: HTMLDivElement;
  private resolve: ((confirmed: boolean) => void) | null = null;
  private _keyHandler: (e: KeyboardEvent) => void;

  constructor() {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.6)',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '300',
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      background: 'rgba(15, 10, 25, 0.97)',
      border: '2px solid rgba(255, 80, 80, 0.6)',
      borderRadius: '8px',
      padding: '1.5rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      minWidth: '300px',
      maxWidth: '400px',
      textAlign: 'center',
    });

    this.messageEl = document.createElement('div');
    Object.assign(this.messageEl.style, {
      fontSize: '0.9rem',
      lineHeight: '1.5',
      marginBottom: '1.2rem',
    });
    box.appendChild(this.messageEl);

    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, {
      display: 'flex',
      justifyContent: 'center',
      gap: '1rem',
    });

    this.yesBtn = document.createElement('button');
    this.yesBtn.textContent = 'Drop';
    Object.assign(this.yesBtn.style, {
      padding: '0.4rem 1.5rem',
      fontSize: '0.85rem',
      border: '1px solid rgba(255, 80, 80, 0.5)',
      borderRadius: '4px',
      background: 'rgba(120, 30, 30, 0.6)',
      color: '#ff8888',
      cursor: 'pointer',
    });
    this.yesBtn.addEventListener('click', () => this.confirm(true));
    this.yesBtn.addEventListener('mouseenter', () => {
      this.selectedButton = 'yes';
      this.updateButtonHighlight();
    });
    btnRow.appendChild(this.yesBtn);

    this.noBtn = document.createElement('button');
    this.noBtn.textContent = 'Cancel';
    Object.assign(this.noBtn.style, {
      padding: '0.4rem 1.5rem',
      fontSize: '0.85rem',
      border: '1px solid rgba(100, 100, 130, 0.5)',
      borderRadius: '4px',
      background: 'rgba(50, 50, 70, 0.6)',
      color: '#aaa',
      cursor: 'pointer',
    });
    this.noBtn.addEventListener('click', () => this.confirm(false));
    this.noBtn.addEventListener('mouseenter', () => {
      this.selectedButton = 'no';
      this.updateButtonHighlight();
    });
    btnRow.appendChild(this.noBtn);
    box.appendChild(btnRow);

    this.hintEl = document.createElement('div');
    this.hintEl.innerHTML = 'Enter: drop | Esc: cancel' + '<br>Gamepad: A: drop | B: cancel';
    Object.assign(this.hintEl.style, {
      marginTop: '0.8rem',
      fontSize: '0.65rem',
      color: '#666',
      lineHeight: '1.4',
    });
    box.appendChild(this.hintEl);

    this.overlay.appendChild(box);

    const uiOverlay = document.getElementById('ui-overlay');
    uiOverlay?.appendChild(this.overlay);

    this._keyHandler = (e: KeyboardEvent) => {
      if (!this.resolve) return;
      e.preventDefault();
      e.stopPropagation();

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
          this.selectedButton = this.selectedButton === 'yes' ? 'no' : 'yes';
          this.updateButtonHighlight();
          break;
        case 'Enter':
        case ' ':
          this.confirm(this.selectedButton === 'yes');
          break;
        case 'Escape':
        case 'e': // B button on gamepad dispatches 'e'
          this.confirm(false);
          break;
      }
    };
  }

  show(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.messageEl.textContent = message;
      this.selectedButton = 'no';
      this.overlay.style.display = 'flex';
      this.updateButtonHighlight();
      window.addEventListener('keydown', this._keyHandler, true);
    });
  }

  private confirm(result: boolean): void {
    if (!this.resolve) return;
    const cb = this.resolve;
    this.resolve = null;
    this.overlay.style.display = 'none';
    window.removeEventListener('keydown', this._keyHandler, true);
    cb(result);
  }

  private updateButtonHighlight(): void {
    if (this.selectedButton === 'yes') {
      this.yesBtn.style.outline = '2px solid #ff6666';
      this.yesBtn.style.outlineOffset = '2px';
      this.noBtn.style.outline = 'none';
    } else {
      this.noBtn.style.outline = '2px solid #8888aa';
      this.noBtn.style.outlineOffset = '2px';
      this.yesBtn.style.outline = 'none';
    }
  }

  isVisible(): boolean {
    return this.overlay.style.display !== 'none';
  }
}

/**
 * Touch-friendly item action dialog.
 *
 * Presents an item's name with a column of action buttons (Equip/Use, Drop,
 * Cancel). Designed for touch input where tapping a tiny "x" or using
 * right-click is impractical.
 */

export type ItemAction = 'equip' | 'unequip' | 'use' | 'drop' | 'cancel';

export interface ActionButtonConfig {
  label: string;
  action: ItemAction;
  variant: 'primary' | 'danger' | 'neutral';
}

export class ItemActionDialog {
  private overlay: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private btnContainer: HTMLDivElement;
  private resolve: ((action: ItemAction) => void) | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.65)',
      display: 'none',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '60px',
      zIndex: '400',
    });

    const box = document.createElement('div');
    Object.assign(box.style, {
      background: 'rgba(15, 10, 25, 0.97)',
      border: '2px solid rgba(170, 68, 255, 0.6)',
      borderRadius: '8px',
      padding: '1.5rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      minWidth: '260px',
      maxWidth: '340px',
      textAlign: 'center',
    });

    // Prevent taps on the box from bubbling to the overlay dismiss handler
    box.addEventListener('click', (e) => e.stopPropagation());

    // Tap the backdrop to cancel
    this.overlay.addEventListener('click', () => this.finish('cancel'));

    this.titleEl = document.createElement('div');
    Object.assign(this.titleEl.style, {
      fontSize: '1rem',
      fontWeight: 'bold',
      color: '#dd88ff',
      marginBottom: '1.2rem',
    });
    box.appendChild(this.titleEl);

    this.btnContainer = document.createElement('div');
    Object.assign(this.btnContainer.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.6rem',
    });
    box.appendChild(this.btnContainer);

    this.overlay.appendChild(box);
    document.getElementById('ui-overlay')?.appendChild(this.overlay);
  }

  show(itemName: string, buttons: ActionButtonConfig[]): Promise<ItemAction> {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.titleEl.textContent = itemName;
      this.btnContainer.innerHTML = '';

      for (const cfg of buttons) {
        const btn = document.createElement('button');
        btn.textContent = cfg.label;

        const styles: Record<string, string> = {
          padding: '0.6rem 1.5rem',
          fontSize: '0.9rem',
          borderRadius: '4px',
          cursor: 'pointer',
          width: '100%',
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        };

        if (cfg.variant === 'primary') {
          Object.assign(styles, {
            border: '1px solid rgba(170, 68, 255, 0.6)',
            background: 'rgba(80, 30, 120, 0.7)',
            color: '#dd88ff',
          });
        } else if (cfg.variant === 'danger') {
          Object.assign(styles, {
            border: '1px solid rgba(255, 80, 80, 0.5)',
            background: 'rgba(120, 30, 30, 0.6)',
            color: '#ff8888',
          });
        } else {
          Object.assign(styles, {
            border: '1px solid rgba(100, 100, 130, 0.5)',
            background: 'rgba(50, 50, 70, 0.6)',
            color: '#aaa',
          });
        }

        Object.assign(btn.style, styles);

        const action = cfg.action;
        btn.addEventListener('click', () => this.finish(action));
        this.btnContainer.appendChild(btn);
      }

      this.overlay.style.display = 'flex';
    });
  }

  private finish(action: ItemAction): void {
    if (!this.resolve) return;
    const cb = this.resolve;
    this.resolve = null;
    this.overlay.style.display = 'none';
    cb(action);
  }

  isVisible(): boolean {
    return this.overlay.style.display !== 'none';
  }
}

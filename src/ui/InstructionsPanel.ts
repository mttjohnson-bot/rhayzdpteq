/**
 * Hamburger menu button displayed in the top-right corner of the game HUD.
 *
 * Clicking the button opens the menu tab system (defaults to the inventory tab).
 * Previously this was a Controls/Objective information panel — that content has
 * been moved to the Controls tab in the menu tab bar.
 */

export class InstructionsPanel {
  private container: HTMLButtonElement;
  private onMenuOpen: (() => void) | null = null;

  constructor() {
    this.container = document.createElement('button');
    this.container.id = 'menu-button';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 14px',
      background: 'rgba(0, 0, 0, 0.7)',
      border: '1px solid rgba(170, 68, 255, 0.3)',
      borderRadius: '6px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: '0.85rem',
      color: '#ccc',
      cursor: 'pointer',
      pointerEvents: 'auto',
      transition: 'background 0.15s, border-color 0.15s',
      zIndex: '100',
    });

    // Hamburger icon (three stacked horizontal lines)
    const icon = document.createElement('span');
    Object.assign(icon.style, {
      display: 'inline-flex',
      flexDirection: 'column',
      gap: '3px',
    });
    for (let i = 0; i < 3; i++) {
      const line = document.createElement('span');
      Object.assign(line.style, {
        display: 'block',
        width: '16px',
        height: '2px',
        background: '#ccc',
        borderRadius: '1px',
      });
      icon.appendChild(line);
    }
    this.container.appendChild(icon);

    // "Menu" label
    const label = document.createElement('span');
    label.textContent = 'Menu';
    this.container.appendChild(label);

    // Hover effects
    this.container.addEventListener('mouseenter', () => {
      this.container.style.background = 'rgba(60, 40, 100, 0.7)';
      this.container.style.borderColor = 'rgba(170, 68, 255, 0.6)';
    });
    this.container.addEventListener('mouseleave', () => {
      this.container.style.background = 'rgba(0, 0, 0, 0.7)';
      this.container.style.borderColor = 'rgba(170, 68, 255, 0.3)';
    });
  }

  /** Set the callback invoked when the menu button is clicked. */
  setOnMenuOpen(cb: () => void): void {
    this.onMenuOpen = cb;
  }

  show(): void {
    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
    this.container.addEventListener('click', this.onClick);
  }

  hide(): void {
    this.container.removeEventListener('click', this.onClick);
    this.container.remove();
  }

  private onClick = (): void => {
    this.onMenuOpen?.();
  };
}

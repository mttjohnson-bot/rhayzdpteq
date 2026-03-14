/**
 * Asset Library inspect dialog.
 *
 * Shows name, category, stats table, and optional flavor text for a library asset.
 * Closes on E, Escape, or gamepad B. Mirrors the ConfirmDialog pattern.
 */

import type { LibraryAsset } from '../game/AssetLibrary';
import type { ActionManager } from '../game/ActionManager';

export class LibraryAssetDialog {
  private overlay: HTMLDivElement;
  private box: HTMLDivElement;
  private titleEl: HTMLDivElement;
  private categoryEl: HTMLDivElement;
  private statsEl: HTMLDivElement;
  private flavorEl: HTMLDivElement;
  private _isOpen = false;
  private _closeCallback: (() => void) | null = null;

  constructor() {
    this.overlay = document.createElement('div');
    Object.assign(this.overlay.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.55)',
      display: 'none',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '60px',
      zIndex: '250',
    });

    // Tap the backdrop (outside the box) to close
    this.overlay.addEventListener('click', () => this.hide());

    this.box = document.createElement('div');
    Object.assign(this.box.style, {
      background: 'rgba(10, 8, 20, 0.97)',
      border: '2px solid rgba(170, 68, 255, 0.6)',
      borderRadius: '8px',
      padding: '1.5rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      minWidth: '320px',
      maxWidth: '460px',
    });

    // Prevent taps on the box content from bubbling to the overlay dismiss handler
    this.box.addEventListener('click', (e) => e.stopPropagation());

    this.titleEl = document.createElement('div');
    Object.assign(this.titleEl.style, {
      fontSize: '1.2rem',
      fontWeight: 'bold',
      color: '#eee',
      marginBottom: '0.25rem',
    });
    this.box.appendChild(this.titleEl);

    this.categoryEl = document.createElement('div');
    Object.assign(this.categoryEl.style, {
      fontSize: '0.7rem',
      color: '#888',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: '0.75rem',
    });
    this.box.appendChild(this.categoryEl);

    const divider = document.createElement('div');
    Object.assign(divider.style, {
      borderTop: '1px solid rgba(255,255,255,0.1)',
      marginBottom: '0.75rem',
    });
    this.box.appendChild(divider);

    this.statsEl = document.createElement('div');
    Object.assign(this.statsEl.style, {
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      gap: '0.25rem 1rem',
      fontSize: '0.82rem',
    });
    this.box.appendChild(this.statsEl);

    this.flavorEl = document.createElement('div');
    Object.assign(this.flavorEl.style, {
      fontStyle: 'italic',
      fontSize: '0.75rem',
      color: '#888',
      marginTop: '0.8rem',
      borderTop: '1px solid rgba(255,255,255,0.08)',
      paddingTop: '0.6rem',
      display: 'none',
    });
    this.box.appendChild(this.flavorEl);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    Object.assign(closeBtn.style, {
      marginTop: '1rem',
      padding: '0.4rem 1.4rem',
      fontSize: '0.85rem',
      border: '1px solid rgba(100, 100, 130, 0.5)',
      borderRadius: '4px',
      background: 'rgba(50, 50, 70, 0.6)',
      color: '#aaa',
      cursor: 'pointer',
      width: '100%',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    });
    closeBtn.addEventListener('click', () => this.hide());
    this.box.appendChild(closeBtn);

    const hintEl = document.createElement('div');
    hintEl.textContent = 'Tap outside, Close, E, Esc, or Gamepad B';
    Object.assign(hintEl.style, {
      marginTop: '0.6rem',
      fontSize: '0.65rem',
      color: '#555',
      textAlign: 'center',
    });
    this.box.appendChild(hintEl);

    this.overlay.appendChild(this.box);
    document.getElementById('ui-overlay')?.appendChild(this.overlay);
  }

  show(asset: LibraryAsset, onClose: () => void): void {
    this._isOpen = true;
    this._closeCallback = onClose;

    this.titleEl.textContent = asset.name;
    this.categoryEl.textContent = this._formatCategory(asset.category);

    // Apply accent border color
    const border = asset.stats.accentColor
      ? `2px solid ${asset.stats.accentColor}99`
      : '2px solid rgba(170, 68, 255, 0.6)';
    this.box.style.border = border;

    // Build stats grid
    this.statsEl.innerHTML = '';
    for (const row of asset.stats.rows) {
      const label = document.createElement('span');
      label.textContent = row.label + ':';
      label.style.color = '#999';
      const value = document.createElement('span');
      value.textContent = row.value;
      value.style.color = '#eee';
      this.statsEl.appendChild(label);
      this.statsEl.appendChild(value);
    }

    // Flavor text
    if (asset.stats.flavorText) {
      this.flavorEl.textContent = asset.stats.flavorText;
      this.flavorEl.style.display = 'block';
    } else {
      this.flavorEl.style.display = 'none';
    }

    this.overlay.style.display = 'flex';
  }

  /** Called each frame by Game.ts while the dialog is open. */
  handleActions(actions: ActionManager): void {
    if (!this._isOpen) return;

    // Close on cancel (Escape/B) or interact (E)
    if (actions.wasActionPressed('uiCancel') || actions.wasActionPressed('interact')) {
      this.hide();
    }
  }

  hide(): void {
    if (!this._isOpen) return;
    this._isOpen = false;
    this.overlay.style.display = 'none';
    const cb = this._closeCallback;
    this._closeCallback = null;
    cb?.();
  }

  isOpen(): boolean {
    return this._isOpen;
  }

  private _formatCategory(category: string): string {
    return category.replace(/_/g, ' ');
  }
}

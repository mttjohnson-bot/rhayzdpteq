/**
 * Controls & Objective info tab accessible from the menu tab system.
 *
 * Shows the same controls list and objective info that was previously
 * in the InstructionsPanel, but now as a menu tab panel.
 */

import type { ActionManager } from '../game/ActionManager';
import type { InputDevice } from '../game/ActionManager';
import { getControlsList, getHint } from './InputHints';

export class ControlsUI {
  private container: HTMLDivElement;
  private visible = false;
  private onClose: (() => void) | null = null;
  private inputDevice: InputDevice = 'keyboard';
  private contentEl!: HTMLDivElement;
  private hintEl!: HTMLDivElement;

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
      minWidth: '360px',
      maxWidth: '480px',
      maxHeight: '70vh',
      zIndex: '200',
      display: 'none',
    });

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  show(onClose: () => void): void {
    this.onClose = onClose;
    this.visible = true;
    this.render();
    this.container.style.display = 'block';
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
    this.onClose = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setInputDevice(device: InputDevice): void {
    this.inputDevice = device;
    if (this.visible) {
      this.render();
    }
  }

  handleActions(actions: ActionManager): void {
    if (actions.wasActionPressed('uiCancel')) {
      this.onClose?.();
    }
  }

  private render(): void {
    this.container.innerHTML = '';

    // Controls section
    const controlsHeader = document.createElement('div');
    Object.assign(controlsHeader.style, {
      color: '#aa88ff',
      fontWeight: '600',
      marginBottom: '8px',
      fontSize: '1.1rem',
    });
    controlsHeader.textContent = 'Controls';
    this.container.appendChild(controlsHeader);

    this.contentEl = document.createElement('div');
    Object.assign(this.contentEl.style, {
      lineHeight: '1.8',
      fontSize: '0.9rem',
      color: '#ccc',
    });
    this.contentEl.innerHTML = getControlsList(this.inputDevice);
    this.container.appendChild(this.contentEl);

    // Separator
    const hr = document.createElement('hr');
    Object.assign(hr.style, {
      border: 'none',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      margin: '12px 0',
    });
    this.container.appendChild(hr);

    // Objective section
    const objectiveHeader = document.createElement('div');
    Object.assign(objectiveHeader.style, {
      color: '#aa88ff',
      fontWeight: '600',
      marginBottom: '8px',
      fontSize: '1.1rem',
    });
    objectiveHeader.textContent = 'Objective';
    this.container.appendChild(objectiveHeader);

    const objectiveEl = document.createElement('div');
    Object.assign(objectiveEl.style, {
      lineHeight: '1.8',
      fontSize: '0.9rem',
      color: '#ccc',
    });
    const interactHint = getHint('interact', this.inputDevice);
    objectiveEl.innerHTML = `Find the <span style="color:#dd88ff">purple portal</span> and ${interactHint.toLowerCase()} to enter the dungeon.`;
    this.container.appendChild(objectiveEl);

    // Close hint at bottom
    this.hintEl = document.createElement('div');
    Object.assign(this.hintEl.style, {
      marginTop: '16px',
      fontSize: '0.7rem',
      color: '#666',
      textAlign: 'center',
    });
    this.updateHintText();
    this.container.appendChild(this.hintEl);
  }

  private updateHintText(): void {
    if (!this.hintEl) return;
    switch (this.inputDevice) {
      case 'gamepad':
        this.hintEl.textContent = 'B: close';
        break;
      case 'touch':
        this.hintEl.textContent = 'Tap outside to close';
        break;
      default:
        this.hintEl.textContent = 'Esc: close';
    }
  }
}

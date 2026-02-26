import type { InputDevice } from '../game/ActionManager';
import { getControlsList, getHint } from './InputHints';

export class InstructionsPanel {
  private container: HTMLDivElement;
  private controlsContent: HTMLDivElement;
  private objectiveEl: HTMLDivElement;
  private toggleEl: HTMLDivElement;
  private collapsed = false;
  private currentDevice: InputDevice = 'keyboard';

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'instructions-panel';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      padding: '12px 16px',
      background: 'rgba(0, 0, 0, 0.7)',
      border: '1px solid rgba(170, 68, 255, 0.3)',
      borderRadius: '6px',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: '0.85rem',
      lineHeight: '1.6',
      color: '#ccc',
      maxWidth: '260px',
      pointerEvents: 'auto',
      transition: 'opacity 0.2s ease',
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      color: '#aa88ff',
      fontWeight: '600',
      marginBottom: '6px',
      fontSize: '0.95rem',
    });
    header.textContent = 'Controls';
    this.container.appendChild(header);

    // Controls list (swapped per device)
    this.controlsContent = document.createElement('div');
    this.controlsContent.innerHTML = getControlsList(this.currentDevice);
    this.container.appendChild(this.controlsContent);

    // Separator
    const hr1 = document.createElement('hr');
    Object.assign(hr1.style, {
      border: 'none',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      margin: '8px 0',
    });
    this.container.appendChild(hr1);

    // Objective section
    const objectiveHeader = document.createElement('div');
    Object.assign(objectiveHeader.style, {
      color: '#aa88ff',
      fontWeight: '600',
      marginBottom: '6px',
      fontSize: '0.95rem',
    });
    objectiveHeader.textContent = 'Objective';
    this.container.appendChild(objectiveHeader);

    this.objectiveEl = document.createElement('div');
    this.updateObjective();
    this.container.appendChild(this.objectiveEl);

    // Separator
    const hr2 = document.createElement('hr');
    Object.assign(hr2.style, {
      border: 'none',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      margin: '8px 0',
    });
    this.container.appendChild(hr2);

    // Toggle button
    this.toggleEl = document.createElement('div');
    Object.assign(this.toggleEl.style, {
      color: '#666',
      fontSize: '0.75rem',
      cursor: 'pointer',
    });
    this.toggleEl.textContent = 'Click to hide';
    this.container.appendChild(this.toggleEl);
  }

  show(): void {
    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);

    this.toggleEl.addEventListener('click', this.onToggle);
  }

  hide(): void {
    this.toggleEl.removeEventListener('click', this.onToggle);
    this.container.remove();
  }

  /** Update displayed controls to match the active input device */
  setActiveDevice(device: InputDevice): void {
    if (device === this.currentDevice) return;
    this.currentDevice = device;
    if (!this.collapsed) {
      this.controlsContent.innerHTML = getControlsList(device);
      this.updateObjective();
    }
  }

  private updateObjective(): void {
    const interactHint = getHint('interact', this.currentDevice);
    this.objectiveEl.innerHTML = `Find the <span style="color:#dd88ff">purple portal</span> and ${interactHint.toLowerCase()} to enter the dungeon.`;
  }

  private onToggle = (): void => {
    this.collapsed = !this.collapsed;

    // Toggle visibility of everything except the toggle button
    const siblings = this.container.querySelectorAll(':scope > *:not(:last-child)');
    siblings.forEach((el) => {
      (el as HTMLElement).style.display = this.collapsed ? 'none' : '';
    });

    this.toggleEl.textContent = this.collapsed ? 'Controls (click to show)' : 'Click to hide';

    // Refresh content when expanding in case device changed while collapsed
    if (!this.collapsed) {
      this.controlsContent.innerHTML = getControlsList(this.currentDevice);
      this.updateObjective();
    }
  };
}

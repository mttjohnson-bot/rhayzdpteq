/**
 * Settings panel accessible from the pause menu.
 *
 * Options:
 *  - Camera mode: third-person isometric (default) or first-person
 *  - Controller detection: auto (default) or manual (keyboard / gamepad)
 *  - Character model: simple box (default), owl, or owlbear voxel model
 *  - Diagnostics overlay: off (default) or on (FPS + draw calls)
 */

import type { ActionManager } from '../game/ActionManager';
import type { InputDevice } from '../game/ActionManager';
import type { CharacterModelId } from '../rendering/CharacterModelLoader';

export type CameraMode = 'third-person' | 'first-person';
export type ControllerMode = 'auto' | 'keyboard' | 'gamepad';

export interface GameSettings {
  cameraMode: CameraMode;
  controllerMode: ControllerMode;
  diagnosticsEnabled: boolean;
  characterModel: CharacterModelId;
}

export class SettingsUI {
  private container: HTMLDivElement;
  private visible = false;
  private onClose: (() => void) | null = null;

  private settings: GameSettings = {
    cameraMode: 'third-person',
    controllerMode: 'auto',
    diagnosticsEnabled: false,
    characterModel: 'simple',
  };

  // Navigation state for keyboard/gamepad
  private selectedIndex = 0;
  private readonly optionCount = 4;

  // DOM references for highlight updates
  private rows: HTMLDivElement[] = [];
  private hintEl!: HTMLDivElement;
  private inputDevice: InputDevice = 'keyboard';

  // Callbacks for when settings change
  private onSettingsChange: ((settings: GameSettings) => void) | null = null;

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
      minWidth: '360px',
      maxWidth: '440px',
      zIndex: '200',
      display: 'none',
    });

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  show(
    settings: GameSettings,
    onChange: (settings: GameSettings) => void,
    onClose: () => void,
  ): void {
    this.settings = { ...settings };
    this.onSettingsChange = onChange;
    this.onClose = onClose;
    this.visible = true;
    this.selectedIndex = 0;
    this.render();
    this.container.style.display = 'block';
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
    this.onClose?.();
    this.onClose = null;
    this.onSettingsChange = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setInputDevice(device: InputDevice): void {
    this.inputDevice = device;
  }

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  handleActions(actions: ActionManager): void {
    if (!this.visible) return;

    if (actions.wasActionPressed('uiUp')) {
      this.selectedIndex = (this.selectedIndex - 1 + this.optionCount) % this.optionCount;
      this.updateHighlight();
    }

    if (actions.wasActionPressed('uiDown')) {
      this.selectedIndex = (this.selectedIndex + 1) % this.optionCount;
      this.updateHighlight();
    }

    // Left/right or confirm to cycle option value
    if (actions.wasActionPressed('uiRight') || actions.wasActionPressed('uiConfirm')) {
      this.cycleOption(this.selectedIndex, 1);
    }

    if (actions.wasActionPressed('uiLeft')) {
      this.cycleOption(this.selectedIndex, -1);
    }

    if (actions.wasActionPressed('uiCancel')) {
      this.hide();
    }
  }

  private cycleOption(index: number, direction: number): void {
    switch (index) {
      case 0: {
        const modes: CameraMode[] = ['third-person', 'first-person'];
        const cur = modes.indexOf(this.settings.cameraMode);
        this.settings.cameraMode = modes[(cur + direction + modes.length) % modes.length];
        break;
      }
      case 1: {
        const modes: ControllerMode[] = ['auto', 'keyboard', 'gamepad'];
        const cur = modes.indexOf(this.settings.controllerMode);
        this.settings.controllerMode = modes[(cur + direction + modes.length) % modes.length];
        break;
      }
      case 2: {
        const models: CharacterModelId[] = ['simple', 'owl', 'owlbear'];
        const cur = models.indexOf(this.settings.characterModel);
        this.settings.characterModel = models[(cur + direction + models.length) % models.length];
        break;
      }
      case 3:
        this.settings.diagnosticsEnabled = !this.settings.diagnosticsEnabled;
        break;
    }
    this.onSettingsChange?.({ ...this.settings });
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.rows = [];

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.2rem',
    });

    const title = document.createElement('h2');
    title.textContent = 'Settings';
    Object.assign(title.style, { margin: '0', fontSize: '1.3rem', color: '#dd88ff' });
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    Object.assign(closeBtn.style, {
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '4px',
      color: '#aaa',
      cursor: 'pointer',
      fontSize: '1rem',
      padding: '0.2rem 0.6rem',
    });
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);
    this.container.appendChild(header);

    // Option rows
    this.addOptionRow('Camera', this.formatCamera(this.settings.cameraMode), 0);
    this.addOptionRow('Controller', this.formatController(this.settings.controllerMode), 1);
    this.addOptionRow('Character', this.formatCharacterModel(this.settings.characterModel), 2);
    this.addOptionRow('Diagnostics', this.settings.diagnosticsEnabled ? 'ON' : 'OFF', 3);

    // Hint line
    this.hintEl = document.createElement('div');
    Object.assign(this.hintEl.style, {
      marginTop: '1rem',
      fontSize: '0.7rem',
      color: '#777',
      textAlign: 'center',
      lineHeight: '1.4',
    });
    this.updateHintText();
    this.container.appendChild(this.hintEl);

    this.updateHighlight();
  }

  private addOptionRow(label: string, value: string, index: number): void {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.6rem 0.8rem',
      marginBottom: '0.4rem',
      background: 'rgba(40, 40, 60, 0.5)',
      border: '1px solid rgba(100, 100, 130, 0.3)',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background 0.15s',
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    Object.assign(labelEl.style, { fontSize: '0.9rem', color: '#ccc' });
    row.appendChild(labelEl);

    const valueWrap = document.createElement('div');
    Object.assign(valueWrap.style, { display: 'flex', alignItems: 'center', gap: '0.5rem' });

    const leftArrow = document.createElement('span');
    leftArrow.textContent = '<';
    Object.assign(leftArrow.style, { color: '#aa88ff', fontSize: '0.9rem', cursor: 'pointer' });
    leftArrow.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectedIndex = index;
      this.cycleOption(index, -1);
    });
    valueWrap.appendChild(leftArrow);

    const valueEl = document.createElement('span');
    valueEl.textContent = value;
    Object.assign(valueEl.style, {
      fontSize: '0.85rem',
      color: '#aa88ff',
      minWidth: '100px',
      textAlign: 'center',
    });
    valueWrap.appendChild(valueEl);

    const rightArrow = document.createElement('span');
    rightArrow.textContent = '>';
    Object.assign(rightArrow.style, { color: '#aa88ff', fontSize: '0.9rem', cursor: 'pointer' });
    rightArrow.addEventListener('click', (e) => {
      e.stopPropagation();
      this.selectedIndex = index;
      this.cycleOption(index, 1);
    });
    valueWrap.appendChild(rightArrow);

    row.appendChild(valueWrap);

    row.addEventListener('click', () => {
      this.selectedIndex = index;
      this.cycleOption(index, 1);
    });

    row.addEventListener('mouseenter', () => {
      this.selectedIndex = index;
      this.updateHighlight();
    });

    this.container.appendChild(row);
    this.rows.push(row);
  }

  private updateHighlight(): void {
    for (let i = 0; i < this.rows.length; i++) {
      if (i === this.selectedIndex) {
        this.rows[i].style.outline = '2px solid #aa44ff';
        this.rows[i].style.outlineOffset = '-2px';
        this.rows[i].style.background = 'rgba(60, 50, 90, 0.6)';
      } else {
        this.rows[i].style.outline = 'none';
        this.rows[i].style.background = 'rgba(40, 40, 60, 0.5)';
      }
    }
  }

  private updateHintText(): void {
    if (!this.hintEl) return;
    switch (this.inputDevice) {
      case 'gamepad':
        this.hintEl.textContent = 'D-pad: navigate | Left/Right: change | B: close';
        break;
      case 'touch':
        this.hintEl.textContent = 'Tap option to cycle | Tap X to close';
        break;
      default:
        this.hintEl.textContent = 'Up/Down: navigate | Left/Right: change | Esc: close';
    }
  }

  private formatCamera(mode: CameraMode): string {
    return mode === 'third-person' ? 'Third-Person' : 'First-Person';
  }

  private formatController(mode: ControllerMode): string {
    switch (mode) {
      case 'auto':
        return 'Auto-Detect';
      case 'keyboard':
        return 'Keyboard';
      case 'gamepad':
        return 'Gamepad';
    }
  }

  private formatCharacterModel(model: CharacterModelId): string {
    switch (model) {
      case 'simple':
        return 'Simple';
      case 'owl':
        return 'Owl (Voxel)';
      case 'owlbear':
        return 'Owlbear (Voxel)';
    }
  }
}

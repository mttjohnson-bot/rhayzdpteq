import { TOTAL_FLOORS } from '../dungeon/FloorConfig';
import type { InputDevice } from '../game/ActionManager';
import { getDeviceLabel } from './InputHints';

export class HUD {
  private container: HTMLDivElement;
  private promptEl: HTMLDivElement;
  private floorEl: HTMLDivElement;
  private levelInfoEl: HTMLDivElement;
  private deviceEl: HTMLDivElement;
  private currentDevice: InputDevice = 'keyboard';

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'hud';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      pointerEvents: 'none',
    });

    // Floor indicator (top-center)
    this.floorEl = document.createElement('div');
    Object.assign(this.floorEl.style, {
      position: 'absolute',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '0.3rem 1rem',
      background: 'rgba(0, 0, 0, 0.6)',
      border: '1px solid rgba(170, 68, 255, 0.4)',
      borderRadius: '4px',
      fontSize: '0.9rem',
      letterSpacing: '0.1em',
      display: 'none',
      textAlign: 'center',
    });
    this.container.appendChild(this.floorEl);

    // Level info (top-left, shown in hub)
    this.levelInfoEl = document.createElement('div');
    Object.assign(this.levelInfoEl.style, {
      position: 'absolute',
      top: '10px',
      left: '10px',
      padding: '0.3rem 0.8rem',
      background: 'rgba(0, 0, 0, 0.6)',
      border: '1px solid rgba(170, 68, 255, 0.3)',
      borderRadius: '4px',
      fontSize: '0.8rem',
      color: '#cc99ff',
      display: 'none',
    });
    this.container.appendChild(this.levelInfoEl);

    // Interaction prompt (shows "Press E to enter portal" etc.)
    this.promptEl = document.createElement('div');
    Object.assign(this.promptEl.style, {
      position: 'absolute',
      bottom: '15%',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '0.5rem 1.5rem',
      background: 'rgba(0, 0, 0, 0.6)',
      border: '1px solid rgba(170, 68, 255, 0.4)',
      borderRadius: '4px',
      fontSize: '1rem',
      letterSpacing: '0.05em',
      display: 'none',
      transition: 'opacity 0.2s ease',
    });
    this.container.appendChild(this.promptEl);

    // Active device indicator (bottom-right)
    this.deviceEl = document.createElement('div');
    Object.assign(this.deviceEl.style, {
      position: 'absolute',
      bottom: '10px',
      right: '10px',
      padding: '0.2rem 0.6rem',
      background: 'rgba(0, 0, 0, 0.5)',
      border: '1px solid rgba(170, 68, 255, 0.3)',
      borderRadius: '4px',
      fontSize: '0.7rem',
      color: '#aa88ff',
      display: 'none',
      transition: 'opacity 0.3s ease',
    });
    this.container.appendChild(this.deviceEl);
  }

  show(): void {
    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  hide(): void {
    this.container.remove();
  }

  showPrompt(text: string): void {
    this.promptEl.textContent = text;
    this.promptEl.style.display = 'block';
  }

  hidePrompt(): void {
    this.promptEl.style.display = 'none';
  }

  showFloorIndicator(floor: number, themeName?: string): void {
    const label = themeName ? `Floor ${floor} - ${themeName}` : `Floor ${floor}`;
    this.floorEl.textContent = label;
    this.floorEl.style.display = 'block';
    this.levelInfoEl.style.display = 'none';
  }

  hideFloorIndicator(): void {
    this.floorEl.style.display = 'none';
  }

  showLevelInfo(level: number, maxFloor: number): void {
    this.levelInfoEl.textContent = `Lv.${level} | Floor ${maxFloor}/${TOTAL_FLOORS}`;
    this.levelInfoEl.style.display = 'block';
  }

  hideLevelInfo(): void {
    this.levelInfoEl.style.display = 'none';
  }

  /** Update the active device indicator. Only re-renders when the device actually changes. */
  setActiveDevice(device: InputDevice): void {
    if (device === this.currentDevice) return;
    this.currentDevice = device;
    this.deviceEl.textContent = getDeviceLabel(device);
    this.deviceEl.style.display = 'block';

    // Auto-hide after 3 seconds — the indicator is informational, not permanent
    this.deviceEl.style.opacity = '1';
    setTimeout(() => {
      this.deviceEl.style.opacity = '0';
    }, 3000);
  }

  /** Backward-compatible: show/hide gamepad indicator based on connection state */
  setGamepadConnected(connected: boolean): void {
    if (connected && this.currentDevice !== 'gamepad') {
      // Show a brief "Gamepad Connected" notification
      this.deviceEl.textContent = 'Gamepad Connected';
      this.deviceEl.style.display = 'block';
      this.deviceEl.style.opacity = '1';
      this.deviceEl.style.color = '#88cc88';
      this.deviceEl.style.borderColor = 'rgba(100, 200, 100, 0.3)';
      setTimeout(() => {
        this.deviceEl.style.opacity = '0';
        // Restore default styling after fade
        setTimeout(() => {
          this.deviceEl.style.color = '#aa88ff';
          this.deviceEl.style.borderColor = 'rgba(170, 68, 255, 0.3)';
        }, 300);
      }, 3000);
    }
  }
}

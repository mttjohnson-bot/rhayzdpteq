import type { InputAction } from '../InputAction';
import type { InputProvider, InputProviderState } from './InputProvider';
import { TouchControls } from '../../ui/TouchControls';

/** Maps a button element to the actions it triggers */
interface ButtonConfig {
  element: HTMLDivElement;
  actions: InputAction[];
}

/**
 * Touch input provider.
 *
 * Creates a virtual joystick and on-screen action buttons via TouchControls.
 * The joystick appears where the user touches the left half of the screen and
 * produces moveX/moveZ axis values. Buttons on the right side produce digital
 * actions (attack, interact, toggleInventory, toggleSkillTree).
 *
 * Auto-detection: touch controls appear when touch events fire, and hide when
 * keyboard or mouse input is detected.
 */
export class TouchProvider implements InputProvider {
  readonly name = 'touch';

  private controls: TouchControls;
  private pressedActions = new Set<InputAction>();
  private heldActions = new Set<InputAction>();
  private axisValues = new Map<InputAction, number>();
  private _active = false;

  // Joystick tracking
  private joystickTouchId: number | null = null;
  private joystickCenterX = 0;
  private joystickCenterY = 0;

  // Button tracking: touchId → button config
  private buttonTouchMap = new Map<number, ButtonConfig>();
  private allButtonElements: Set<HTMLDivElement>;
  private buttonConfigs: ButtonConfig[];

  // Synthetic mouse event filtering (touch devices fire fake mousemove)
  private lastTouchTime = 0;
  private static readonly SYNTHETIC_MOUSE_DELAY = 1000;

  // Bound event handlers for cleanup
  private onWindowTouchStart: (e: TouchEvent) => void;
  private onWindowTouchMove: (e: TouchEvent) => void;
  private onWindowTouchEnd: (e: TouchEvent) => void;
  private onKeyDown: () => void;
  private onMouseMove: () => void;

  constructor() {
    this.controls = new TouchControls();

    this.buttonConfigs = [
      { element: this.controls.attackBtn, actions: ['attack'] },
      { element: this.controls.interactBtn, actions: ['interact', 'uiConfirm', 'respawn'] },
      { element: this.controls.inventoryBtn, actions: ['toggleInventory'] },
      { element: this.controls.skillTreeBtn, actions: ['toggleSkillTree'] },
    ];

    this.allButtonElements = new Set(this.buttonConfigs.map((b) => b.element));

    // ── Button touch handlers ─────────────────────────────────────────────
    for (const config of this.buttonConfigs) {
      config.element.addEventListener(
        'touchstart',
        (e: TouchEvent) => {
          e.preventDefault();
          e.stopPropagation();

          for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            this.buttonTouchMap.set(touch.identifier, config);

            for (const action of config.actions) {
              this.pressedActions.add(action);
              this.heldActions.add(action);
            }

            this.controls.setButtonActive(config.element, true);
            this._active = true;
          }
        },
        { passive: false },
      );
    }

    // ── Window-level touch handlers ───────────────────────────────────────

    this.onWindowTouchStart = (e: TouchEvent) => {
      this.lastTouchTime = performance.now();

      // Any touch on the screen means the user is using touch input — mark
      // the provider active so device detection keeps reporting 'touch' even
      // when the touch lands on a UI element (inventory rows, dialogs, etc.).
      this._active = true;

      // Auto-show controls on first touch
      if (!this.controls.visible) {
        this.controls.show();
      }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        // Skip touches on button elements (handled by button listeners above)
        if (this.allButtonElements.has(e.target as HTMLDivElement)) continue;

        // Skip touches on interactive UI elements (menus, dialogs, etc.)
        const target = e.target as HTMLElement;
        const isGameArea =
          target === document.body || target.tagName === 'CANVAS' || target.id === 'ui-overlay';
        if (!isGameArea) continue;

        // Start joystick if on the left half and no joystick is active
        if (touch.clientX < window.innerWidth * 0.5 && this.joystickTouchId === null) {
          this.joystickTouchId = touch.identifier;
          this.joystickCenterX = touch.clientX;
          this.joystickCenterY = touch.clientY;
          this.controls.showJoystick(touch.clientX, touch.clientY);
          this._active = true;
          e.preventDefault();
        }
      }
    };

    this.onWindowTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === this.joystickTouchId) {
          this.updateJoystick(touch.clientX, touch.clientY);
          this._active = true;
          e.preventDefault();
        }
      }
    };

    this.onWindowTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        // Joystick release
        if (touch.identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this.axisValues.delete('moveX');
          this.axisValues.delete('moveZ');
          this.controls.hideJoystick();
        }

        // Button release
        const btnConfig = this.buttonTouchMap.get(touch.identifier);
        if (btnConfig) {
          for (const action of btnConfig.actions) {
            this.heldActions.delete(action);
          }
          this.controls.setButtonActive(btnConfig.element, false);
          this.buttonTouchMap.delete(touch.identifier);
        }
      }
    };

    // ── Auto-hide on keyboard/mouse ───────────────────────────────────────

    this.onKeyDown = () => {
      if (this.controls.visible) {
        this.controls.hide();
        this.resetState();
      }
    };

    this.onMouseMove = () => {
      // Ignore synthetic mouse events fired by the browser after touch
      if (performance.now() - this.lastTouchTime < TouchProvider.SYNTHETIC_MOUSE_DELAY) return;

      if (this.controls.visible) {
        this.controls.hide();
        this.resetState();
      }
    };

    // ── Register listeners ────────────────────────────────────────────────

    window.addEventListener('touchstart', this.onWindowTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onWindowTouchMove, { passive: false });
    window.addEventListener('touchend', this.onWindowTouchEnd);
    window.addEventListener('touchcancel', this.onWindowTouchEnd);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('mousemove', this.onMouseMove);
  }

  get active(): boolean {
    return this._active;
  }

  poll(): InputProviderState {
    return {
      pressed: new Set(this.pressedActions),
      held: new Set(this.heldActions),
      axes: new Map(this.axisValues),
    };
  }

  endFrame(): void {
    this.pressedActions.clear();
    this._active = false;
  }

  destroy(): void {
    window.removeEventListener('touchstart', this.onWindowTouchStart);
    window.removeEventListener('touchmove', this.onWindowTouchMove);
    window.removeEventListener('touchend', this.onWindowTouchEnd);
    window.removeEventListener('touchcancel', this.onWindowTouchEnd);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.controls.destroy();
  }

  /** Compute joystick axes from a touch position relative to the joystick center */
  private updateJoystick(touchX: number, touchY: number): void {
    const dx = touchX - this.joystickCenterX;
    const dy = touchY - this.joystickCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = TouchControls.JOYSTICK_RADIUS;

    let normX: number;
    let normY: number;

    if (dist > maxDist) {
      // Clamp to the edge of the joystick circle
      normX = dx / dist;
      normY = dy / dist;
    } else {
      normX = dx / maxDist;
      normY = dy / maxDist;
    }

    // Update visual knob position
    this.controls.updateKnob(normX, normY);

    // Apply deadzone to filter out tiny accidental movements
    const deadzone = 0.15;
    const magnitude = Math.sqrt(normX * normX + normY * normY);
    if (magnitude < deadzone) {
      this.axisValues.delete('moveX');
      this.axisValues.delete('moveZ');
      return;
    }

    // Touch Y positive (down on screen) = moveZ positive (forward in game)
    this.axisValues.set('moveX', normX);
    this.axisValues.set('moveZ', normY);
  }

  /** Clear all tracked state when hiding controls */
  private resetState(): void {
    this.joystickTouchId = null;
    this.buttonTouchMap.clear();
    this.pressedActions.clear();
    this.heldActions.clear();
    this.axisValues.clear();
  }
}

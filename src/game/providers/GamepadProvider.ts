import type { InputAction } from '../InputAction';
import {
  DEFAULT_GAMEPAD_BUTTON_MAPPING,
  GAMEPAD_DEADZONE,
  type GamepadButtonMappingConfig,
} from '../InputAction';
import type { InputProvider, InputProviderState } from './InputProvider';

/**
 * Gamepad input provider.
 *
 * Polls navigator.getGamepads() each frame via poll(). Buttons are mapped to
 * game actions via a configurable mapping. The left stick produces moveX/moveZ
 * axis values with deadzone filtering. No synthetic keyboard events are
 * dispatched — UI components should read actions through ActionManager.
 */
export class GamepadProvider implements InputProvider {
  readonly name = 'gamepad';

  private gamepadIndex: number | null = null;
  private prevButtonsDown = new Set<number>();
  private pressedActions = new Set<InputAction>();
  private heldActions = new Set<InputAction>();
  private axisValues = new Map<InputAction, number>();
  private _active = false;
  private mapping: GamepadButtonMappingConfig;
  private deadzone: number;

  private handleConnect: (e: Event) => void;
  private handleDisconnect: (e: Event) => void;

  constructor(
    mapping: GamepadButtonMappingConfig = DEFAULT_GAMEPAD_BUTTON_MAPPING,
    deadzone: number = GAMEPAD_DEADZONE,
  ) {
    this.mapping = mapping;
    this.deadzone = deadzone;

    this.handleConnect = (e: Event) => {
      this.gamepadIndex = (e as GamepadEvent).gamepad.index;
    };

    this.handleDisconnect = (e: Event) => {
      if (this.gamepadIndex === (e as GamepadEvent).gamepad.index) {
        this.gamepadIndex = null;
        this.prevButtonsDown.clear();
        this.heldActions.clear();
        this.axisValues.clear();
        this._active = false;
      }
    };

    window.addEventListener('gamepadconnected', this.handleConnect);
    window.addEventListener('gamepaddisconnected', this.handleDisconnect);
  }

  get active(): boolean {
    return this._active;
  }

  /** Whether a gamepad is currently connected */
  get connected(): boolean {
    return this.gamepadIndex !== null;
  }

  poll(): InputProviderState {
    this.heldActions.clear();
    this.axisValues.clear();
    this._active = false;

    if (this.gamepadIndex === null) {
      return {
        pressed: new Set(this.pressedActions),
        held: this.heldActions,
        axes: this.axisValues,
      };
    }

    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.gamepadIndex];
    if (!gp) {
      return {
        pressed: new Set(this.pressedActions),
        held: this.heldActions,
        axes: this.axisValues,
      };
    }

    // ── Buttons ──
    const currentButtonsDown = new Set<number>();

    for (let i = 0; i < gp.buttons.length; i++) {
      if (!gp.buttons[i].pressed) continue;

      currentButtonsDown.add(i);
      this._active = true;

      const bindings = this.mapping[i];
      if (!bindings) continue;

      // First frame press detection
      if (!this.prevButtonsDown.has(i)) {
        for (const binding of bindings) {
          this.pressedActions.add(binding.action);
        }
      }

      // Held state
      for (const binding of bindings) {
        this.heldActions.add(binding.action);
      }
    }

    this.prevButtonsDown = currentButtonsDown;

    // ── Left stick → moveX / moveZ ──
    const lx = Math.abs(gp.axes[0]) > this.deadzone ? gp.axes[0] : 0;
    const ly = Math.abs(gp.axes[1]) > this.deadzone ? gp.axes[1] : 0;

    if (lx !== 0) {
      this.axisValues.set('moveX', lx);
      this._active = true;
    }
    if (ly !== 0) {
      this.axisValues.set('moveZ', ly);
      this._active = true;
    }

    return {
      pressed: new Set(this.pressedActions),
      held: new Set(this.heldActions),
      axes: new Map(this.axisValues),
    };
  }

  endFrame(): void {
    this.pressedActions.clear();
    // Don't clear _active here — it's set during poll()
  }

  destroy(): void {
    window.removeEventListener('gamepadconnected', this.handleConnect);
    window.removeEventListener('gamepaddisconnected', this.handleDisconnect);
  }
}

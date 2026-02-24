import type { InputAction } from '../InputAction';
import { DEFAULT_KEYBOARD_MAPPING, type KeyboardMappingConfig } from '../InputAction';
import type { InputProvider, InputProviderState } from './InputProvider';

/**
 * Keyboard input provider.
 *
 * Listens to keydown/keyup on window and maps key codes to game actions
 * using a configurable mapping. Digital keys mapped to axes produce -1 or +1
 * when held; opposing keys (e.g. A+D) cancel to 0.
 */
export class KeyboardProvider implements InputProvider {
  readonly name = 'keyboard';

  private keysDown = new Set<string>();
  private pressedActions = new Set<InputAction>();
  private heldActions = new Set<InputAction>();
  private axisValues = new Map<InputAction, number>();
  private _active = false;
  private mapping: KeyboardMappingConfig;

  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;
  private handleBlur: () => void;

  constructor(mapping: KeyboardMappingConfig = DEFAULT_KEYBOARD_MAPPING) {
    this.mapping = mapping;

    this.handleKeyDown = (e: KeyboardEvent) => {
      const isNewPress = !this.keysDown.has(e.code);
      this.keysDown.add(e.code);
      this._active = true;

      if (isNewPress) {
        const bindings = this.mapping[e.code];
        if (bindings) {
          for (const binding of bindings) {
            this.pressedActions.add(binding.action);
          }
        }
      }

      this.rebuildHeldAndAxes();
    };

    this.handleKeyUp = (e: KeyboardEvent) => {
      this.keysDown.delete(e.code);
      this.rebuildHeldAndAxes();
    };

    this.handleBlur = () => {
      this.keysDown.clear();
      this.heldActions.clear();
      this.axisValues.clear();
    };

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
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
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  /**
   * Rebuild held actions and axis values from the current set of held keys.
   * Called on every keydown/keyup to keep state consistent.
   */
  private rebuildHeldAndAxes(): void {
    this.heldActions.clear();
    const axisAccum = new Map<InputAction, number>();

    for (const code of this.keysDown) {
      const bindings = this.mapping[code];
      if (!bindings) continue;

      for (const binding of bindings) {
        this.heldActions.add(binding.action);

        if (binding.axisValue !== undefined) {
          const current = axisAccum.get(binding.action) ?? 0;
          axisAccum.set(binding.action, current + binding.axisValue);
        }
      }
    }

    // Clamp accumulated axis values to [-1, 1] and store
    this.axisValues.clear();
    for (const [action, rawValue] of axisAccum) {
      this.axisValues.set(action, Math.max(-1, Math.min(1, rawValue)));
    }
  }
}

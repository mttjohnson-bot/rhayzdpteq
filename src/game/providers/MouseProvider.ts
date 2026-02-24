import type { InputAction } from '../InputAction';
import { DEFAULT_MOUSE_MAPPING, type MouseButtonMapping } from '../InputAction';
import type { InputProvider, InputProviderState } from './InputProvider';

/**
 * Mouse input provider.
 *
 * Listens to mousedown/mouseup/mousemove on window. Button clicks are mapped
 * to game actions via a configurable mapping (default: left click = attack + uiConfirm).
 * Mouse position is tracked separately and exposed via getPosition(), since
 * continuous cursor coordinates are not a game "action."
 */
export class MouseProvider implements InputProvider {
  readonly name = 'mouse';

  private buttonsDown = new Set<number>();
  private pressedActions = new Set<InputAction>();
  private heldActions = new Set<InputAction>();
  private _active = false;
  private _mouseX = 0;
  private _mouseY = 0;
  private mapping: MouseButtonMapping[];

  private handleMouseDown: (e: MouseEvent) => void;
  private handleMouseUp: (e: MouseEvent) => void;
  private handleMouseMove: (e: MouseEvent) => void;
  private handleBlur: () => void;

  constructor(mapping: MouseButtonMapping[] = DEFAULT_MOUSE_MAPPING) {
    this.mapping = mapping;

    this.handleMouseDown = (e: MouseEvent) => {
      const isNewPress = !this.buttonsDown.has(e.button);
      this.buttonsDown.add(e.button);
      this._active = true;

      if (isNewPress) {
        for (const entry of this.mapping) {
          if (entry.button === e.button) {
            for (const binding of entry.actions) {
              this.pressedActions.add(binding.action);
              this.heldActions.add(binding.action);
            }
          }
        }
      }
    };

    this.handleMouseUp = (e: MouseEvent) => {
      this.buttonsDown.delete(e.button);
      this.rebuildHeld();
    };

    this.handleMouseMove = (e: MouseEvent) => {
      this._mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this._mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      this._active = true;
    };

    this.handleBlur = () => {
      this.buttonsDown.clear();
      this.heldActions.clear();
    };

    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('blur', this.handleBlur);
  }

  get active(): boolean {
    return this._active;
  }

  /** Normalized mouse X position (-1 to +1, left to right) */
  get mouseX(): number {
    return this._mouseX;
  }

  /** Normalized mouse Y position (-1 to +1, bottom to top) */
  get mouseY(): number {
    return this._mouseY;
  }

  poll(): InputProviderState {
    return {
      pressed: new Set(this.pressedActions),
      held: new Set(this.heldActions),
      axes: new Map(),
    };
  }

  endFrame(): void {
    this.pressedActions.clear();
    this._active = false;
  }

  destroy(): void {
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('blur', this.handleBlur);
  }

  /** Rebuild held actions from currently pressed buttons */
  private rebuildHeld(): void {
    this.heldActions.clear();
    for (const button of this.buttonsDown) {
      for (const entry of this.mapping) {
        if (entry.button === button) {
          for (const binding of entry.actions) {
            this.heldActions.add(binding.action);
          }
        }
      }
    }
  }
}

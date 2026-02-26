import type { InputAction } from './InputAction';
import type { InputProvider } from './providers/InputProvider';
import { KeyboardProvider } from './providers/KeyboardProvider';
import { MouseProvider } from './providers/MouseProvider';
import { GamepadProvider } from './providers/GamepadProvider';
import { TouchProvider } from './providers/TouchProvider';

/**
 * ActionManager is the single entry point for all game code to query input.
 *
 * It maintains a list of input providers (keyboard, mouse, gamepad, and
 * touch), polls them each frame, and merges their state into a
 * unified action-based API. Game code queries named actions ("attack",
 * "interact", "toggleInventory") rather than specific key codes or buttons.
 *
 * Usage:
 *   // At the start of each frame:
 *   actionManager.update();
 *
 *   // During the frame:
 *   if (actionManager.wasActionPressed('interact')) { ... }
 *   const { x, z } = actionManager.getMovement();
 *
 *   // At the end of each frame:
 *   actionManager.endFrame();
 */
/** Device categories for UI hint display */
export type InputDevice = 'keyboard' | 'gamepad' | 'touch';

export class ActionManager {
  private providers: InputProvider[] = [];
  private mouseProvider: MouseProvider | null = null;
  private gamepadProvider: GamepadProvider | null = null;

  // Merged state across all providers
  private mergedPressed = new Set<InputAction>();
  private mergedHeld = new Set<InputAction>();
  private mergedAxes = new Map<InputAction, number>();

  // Tracks the most recently used input device for UI hints.
  // Mouse input counts as "keyboard" since the two are used together.
  private _primaryDevice: InputDevice = 'keyboard';

  /**
   * Create an ActionManager with the default set of providers
   * (keyboard, mouse, gamepad, touch).
   */
  static createDefault(): ActionManager {
    const manager = new ActionManager();
    manager.addProvider(new KeyboardProvider());

    const mouse = new MouseProvider();
    manager.addProvider(mouse);
    manager.mouseProvider = mouse;

    const gamepad = new GamepadProvider();
    manager.addProvider(gamepad);
    manager.gamepadProvider = gamepad;

    manager.addProvider(new TouchProvider());

    return manager;
  }

  /** Register an input provider */
  addProvider(provider: InputProvider): void {
    this.providers.push(provider);
  }

  /**
   * Poll all providers and merge their state.
   * Call once at the start of each game frame, before reading any actions.
   */
  update(): void {
    this.mergedPressed.clear();
    this.mergedHeld.clear();
    this.mergedAxes.clear();

    for (const provider of this.providers) {
      const state = provider.poll();

      for (const action of state.pressed) {
        this.mergedPressed.add(action);
      }

      for (const action of state.held) {
        this.mergedHeld.add(action);
      }

      for (const [action, value] of state.axes) {
        const current = this.mergedAxes.get(action);
        if (current === undefined || Math.abs(value) > Math.abs(current)) {
          this.mergedAxes.set(action, value);
        }
      }
    }

    // Update primary device — prioritize touch > gamepad > keyboard/mouse
    const activeDevices = this.getActiveDevices();
    if (activeDevices.has('touch')) {
      this._primaryDevice = 'touch';
    } else if (activeDevices.has('gamepad')) {
      this._primaryDevice = 'gamepad';
    } else if (activeDevices.has('keyboard') || activeDevices.has('mouse')) {
      this._primaryDevice = 'keyboard';
    }
  }

  /** True only on the first frame the action is triggered */
  wasActionPressed(action: InputAction): boolean {
    return this.mergedPressed.has(action);
  }

  /** True while the action is continuously held */
  isActionHeld(action: InputAction): boolean {
    return this.mergedHeld.has(action);
  }

  /** Get the analog value for an axis action (-1 to +1). Returns 0 if not active. */
  getAxis(action: InputAction): number {
    return this.mergedAxes.get(action) ?? 0;
  }

  /** Convenience: get normalized movement vector from moveX and moveZ axes */
  getMovement(): { x: number; z: number } {
    let x = this.getAxis('moveX');
    let z = this.getAxis('moveZ');

    // Normalize diagonal movement so it doesn't exceed speed 1
    const len = Math.sqrt(x * x + z * z);
    if (len > 1) {
      x /= len;
      z /= len;
    }

    return { x, z };
  }

  /** Get normalized mouse position (-1 to +1). Returns {x: 0, y: 0} if no mouse provider. */
  getMousePosition(): { x: number; y: number } {
    if (this.mouseProvider) {
      return { x: this.mouseProvider.mouseX, y: this.mouseProvider.mouseY };
    }
    return { x: 0, y: 0 };
  }

  /** Whether a gamepad is currently connected */
  get hasGamepad(): boolean {
    return this.gamepadProvider?.connected ?? false;
  }

  /**
   * The most recently used input device category.
   * Mouse counts as "keyboard" since they're used together.
   * Persists between frames — only changes when a different device is used.
   */
  get primaryDevice(): InputDevice {
    return this._primaryDevice;
  }

  /** Get the set of provider names that detected input this frame */
  getActiveDevices(): Set<string> {
    const active = new Set<string>();
    for (const provider of this.providers) {
      if (provider.active) {
        active.add(provider.name);
      }
    }
    return active;
  }

  /**
   * Reset per-frame state on all providers.
   * Call once at the end of each game frame, after all input has been read.
   */
  endFrame(): void {
    for (const provider of this.providers) {
      provider.endFrame();
    }
  }

  /** Clean up all providers. Call when the game is shutting down. */
  destroy(): void {
    for (const provider of this.providers) {
      provider.destroy();
    }
    this.providers = [];
    this.mouseProvider = null;
    this.gamepadProvider = null;
  }
}

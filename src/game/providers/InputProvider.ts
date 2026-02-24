import type { InputAction } from '../InputAction';

/** Snapshot of a provider's input state for the current frame */
export interface InputProviderState {
  /** Actions that were first activated this frame */
  pressed: Set<InputAction>;
  /** Actions that are currently held down */
  held: Set<InputAction>;
  /** Analog axis values: -1 to +1 */
  axes: Map<InputAction, number>;
}

/** Interface all input providers must implement */
export interface InputProvider {
  /** Provider identifier */
  readonly name: string;

  /** Whether this provider has detected input this frame */
  readonly active: boolean;

  /** Return current input state. For poll-based providers (gamepad), this reads the hardware. */
  poll(): InputProviderState;

  /** Reset per-frame state (pressed sets). Called at end of each game frame. */
  endFrame(): void;

  /** Remove all event listeners and clean up resources */
  destroy(): void;
}

/**
 * All game actions as a string literal union type.
 * Game code queries these named actions rather than specific keys or buttons.
 */
export type InputAction =
  // Movement (analog/axis)
  | 'moveX' // -1 (left) to +1 (right)
  | 'moveZ' // -1 (up/forward) to +1 (down/backward)
  // Combat
  | 'attack' // melee attack (press & hold)
  // Interaction
  | 'interact' // E key / B button / tap on interactable
  // UI navigation
  | 'uiUp'
  | 'uiDown'
  | 'uiLeft'
  | 'uiRight'
  | 'uiConfirm' // Enter/Space/A button
  | 'uiCancel' // Escape/B button
  // Game UI toggles
  | 'toggleInventory'
  | 'toggleSkillTree'
  | 'dropItem'
  | 'respawn'
  // Menu-specific
  | 'selectSlot1'
  | 'selectSlot2'
  | 'selectSlot3'
  | 'selectSlot4'
  | 'selectFloor0'
  | 'selectFloor1'
  | 'selectFloor2'
  | 'selectFloor3'
  | 'selectFloor4'
  | 'selectFloor5'
  | 'selectFloor6'
  | 'selectFloor7'
  | 'selectFloor8'
  | 'selectFloor9';

/** Binding from a physical input to a game action */
export interface ActionBinding {
  action: InputAction;
  /** For axis actions (moveX, moveZ): the value produced when this input is active */
  axisValue?: number;
}

// ── Keyboard Mapping ────────────────────────────────────────────────────────

/** Maps keyboard event codes to action bindings */
export type KeyboardMappingConfig = Record<string, ActionBinding[]>;

export const DEFAULT_KEYBOARD_MAPPING: KeyboardMappingConfig = {
  // Movement + UI navigation (WASD)
  KeyW: [{ action: 'moveZ', axisValue: -1 }, { action: 'uiUp' }],
  KeyS: [{ action: 'moveZ', axisValue: 1 }, { action: 'uiDown' }],
  KeyA: [{ action: 'moveX', axisValue: -1 }, { action: 'uiLeft' }],
  KeyD: [{ action: 'moveX', axisValue: 1 }, { action: 'uiRight' }],
  // Movement + UI navigation (Arrow keys)
  ArrowUp: [{ action: 'moveZ', axisValue: -1 }, { action: 'uiUp' }],
  ArrowDown: [{ action: 'moveZ', axisValue: 1 }, { action: 'uiDown' }],
  ArrowLeft: [{ action: 'moveX', axisValue: -1 }, { action: 'uiLeft' }],
  ArrowRight: [{ action: 'moveX', axisValue: 1 }, { action: 'uiRight' }],
  // Combat
  Space: [{ action: 'attack' }, { action: 'respawn' }, { action: 'uiConfirm' }],
  // Interaction
  KeyE: [{ action: 'interact' }],
  // UI toggles
  KeyI: [{ action: 'toggleInventory' }],
  KeyK: [{ action: 'toggleSkillTree' }],
  KeyX: [{ action: 'dropItem' }],
  // Respawn / confirm
  KeyR: [{ action: 'respawn' }],
  Enter: [{ action: 'respawn' }, { action: 'uiConfirm' }],
  // Cancel
  Escape: [{ action: 'uiCancel' }],
  // Slot selection (1-4 map to both slots and floors)
  Digit1: [{ action: 'selectSlot1' }, { action: 'selectFloor1' }],
  Digit2: [{ action: 'selectSlot2' }, { action: 'selectFloor2' }],
  Digit3: [{ action: 'selectSlot3' }, { action: 'selectFloor3' }],
  Digit4: [{ action: 'selectSlot4' }, { action: 'selectFloor4' }],
  // Floor selection only (5-9, 0)
  Digit5: [{ action: 'selectFloor5' }],
  Digit6: [{ action: 'selectFloor6' }],
  Digit7: [{ action: 'selectFloor7' }],
  Digit8: [{ action: 'selectFloor8' }],
  Digit9: [{ action: 'selectFloor9' }],
  Digit0: [{ action: 'selectFloor0' }],
};

// ── Mouse Mapping ───────────────────────────────────────────────────────────

export interface MouseButtonMapping {
  button: number; // 0 = left, 1 = middle, 2 = right
  actions: ActionBinding[];
}

export const DEFAULT_MOUSE_MAPPING: MouseButtonMapping[] = [
  { button: 0, actions: [{ action: 'attack' }, { action: 'uiConfirm' }] },
];

// ── Gamepad Mapping ─────────────────────────────────────────────────────────

/** Maps standard gamepad button indices to action bindings */
export type GamepadButtonMappingConfig = Record<number, ActionBinding[]>;

export const DEFAULT_GAMEPAD_BUTTON_MAPPING: GamepadButtonMappingConfig = {
  0: [{ action: 'attack' }, { action: 'uiConfirm' }, { action: 'respawn' }], // A
  1: [{ action: 'interact' }, { action: 'uiCancel' }], // B
  2: [{ action: 'toggleInventory' }], // X
  3: [{ action: 'toggleSkillTree' }], // Y
  4: [{ action: 'respawn' }], // L1
  5: [{ action: 'dropItem' }], // R1
  7: [{ action: 'attack' }], // RT
  8: [{ action: 'uiCancel' }], // Select
  9: [{ action: 'uiCancel' }], // Start
  12: [{ action: 'uiUp' }], // D-pad up
  13: [{ action: 'uiDown' }], // D-pad down
  14: [{ action: 'uiLeft' }], // D-pad left
  15: [{ action: 'uiRight' }], // D-pad right
};

export const GAMEPAD_DEADZONE = 0.2;

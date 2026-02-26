import type { InputDevice } from '../game/ActionManager';

/**
 * Device-specific hint text for common game actions.
 *
 * Returns short, user-facing labels like "Press E", "Press A", or "Tap"
 * depending on which input device the player is currently using.
 */

const HINTS: Record<string, Record<InputDevice, string>> = {
  interact: {
    keyboard: 'Press E',
    gamepad: 'Press A',
    touch: 'Tap E',
  },
  attack: {
    keyboard: 'Click / Space',
    gamepad: 'Press A / RT',
    touch: 'Tap ATK',
  },
  inventory: {
    keyboard: 'I',
    gamepad: 'X',
    touch: 'Tap I',
  },
  skillTree: {
    keyboard: 'K',
    gamepad: 'Y',
    touch: 'Tap K',
  },
  respawn: {
    keyboard: 'Press R or Enter',
    gamepad: 'Press A',
    touch: 'Tap to continue',
  },
  move: {
    keyboard: 'WASD / Arrows',
    gamepad: 'Left Stick',
    touch: 'Joystick',
  },
  uiConfirm: {
    keyboard: 'Enter / Space',
    gamepad: 'A',
    touch: 'Tap',
  },
  uiCancel: {
    keyboard: 'Escape',
    gamepad: 'B',
    touch: 'Back',
  },
  dropItem: {
    keyboard: 'X',
    gamepad: 'R1',
    touch: 'Hold item',
  },
};

/** Get the hint text for a named action on the given device */
export function getHint(action: string, device: InputDevice): string {
  return HINTS[action]?.[device] ?? action;
}

/** Device-friendly display name */
export function getDeviceLabel(device: InputDevice): string {
  switch (device) {
    case 'keyboard':
      return 'Keyboard & Mouse';
    case 'gamepad':
      return 'Gamepad';
    case 'touch':
      return 'Touch';
  }
}

/** Build the controls list for the InstructionsPanel based on active device */
export function getControlsList(device: InputDevice): string {
  switch (device) {
    case 'keyboard':
      return `
        <div><span style="color:#eee">WASD / Arrows</span> — Move</div>
        <div><span style="color:#eee">E</span> — Interact</div>
        <div><span style="color:#eee">Click / Space</span> — Attack</div>
        <div><span style="color:#eee">I</span> — Inventory</div>
        <div><span style="color:#eee">K</span> — Skill Tree</div>`;
    case 'gamepad':
      return `
        <div><span style="color:#eee">Left Stick</span> — Move</div>
        <div><span style="color:#eee">A</span> — Interact / Attack</div>
        <div><span style="color:#eee">X</span> — Inventory</div>
        <div><span style="color:#eee">Y</span> — Skill Tree</div>
        <div><span style="color:#eee">D-Pad</span> — Navigate menus</div>`;
    case 'touch':
      return `
        <div><span style="color:#eee">Left Joystick</span> — Move</div>
        <div><span style="color:#eee">E Button</span> — Interact</div>
        <div><span style="color:#eee">ATK Button</span> — Attack</div>
        <div><span style="color:#eee">I Button</span> — Inventory</div>
        <div><span style="color:#eee">K Button</span> — Skill Tree</div>`;
  }
}

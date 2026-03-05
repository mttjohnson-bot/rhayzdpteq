import { describe, it, expect } from 'vitest';
import {
  DEFAULT_KEYBOARD_MAPPING,
  DEFAULT_MOUSE_MAPPING,
  DEFAULT_GAMEPAD_BUTTON_MAPPING,
  GAMEPAD_DEADZONE,
} from '../../src/game/InputAction';
import type { InputAction } from '../../src/game/InputAction';

/** All valid action names for validation */
const VALID_ACTIONS: Set<string> = new Set([
  'moveX',
  'moveZ',
  'attack',
  'interact',
  'uiUp',
  'uiDown',
  'uiLeft',
  'uiRight',
  'uiConfirm',
  'uiCancel',
  'toggleInventory',
  'toggleSkillTree',
  'toggleMenu',
  'tabLeft',
  'tabRight',
  'dropItem',
  'respawn',
  'selectSlot1',
  'selectSlot2',
  'selectSlot3',
  'selectSlot4',
  'selectFloor0',
  'selectFloor1',
  'selectFloor2',
  'selectFloor3',
  'selectFloor4',
  'selectFloor5',
  'selectFloor6',
  'selectFloor7',
  'selectFloor8',
  'selectFloor9',
]);

describe('InputAction mappings', () => {
  describe('DEFAULT_KEYBOARD_MAPPING', () => {
    it('is defined and non-empty', () => {
      expect(Object.keys(DEFAULT_KEYBOARD_MAPPING).length).toBeGreaterThan(0);
    });

    it('all bindings reference valid actions', () => {
      for (const [code, bindings] of Object.entries(DEFAULT_KEYBOARD_MAPPING)) {
        for (const binding of bindings) {
          expect(VALID_ACTIONS.has(binding.action)).toBe(true);
        }
      }
    });

    it('has WASD movement bindings', () => {
      expect(DEFAULT_KEYBOARD_MAPPING['KeyW']).toBeDefined();
      expect(DEFAULT_KEYBOARD_MAPPING['KeyA']).toBeDefined();
      expect(DEFAULT_KEYBOARD_MAPPING['KeyS']).toBeDefined();
      expect(DEFAULT_KEYBOARD_MAPPING['KeyD']).toBeDefined();
    });

    it('has arrow key movement bindings', () => {
      expect(DEFAULT_KEYBOARD_MAPPING['ArrowUp']).toBeDefined();
      expect(DEFAULT_KEYBOARD_MAPPING['ArrowDown']).toBeDefined();
      expect(DEFAULT_KEYBOARD_MAPPING['ArrowLeft']).toBeDefined();
      expect(DEFAULT_KEYBOARD_MAPPING['ArrowRight']).toBeDefined();
    });

    it('has attack binding (Space)', () => {
      const spaceBindings = DEFAULT_KEYBOARD_MAPPING['Space'];
      expect(spaceBindings?.some((b) => b.action === 'attack')).toBe(true);
    });

    it('has interact binding (KeyE)', () => {
      const eBindings = DEFAULT_KEYBOARD_MAPPING['KeyE'];
      expect(eBindings?.some((b) => b.action === 'interact')).toBe(true);
    });

    it('has digit keys for floor selection (0-9)', () => {
      for (let i = 0; i <= 9; i++) {
        const key = `Digit${i}`;
        expect(DEFAULT_KEYBOARD_MAPPING[key]).toBeDefined();
      }
    });

    it('axis bindings have valid axisValue (-1 or +1)', () => {
      for (const bindings of Object.values(DEFAULT_KEYBOARD_MAPPING)) {
        for (const binding of bindings) {
          if (binding.axisValue !== undefined) {
            expect(Math.abs(binding.axisValue)).toBe(1);
          }
        }
      }
    });
  });

  describe('DEFAULT_MOUSE_MAPPING', () => {
    it('has left click mapping', () => {
      const leftClick = DEFAULT_MOUSE_MAPPING.find((m) => m.button === 0);
      expect(leftClick).toBeDefined();
    });

    it('maps left click to attack', () => {
      const leftClick = DEFAULT_MOUSE_MAPPING.find((m) => m.button === 0)!;
      expect(leftClick.actions.some((a) => a.action === 'attack')).toBe(true);
    });

    it('maps left click to uiConfirm', () => {
      const leftClick = DEFAULT_MOUSE_MAPPING.find((m) => m.button === 0)!;
      expect(leftClick.actions.some((a) => a.action === 'uiConfirm')).toBe(true);
    });

    it('all bindings reference valid actions', () => {
      for (const entry of DEFAULT_MOUSE_MAPPING) {
        for (const binding of entry.actions) {
          expect(VALID_ACTIONS.has(binding.action)).toBe(true);
        }
      }
    });
  });

  describe('DEFAULT_GAMEPAD_BUTTON_MAPPING', () => {
    it('is defined and non-empty', () => {
      expect(Object.keys(DEFAULT_GAMEPAD_BUTTON_MAPPING).length).toBeGreaterThan(0);
    });

    it('all bindings reference valid actions', () => {
      for (const bindings of Object.values(DEFAULT_GAMEPAD_BUTTON_MAPPING)) {
        for (const binding of bindings) {
          expect(VALID_ACTIONS.has(binding.action)).toBe(true);
        }
      }
    });

    it('maps A button (0) to attack', () => {
      const bindings = DEFAULT_GAMEPAD_BUTTON_MAPPING[0];
      expect(bindings?.some((b) => b.action === 'attack')).toBe(true);
    });

    it('maps B button (1) to interact', () => {
      const bindings = DEFAULT_GAMEPAD_BUTTON_MAPPING[1];
      expect(bindings?.some((b) => b.action === 'interact')).toBe(true);
    });

    it('has D-pad navigation bindings', () => {
      expect(DEFAULT_GAMEPAD_BUTTON_MAPPING[12]).toBeDefined(); // up
      expect(DEFAULT_GAMEPAD_BUTTON_MAPPING[13]).toBeDefined(); // down
      expect(DEFAULT_GAMEPAD_BUTTON_MAPPING[14]).toBeDefined(); // left
      expect(DEFAULT_GAMEPAD_BUTTON_MAPPING[15]).toBeDefined(); // right
    });
  });

  describe('GAMEPAD_DEADZONE', () => {
    it('is a positive number less than 1', () => {
      expect(GAMEPAD_DEADZONE).toBeGreaterThan(0);
      expect(GAMEPAD_DEADZONE).toBeLessThan(1);
    });
  });
});

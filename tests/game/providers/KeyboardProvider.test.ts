// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KeyboardProvider } from '../../../src/game/providers/KeyboardProvider';

/** Simulate a keydown event on window */
function keyDown(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
}

/** Simulate a keyup event on window */
function keyUp(code: string): void {
  window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
}

describe('KeyboardProvider', () => {
  let provider: KeyboardProvider;

  beforeEach(() => {
    provider = new KeyboardProvider();
  });

  afterEach(() => {
    provider.destroy();
  });

  describe('pressed detection', () => {
    it('reports pressed action on first frame of key press', () => {
      keyDown('KeyE');
      const state = provider.poll();
      expect(state.pressed.has('interact')).toBe(true);
    });

    it('does not report pressed on subsequent frames while held', () => {
      keyDown('KeyE');
      provider.poll();
      provider.endFrame();

      // Second frame — still held
      const state = provider.poll();
      expect(state.pressed.has('interact')).toBe(false);
    });

    it('reports pressed again after release and re-press', () => {
      keyDown('KeyE');
      provider.poll();
      provider.endFrame();

      keyUp('KeyE');
      keyDown('KeyE');
      const state = provider.poll();
      expect(state.pressed.has('interact')).toBe(true);
    });
  });

  describe('held detection', () => {
    it('reports held action while key is down', () => {
      keyDown('Space');
      const state = provider.poll();
      expect(state.held.has('attack')).toBe(true);
    });

    it('stops reporting held after key release', () => {
      keyDown('Space');
      provider.poll();

      keyUp('Space');
      const state = provider.poll();
      expect(state.held.has('attack')).toBe(false);
    });
  });

  describe('axis mapping', () => {
    it('maps W key to moveZ: -1', () => {
      keyDown('KeyW');
      const state = provider.poll();
      expect(state.axes.get('moveZ')).toBe(-1);
    });

    it('maps S key to moveZ: +1', () => {
      keyDown('KeyS');
      const state = provider.poll();
      expect(state.axes.get('moveZ')).toBe(1);
    });

    it('maps A key to moveX: -1', () => {
      keyDown('KeyA');
      const state = provider.poll();
      expect(state.axes.get('moveX')).toBe(-1);
    });

    it('maps D key to moveX: +1', () => {
      keyDown('KeyD');
      const state = provider.poll();
      expect(state.axes.get('moveX')).toBe(1);
    });

    it('cancels opposing keys to zero (A+D)', () => {
      keyDown('KeyA');
      keyDown('KeyD');
      const state = provider.poll();
      expect(state.axes.get('moveX')).toBe(0);
    });

    it('cancels opposing keys to zero (W+S)', () => {
      keyDown('KeyW');
      keyDown('KeyS');
      const state = provider.poll();
      expect(state.axes.get('moveZ')).toBe(0);
    });

    it('maps arrow keys to axes', () => {
      keyDown('ArrowUp');
      keyDown('ArrowRight');
      const state = provider.poll();
      expect(state.axes.get('moveZ')).toBe(-1);
      expect(state.axes.get('moveX')).toBe(1);
    });
  });

  describe('action mappings', () => {
    it('maps Space to attack', () => {
      keyDown('Space');
      const state = provider.poll();
      expect(state.pressed.has('attack')).toBe(true);
    });

    it('maps KeyE to interact', () => {
      keyDown('KeyE');
      const state = provider.poll();
      expect(state.pressed.has('interact')).toBe(true);
    });

    it('maps KeyI to toggleInventory', () => {
      keyDown('KeyI');
      const state = provider.poll();
      expect(state.pressed.has('toggleInventory')).toBe(true);
    });

    it('maps KeyK to toggleSkillTree', () => {
      keyDown('KeyK');
      const state = provider.poll();
      expect(state.pressed.has('toggleSkillTree')).toBe(true);
    });

    it('maps Escape to uiCancel', () => {
      keyDown('Escape');
      const state = provider.poll();
      expect(state.pressed.has('uiCancel')).toBe(true);
    });

    it('maps Enter to uiConfirm and respawn', () => {
      keyDown('Enter');
      const state = provider.poll();
      expect(state.pressed.has('uiConfirm')).toBe(true);
      expect(state.pressed.has('respawn')).toBe(true);
    });

    it('maps digit keys to floor selection', () => {
      keyDown('Digit1');
      const state = provider.poll();
      expect(state.pressed.has('selectFloor1')).toBe(true);
      expect(state.pressed.has('selectSlot1')).toBe(true);
    });

    it('maps KeyX to dropItem', () => {
      keyDown('KeyX');
      const state = provider.poll();
      expect(state.pressed.has('dropItem')).toBe(true);
    });

    it('maps KeyR to respawn', () => {
      keyDown('KeyR');
      const state = provider.poll();
      expect(state.pressed.has('respawn')).toBe(true);
    });
  });

  describe('active detection', () => {
    it('starts as inactive', () => {
      expect(provider.active).toBe(false);
    });

    it('becomes active on key press', () => {
      keyDown('KeyW');
      expect(provider.active).toBe(true);
    });

    it('resets active on endFrame', () => {
      keyDown('KeyW');
      provider.endFrame();
      expect(provider.active).toBe(false);
    });
  });

  describe('blur handling', () => {
    it('clears all state on window blur', () => {
      keyDown('KeyW');
      keyDown('Space');
      const stateBefore = provider.poll();
      expect(stateBefore.held.size).toBeGreaterThan(0);

      window.dispatchEvent(new Event('blur'));

      const stateAfter = provider.poll();
      expect(stateAfter.held.size).toBe(0);
      expect(stateAfter.axes.size).toBe(0);
    });
  });

  describe('unmapped keys', () => {
    it('ignores unmapped key codes', () => {
      keyDown('F12');
      const state = provider.poll();
      expect(state.pressed.size).toBe(0);
      expect(state.held.size).toBe(0);
    });
  });

  describe('WASD maps to UI navigation', () => {
    it('maps W to uiUp', () => {
      keyDown('KeyW');
      const state = provider.poll();
      expect(state.pressed.has('uiUp')).toBe(true);
    });

    it('maps S to uiDown', () => {
      keyDown('KeyS');
      const state = provider.poll();
      expect(state.pressed.has('uiDown')).toBe(true);
    });

    it('maps A to uiLeft', () => {
      keyDown('KeyA');
      const state = provider.poll();
      expect(state.pressed.has('uiLeft')).toBe(true);
    });

    it('maps D to uiRight', () => {
      keyDown('KeyD');
      const state = provider.poll();
      expect(state.pressed.has('uiRight')).toBe(true);
    });
  });

  describe('destroy', () => {
    it('stops responding to events after destroy', () => {
      provider.destroy();
      keyDown('KeyE');
      const state = provider.poll();
      expect(state.pressed.has('interact')).toBe(false);
    });
  });
});

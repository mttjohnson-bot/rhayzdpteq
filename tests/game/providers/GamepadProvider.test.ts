// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GamepadProvider } from '../../../src/game/providers/GamepadProvider';

/** Create a mock Gamepad object */
function createMockGamepad(
  index: number,
  buttons: { pressed: boolean }[],
  axes: number[] = [0, 0, 0, 0],
): Gamepad {
  return {
    index,
    id: 'Mock Gamepad',
    connected: true,
    timestamp: performance.now(),
    mapping: 'standard',
    hapticActuators: [],
    vibrationActuator: null,
    buttons: buttons.map((b) => ({
      pressed: b.pressed,
      touched: b.pressed,
      value: b.pressed ? 1 : 0,
    })),
    axes,
  } as unknown as Gamepad;
}

/** Simulate a gamepadconnected event */
function connectGamepad(index: number): void {
  const event = new Event('gamepadconnected') as GamepadEvent;
  Object.defineProperty(event, 'gamepad', { value: { index } });
  window.dispatchEvent(event);
}

/** Simulate a gamepaddisconnected event */
function disconnectGamepad(index: number): void {
  const event = new Event('gamepaddisconnected') as GamepadEvent;
  Object.defineProperty(event, 'gamepad', { value: { index } });
  window.dispatchEvent(event);
}

describe('GamepadProvider', () => {
  let provider: GamepadProvider;
  let mockGetGamepads: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock navigator.getGamepads
    mockGetGamepads = vi.fn().mockReturnValue([null, null, null, null]);
    Object.defineProperty(navigator, 'getGamepads', {
      value: mockGetGamepads,
      writable: true,
      configurable: true,
    });

    provider = new GamepadProvider();
  });

  afterEach(() => {
    provider.destroy();
  });

  describe('connection tracking', () => {
    it('starts as disconnected', () => {
      expect(provider.connected).toBe(false);
    });

    it('tracks connection on gamepadconnected event', () => {
      connectGamepad(0);
      expect(provider.connected).toBe(true);
    });

    it('tracks disconnection', () => {
      connectGamepad(0);
      disconnectGamepad(0);
      expect(provider.connected).toBe(false);
    });

    it('ignores disconnection of a different gamepad', () => {
      connectGamepad(0);
      disconnectGamepad(1);
      expect(provider.connected).toBe(true);
    });
  });

  describe('button mapping', () => {
    it('maps A button (0) to attack, uiConfirm, respawn', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      buttons[0] = { pressed: true };
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons)]);

      const state = provider.poll();
      expect(state.pressed.has('attack')).toBe(true);
      expect(state.pressed.has('uiConfirm')).toBe(true);
      expect(state.pressed.has('respawn')).toBe(true);
    });

    it('maps B button (1) to interact, uiCancel', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      buttons[1] = { pressed: true };
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons)]);

      const state = provider.poll();
      expect(state.pressed.has('interact')).toBe(true);
      expect(state.pressed.has('uiCancel')).toBe(true);
    });

    it('maps X button (2) to toggleInventory', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      buttons[2] = { pressed: true };
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons)]);

      const state = provider.poll();
      expect(state.pressed.has('toggleInventory')).toBe(true);
    });

    it('maps Y button (3) to toggleSkillTree', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      buttons[3] = { pressed: true };
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons)]);

      const state = provider.poll();
      expect(state.pressed.has('toggleSkillTree')).toBe(true);
    });

    it('maps D-pad buttons to UI navigation', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      buttons[12] = { pressed: true }; // D-pad up
      buttons[15] = { pressed: true }; // D-pad right
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons)]);

      const state = provider.poll();
      expect(state.pressed.has('uiUp')).toBe(true);
      expect(state.pressed.has('uiRight')).toBe(true);
    });

    it('maps R1 button (5) to dropItem', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      buttons[5] = { pressed: true };
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons)]);

      const state = provider.poll();
      expect(state.pressed.has('dropItem')).toBe(true);
    });

    it('maps RT button (7) to attack', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      buttons[7] = { pressed: true };
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons)]);

      const state = provider.poll();
      expect(state.pressed.has('attack')).toBe(true);
    });
  });

  describe('pressed vs held', () => {
    it('reports pressed only on first frame', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      buttons[0] = { pressed: true };
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons)]);

      // First frame
      const state1 = provider.poll();
      expect(state1.pressed.has('attack')).toBe(true);
      provider.endFrame();

      // Second frame — same button still held
      const state2 = provider.poll();
      expect(state2.pressed.has('attack')).toBe(false);
      expect(state2.held.has('attack')).toBe(true);
    });

    it('stops reporting held after button release', () => {
      connectGamepad(0);

      // Press
      const buttonsDown = Array.from({ length: 16 }, () => ({ pressed: false }));
      buttonsDown[0] = { pressed: true };
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttonsDown)]);
      provider.poll();
      provider.endFrame();

      // Release
      const buttonsUp = Array.from({ length: 16 }, () => ({ pressed: false }));
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttonsUp)]);
      const state = provider.poll();
      expect(state.held.has('attack')).toBe(false);
    });
  });

  describe('stick axes', () => {
    it('maps left stick to moveX and moveZ', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons, [0.8, -0.6, 0, 0])]);

      const state = provider.poll();
      expect(state.axes.get('moveX')).toBe(0.8);
      expect(state.axes.get('moveZ')).toBe(-0.6);
    });

    it('applies deadzone filtering', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      // Values within deadzone (0.2)
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons, [0.1, -0.15, 0, 0])]);

      const state = provider.poll();
      expect(state.axes.has('moveX')).toBe(false);
      expect(state.axes.has('moveZ')).toBe(false);
    });
  });

  describe('active detection', () => {
    it('starts as inactive', () => {
      expect(provider.active).toBe(false);
    });

    it('becomes active on button press', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      buttons[0] = { pressed: true };
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons)]);
      provider.poll();

      expect(provider.active).toBe(true);
    });

    it('becomes active on stick movement', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons, [0.5, 0, 0, 0])]);
      provider.poll();

      expect(provider.active).toBe(true);
    });

    it('resets active after poll with no input', () => {
      connectGamepad(0);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons)]);
      provider.poll();

      expect(provider.active).toBe(false);
    });
  });

  describe('no gamepad connected', () => {
    it('returns empty state when no gamepad is connected', () => {
      const state = provider.poll();
      expect(state.pressed.size).toBe(0);
      expect(state.held.size).toBe(0);
      expect(state.axes.size).toBe(0);
    });
  });

  describe('no synthetic events', () => {
    it('does not dispatch keyboard events on button press', () => {
      connectGamepad(0);

      const keydownSpy = vi.fn();
      window.addEventListener('keydown', keydownSpy);

      const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
      buttons[0] = { pressed: true };
      mockGetGamepads.mockReturnValue([createMockGamepad(0, buttons)]);
      provider.poll();

      // Filter out any keydown events that weren't dispatched by the provider
      // (The provider should dispatch zero)
      expect(keydownSpy).not.toHaveBeenCalled();

      window.removeEventListener('keydown', keydownSpy);
    });
  });

  describe('destroy', () => {
    it('stops responding to connection events after destroy', () => {
      provider.destroy();
      connectGamepad(0);
      expect(provider.connected).toBe(false);
    });
  });
});

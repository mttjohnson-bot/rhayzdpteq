// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ActionManager } from '../../src/game/ActionManager';
import type { InputProvider, InputProviderState } from '../../src/game/providers/InputProvider';
import type { InputAction } from '../../src/game/InputAction';

/** Create a minimal mock provider with controllable state */
function createMockProvider(
  name: string,
  state?: Partial<InputProviderState>,
): InputProvider & { setState: (s: Partial<InputProviderState>) => void; _active: boolean } {
  let current: InputProviderState = {
    pressed: state?.pressed ?? new Set(),
    held: state?.held ?? new Set(),
    axes: state?.axes ?? new Map(),
  };
  let _active = false;

  return {
    name,
    get active() {
      return _active;
    },
    set _active(v: boolean) {
      _active = v;
    },
    poll() {
      return {
        pressed: new Set(current.pressed),
        held: new Set(current.held),
        axes: new Map(current.axes),
      };
    },
    endFrame() {
      current.pressed = new Set();
      _active = false;
    },
    destroy() {},
    setState(s: Partial<InputProviderState>) {
      if (s.pressed) current.pressed = s.pressed;
      if (s.held) current.held = s.held;
      if (s.axes) current.axes = s.axes;
      _active = true;
    },
  };
}

describe('ActionManager', () => {
  let manager: ActionManager;

  beforeEach(() => {
    manager = new ActionManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('basic action queries', () => {
    it('returns false for unregistered actions', () => {
      manager.update();
      expect(manager.wasActionPressed('attack')).toBe(false);
      expect(manager.isActionHeld('attack')).toBe(false);
      expect(manager.getAxis('moveX')).toBe(0);
    });

    it('reports pressed actions from a provider', () => {
      const provider = createMockProvider('test');
      manager.addProvider(provider);

      provider.setState({ pressed: new Set(['attack'] as InputAction[]) });
      manager.update();

      expect(manager.wasActionPressed('attack')).toBe(true);
      expect(manager.wasActionPressed('interact')).toBe(false);
    });

    it('reports held actions from a provider', () => {
      const provider = createMockProvider('test');
      manager.addProvider(provider);

      provider.setState({ held: new Set(['attack'] as InputAction[]) });
      manager.update();

      expect(manager.isActionHeld('attack')).toBe(true);
      expect(manager.isActionHeld('interact')).toBe(false);
    });

    it('reports axis values from a provider', () => {
      const provider = createMockProvider('test');
      manager.addProvider(provider);

      provider.setState({ axes: new Map([['moveX', 0.75]] as [InputAction, number][]) });
      manager.update();

      expect(manager.getAxis('moveX')).toBe(0.75);
      expect(manager.getAxis('moveZ')).toBe(0);
    });
  });

  describe('merging multiple providers', () => {
    it('merges pressed actions from multiple providers', () => {
      const p1 = createMockProvider('keyboard');
      const p2 = createMockProvider('gamepad');
      manager.addProvider(p1);
      manager.addProvider(p2);

      p1.setState({ pressed: new Set(['attack'] as InputAction[]) });
      p2.setState({ pressed: new Set(['interact'] as InputAction[]) });
      manager.update();

      expect(manager.wasActionPressed('attack')).toBe(true);
      expect(manager.wasActionPressed('interact')).toBe(true);
    });

    it('merges held actions from multiple providers', () => {
      const p1 = createMockProvider('keyboard');
      const p2 = createMockProvider('mouse');
      manager.addProvider(p1);
      manager.addProvider(p2);

      p1.setState({ held: new Set(['moveX'] as InputAction[]) });
      p2.setState({ held: new Set(['attack'] as InputAction[]) });
      manager.update();

      expect(manager.isActionHeld('moveX')).toBe(true);
      expect(manager.isActionHeld('attack')).toBe(true);
    });

    it('takes the larger absolute axis value when providers conflict', () => {
      const p1 = createMockProvider('keyboard');
      const p2 = createMockProvider('gamepad');
      manager.addProvider(p1);
      manager.addProvider(p2);

      p1.setState({ axes: new Map([['moveX', -1]] as [InputAction, number][]) });
      p2.setState({ axes: new Map([['moveX', 0.5]] as [InputAction, number][]) });
      manager.update();

      // -1 has abs 1 > abs 0.5, so -1 wins
      expect(manager.getAxis('moveX')).toBe(-1);
    });

    it('takes the smaller absolute value when it appears second with larger abs', () => {
      const p1 = createMockProvider('keyboard');
      const p2 = createMockProvider('gamepad');
      manager.addProvider(p1);
      manager.addProvider(p2);

      p1.setState({ axes: new Map([['moveX', 0.3]] as [InputAction, number][]) });
      p2.setState({ axes: new Map([['moveX', -0.8]] as [InputAction, number][]) });
      manager.update();

      // |-0.8| > |0.3|, so -0.8 wins
      expect(manager.getAxis('moveX')).toBe(-0.8);
    });
  });

  describe('getMovement', () => {
    it('returns zero vector when no input', () => {
      manager.update();
      const { x, z } = manager.getMovement();
      expect(x).toBe(0);
      expect(z).toBe(0);
    });

    it('returns axis values for cardinal movement', () => {
      const provider = createMockProvider('keyboard');
      manager.addProvider(provider);

      provider.setState({
        axes: new Map([
          ['moveX', 1],
          ['moveZ', 0],
        ] as [InputAction, number][]),
      });
      manager.update();

      const { x, z } = manager.getMovement();
      expect(x).toBe(1);
      expect(z).toBe(0);
    });

    it('normalizes diagonal movement to magnitude 1', () => {
      const provider = createMockProvider('keyboard');
      manager.addProvider(provider);

      provider.setState({
        axes: new Map([
          ['moveX', 1],
          ['moveZ', 1],
        ] as [InputAction, number][]),
      });
      manager.update();

      const { x, z } = manager.getMovement();
      const magnitude = Math.sqrt(x * x + z * z);
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it('does not normalize sub-unit movement', () => {
      const provider = createMockProvider('gamepad');
      manager.addProvider(provider);

      provider.setState({
        axes: new Map([
          ['moveX', 0.3],
          ['moveZ', 0.4],
        ] as [InputAction, number][]),
      });
      manager.update();

      const { x, z } = manager.getMovement();
      expect(x).toBe(0.3);
      expect(z).toBe(0.4);
    });
  });

  describe('getMousePosition', () => {
    it('returns zero when no mouse provider is registered', () => {
      const { x, y } = manager.getMousePosition();
      expect(x).toBe(0);
      expect(y).toBe(0);
    });
  });

  describe('endFrame', () => {
    it('clears pressed state after endFrame', () => {
      const provider = createMockProvider('keyboard');
      manager.addProvider(provider);

      provider.setState({ pressed: new Set(['attack'] as InputAction[]) });
      manager.update();
      expect(manager.wasActionPressed('attack')).toBe(true);

      manager.endFrame();
      manager.update();
      expect(manager.wasActionPressed('attack')).toBe(false);
    });
  });

  describe('primaryDevice', () => {
    it('defaults to keyboard', () => {
      expect(manager.primaryDevice).toBe('keyboard');
    });

    it('switches to gamepad when gamepad is active', () => {
      const kbProvider = createMockProvider('keyboard');
      const gpProvider = createMockProvider('gamepad');
      manager.addProvider(kbProvider);
      manager.addProvider(gpProvider);

      gpProvider.setState({ pressed: new Set(['attack'] as InputAction[]) });
      manager.update();

      expect(manager.primaryDevice).toBe('gamepad');
    });

    it('switches to touch when touch is active', () => {
      const kbProvider = createMockProvider('keyboard');
      const touchProvider = createMockProvider('touch');
      manager.addProvider(kbProvider);
      manager.addProvider(touchProvider);

      touchProvider.setState({ pressed: new Set(['attack'] as InputAction[]) });
      manager.update();

      expect(manager.primaryDevice).toBe('touch');
    });

    it('prioritizes touch over gamepad when both active', () => {
      const gpProvider = createMockProvider('gamepad');
      const touchProvider = createMockProvider('touch');
      manager.addProvider(gpProvider);
      manager.addProvider(touchProvider);

      gpProvider.setState({ pressed: new Set(['attack'] as InputAction[]) });
      touchProvider.setState({ pressed: new Set(['interact'] as InputAction[]) });
      manager.update();

      expect(manager.primaryDevice).toBe('touch');
    });

    it('treats mouse as keyboard device', () => {
      const mouseProvider = createMockProvider('mouse');
      manager.addProvider(mouseProvider);

      mouseProvider.setState({ pressed: new Set(['attack'] as InputAction[]) });
      manager.update();

      expect(manager.primaryDevice).toBe('keyboard');
    });
  });

  describe('getActiveDevices', () => {
    it('returns empty set when no input detected', () => {
      manager.update();
      expect(manager.getActiveDevices().size).toBe(0);
    });

    it('returns names of active providers', () => {
      const kbProvider = createMockProvider('keyboard');
      const mouseProvider = createMockProvider('mouse');
      manager.addProvider(kbProvider);
      manager.addProvider(mouseProvider);

      kbProvider.setState({ pressed: new Set(['attack'] as InputAction[]) });
      manager.update();

      const active = manager.getActiveDevices();
      expect(active.has('keyboard')).toBe(true);
      expect(active.has('mouse')).toBe(false);
    });
  });

  describe('destroy', () => {
    it('calls destroy on all providers', () => {
      const p1 = createMockProvider('keyboard');
      const p2 = createMockProvider('mouse');
      const spy1 = vi.spyOn(p1, 'destroy');
      const spy2 = vi.spyOn(p2, 'destroy');
      manager.addProvider(p1);
      manager.addProvider(p2);

      manager.destroy();

      expect(spy1).toHaveBeenCalledOnce();
      expect(spy2).toHaveBeenCalledOnce();
    });

    it('clears providers after destroy', () => {
      const p1 = createMockProvider('keyboard');
      manager.addProvider(p1);

      p1.setState({ pressed: new Set(['attack'] as InputAction[]) });
      manager.destroy();
      manager.update();

      expect(manager.wasActionPressed('attack')).toBe(false);
    });
  });
});

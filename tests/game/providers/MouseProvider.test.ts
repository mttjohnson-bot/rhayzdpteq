// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MouseProvider } from '../../../src/game/providers/MouseProvider';

/** Simulate a mousedown event */
function mouseDown(button = 0): void {
  window.dispatchEvent(new MouseEvent('mousedown', { button, bubbles: true }));
}

/** Simulate a mouseup event */
function mouseUp(button = 0): void {
  window.dispatchEvent(new MouseEvent('mouseup', { button, bubbles: true }));
}

/** Simulate a mousemove event */
function mouseMove(clientX: number, clientY: number): void {
  window.dispatchEvent(new MouseEvent('mousemove', { clientX, clientY, bubbles: true }));
}

describe('MouseProvider', () => {
  let provider: MouseProvider;

  beforeEach(() => {
    provider = new MouseProvider();
  });

  afterEach(() => {
    provider.destroy();
  });

  describe('left click mapping', () => {
    it('reports attack on left mouse press', () => {
      mouseDown(0);
      const state = provider.poll();
      expect(state.pressed.has('attack')).toBe(true);
    });

    it('reports uiConfirm on left mouse press', () => {
      mouseDown(0);
      const state = provider.poll();
      expect(state.pressed.has('uiConfirm')).toBe(true);
    });

    it('reports held attack while button is held', () => {
      mouseDown(0);
      provider.poll();
      provider.endFrame();

      const state = provider.poll();
      expect(state.pressed.has('attack')).toBe(false);
      expect(state.held.has('attack')).toBe(true);
    });

    it('clears held state on mouse release', () => {
      mouseDown(0);
      provider.poll();

      mouseUp(0);
      const state = provider.poll();
      expect(state.held.has('attack')).toBe(false);
    });
  });

  describe('right click', () => {
    it('ignores right mouse button (no mapping)', () => {
      mouseDown(2);
      const state = provider.poll();
      expect(state.pressed.size).toBe(0);
    });
  });

  describe('mouse position tracking', () => {
    it('starts at zero', () => {
      expect(provider.mouseX).toBe(0);
      expect(provider.mouseY).toBe(0);
    });

    it('tracks normalized mouse position on move', () => {
      // jsdom window dimensions default to 1024x768
      // Center of screen → mouseX = 0, mouseY = 0
      mouseMove(window.innerWidth / 2, window.innerHeight / 2);
      expect(provider.mouseX).toBeCloseTo(0, 1);
      expect(provider.mouseY).toBeCloseTo(0, 1);
    });

    it('returns -1 to +1 range at screen edges', () => {
      // Left edge
      mouseMove(0, window.innerHeight / 2);
      expect(provider.mouseX).toBeCloseTo(-1, 1);

      // Right edge
      mouseMove(window.innerWidth, window.innerHeight / 2);
      expect(provider.mouseX).toBeCloseTo(1, 1);
    });
  });

  describe('active detection', () => {
    it('starts as inactive', () => {
      expect(provider.active).toBe(false);
    });

    it('becomes active on click', () => {
      mouseDown(0);
      expect(provider.active).toBe(true);
    });

    it('becomes active on mouse move', () => {
      mouseMove(100, 100);
      expect(provider.active).toBe(true);
    });

    it('resets active on endFrame', () => {
      mouseDown(0);
      provider.endFrame();
      expect(provider.active).toBe(false);
    });
  });

  describe('axes', () => {
    it('returns empty axes (mouse has no axis mappings)', () => {
      mouseDown(0);
      const state = provider.poll();
      expect(state.axes.size).toBe(0);
    });
  });

  describe('blur handling', () => {
    it('clears held state on window blur', () => {
      mouseDown(0);
      const stateBefore = provider.poll();
      expect(stateBefore.held.has('attack')).toBe(true);

      window.dispatchEvent(new Event('blur'));

      const stateAfter = provider.poll();
      expect(stateAfter.held.size).toBe(0);
    });
  });

  describe('destroy', () => {
    it('stops responding to events after destroy', () => {
      provider.destroy();
      mouseDown(0);
      const state = provider.poll();
      expect(state.pressed.size).toBe(0);
    });
  });
});

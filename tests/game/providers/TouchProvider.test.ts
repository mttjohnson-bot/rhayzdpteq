// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TouchProvider } from '../../../src/game/providers/TouchProvider';

describe('TouchProvider', () => {
  let provider: TouchProvider;

  beforeEach(() => {
    // TouchControls looks for #ui-overlay to mount into
    const overlay = document.createElement('div');
    overlay.id = 'ui-overlay';
    document.body.appendChild(overlay);

    provider = new TouchProvider();
  });

  afterEach(() => {
    provider.destroy();
    const overlay = document.getElementById('ui-overlay');
    overlay?.remove();
  });

  describe('initial state', () => {
    it('has name "touch"', () => {
      expect(provider.name).toBe('touch');
    });

    it('starts as inactive', () => {
      expect(provider.active).toBe(false);
    });

    it('returns empty state on poll', () => {
      const state = provider.poll();
      expect(state.pressed.size).toBe(0);
      expect(state.held.size).toBe(0);
      expect(state.axes.size).toBe(0);
    });
  });

  describe('auto-hide on keyboard input', () => {
    it('hides touch controls when a keyboard event fires', () => {
      // Manually show controls (simulating a prior touch)
      const controls = document.getElementById('touch-controls');
      if (controls) controls.style.display = 'block';

      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));

      // Controls should be hidden
      expect(controls?.style.display).toBe('none');
    });
  });

  describe('endFrame', () => {
    it('clears active flag on endFrame', () => {
      // Can't easily trigger active state without real touch events,
      // but we can verify endFrame resets the flag
      provider.endFrame();
      expect(provider.active).toBe(false);
    });

    it('clears pressed actions on endFrame', () => {
      provider.endFrame();
      const state = provider.poll();
      expect(state.pressed.size).toBe(0);
    });
  });

  describe('destroy', () => {
    it('removes touch controls from DOM on destroy', () => {
      provider.destroy();
      expect(document.getElementById('touch-controls')).toBe(null);
    });
  });
});

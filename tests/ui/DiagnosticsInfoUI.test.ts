// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { detectOS, detectBrowser } from '../../src/ui/DiagnosticsInfoUI';

describe('detectOS', () => {
  const originalUA = navigator.userAgent;

  function setUA(ua: string) {
    Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  }

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true });
  });

  it('detects Chrome OS', () => {
    setUA('Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36');
    expect(detectOS()).toBe('Chrome OS');
  });

  it('detects Windows 10/11', () => {
    setUA('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    expect(detectOS()).toBe('Windows 10/11');
  });

  it('detects generic Windows', () => {
    setUA('Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36');
    expect(detectOS()).toBe('Windows');
  });

  it('detects macOS with version', () => {
    setUA('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    expect(detectOS()).toBe('macOS 10.15');
  });

  it('detects Android with version', () => {
    setUA('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36');
    expect(detectOS()).toBe('Android 13');
  });

  it('detects iOS', () => {
    setUA('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15');
    expect(detectOS()).toBe('iOS');
  });

  it('detects Linux', () => {
    setUA('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36');
    expect(detectOS()).toBe('Linux');
  });

  it('returns Unknown for unrecognized UA', () => {
    setUA('SomeWeirdAgent/1.0');
    expect(detectOS()).toBe('Unknown');
  });
});

describe('detectBrowser', () => {
  const originalUA = navigator.userAgent;

  function setUA(ua: string) {
    Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  }

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true });
  });

  it('detects Chrome', () => {
    setUA(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    );
    expect(detectBrowser()).toBe('Chrome 120.0.0.0');
  });

  it('detects Edge', () => {
    setUA(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    );
    expect(detectBrowser()).toBe('Edge 120.0.0.0');
  });

  it('detects Firefox', () => {
    setUA('Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0');
    expect(detectBrowser()).toBe('Firefox 121.0');
  });

  it('detects Safari', () => {
    setUA(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    );
    expect(detectBrowser()).toBe('Safari 17.2');
  });

  it('detects Opera', () => {
    setUA(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0',
    );
    expect(detectBrowser()).toBe('Opera 106.0.0.0');
  });

  it('returns Unknown for unrecognized UA', () => {
    setUA('SomeWeirdAgent/1.0');
    expect(detectBrowser()).toBe('Unknown');
  });
});

// Need afterEach import
import { afterEach } from 'vitest';

describe('DiagnosticsInfoUI', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    // Set up the ui-overlay container that the component attaches to
    container = document.createElement('div');
    container.id = 'ui-overlay';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('creates and appends container to ui-overlay', async () => {
    const { DiagnosticsInfoUI } = await import('../../src/ui/DiagnosticsInfoUI');
    const ui = new DiagnosticsInfoUI();
    expect(container.children.length).toBeGreaterThan(0);
    expect(ui.isVisible()).toBe(false);
  });

  it('show() makes it visible and hide() hides it', async () => {
    const { DiagnosticsInfoUI } = await import('../../src/ui/DiagnosticsInfoUI');
    const ui = new DiagnosticsInfoUI();
    let closeCalled = false;

    ui.show({ fps: 60, drawCalls: 100, renderer: null }, () => {
      closeCalled = true;
    });
    expect(ui.isVisible()).toBe(true);

    ui.hide();
    expect(ui.isVisible()).toBe(false);
    expect(closeCalled).toBe(true);
  });

  it('setInputDevice updates the device', async () => {
    const { DiagnosticsInfoUI } = await import('../../src/ui/DiagnosticsInfoUI');
    const ui = new DiagnosticsInfoUI();
    // Should not throw
    ui.setInputDevice('gamepad');
    ui.setInputDevice('touch');
    ui.setInputDevice('keyboard');
  });
});

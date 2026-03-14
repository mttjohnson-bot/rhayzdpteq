/**
 * Diagnostics info tab accessible from the menu tab system.
 *
 * Shows:
 *  - OS and browser detection and display
 *  - Controller type detection and status
 *  - Renderer info (GPU, draw calls, FPS)
 */

import type { ActionManager } from '../game/ActionManager';
import type { InputDevice } from '../game/ActionManager';
import type * as THREE from 'three';

export interface DiagnosticsSnapshot {
  fps: number;
  drawCalls: number;
  renderer: THREE.WebGLRenderer | null;
}

export class DiagnosticsInfoUI {
  private container: HTMLDivElement;
  private visible = false;
  private onClose: (() => void) | null = null;
  private inputDevice: InputDevice = 'keyboard';
  private hintEl!: HTMLDivElement;
  private contentEl!: HTMLDivElement;

  // Cached detection results (computed once)
  private osInfo = '';
  private browserInfo = '';
  private gpuInfo = '';

  // Live data supplied each frame
  private lastSnapshot: DiagnosticsSnapshot = { fps: 0, drawCalls: 0, renderer: null };

  // Scroll support for keyboard/gamepad
  private scrollOffset = 0;
  private readonly SCROLL_STEP = 40;

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '60px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(10, 10, 20, 0.95)',
      border: '2px solid rgba(170, 68, 255, 0.6)',
      borderRadius: '8px',
      padding: '1.5rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      color: '#eee',
      minWidth: '360px',
      maxWidth: '480px',
      maxHeight: '70vh',
      zIndex: '200',
      display: 'none',
    });

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);

    this.detectEnvironment();
  }

  show(snapshot: DiagnosticsSnapshot, onClose: () => void): void {
    this.lastSnapshot = snapshot;
    this.onClose = onClose;
    this.visible = true;
    this.scrollOffset = 0;

    // Detect GPU on first show when renderer is available
    if (!this.gpuInfo && snapshot.renderer) {
      this.detectGPU(snapshot.renderer);
    }

    this.render();
    this.container.style.display = 'block';
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
    this.onClose?.();
    this.onClose = null;
  }

  isVisible(): boolean {
    return this.visible;
  }

  setInputDevice(device: InputDevice): void {
    this.inputDevice = device;
    if (this.visible) {
      this.updateHintText();
    }
  }

  /** Update live data (called each frame from Game.ts) */
  updateSnapshot(snapshot: DiagnosticsSnapshot): void {
    this.lastSnapshot = snapshot;
    if (this.visible) {
      this.updateLiveRows();
    }
  }

  handleActions(actions: ActionManager): void {
    if (!this.visible) return;

    if (actions.wasActionPressed('uiUp')) {
      this.scrollOffset = Math.max(0, this.scrollOffset - this.SCROLL_STEP);
      this.applyScroll();
    }
    if (actions.wasActionPressed('uiDown')) {
      this.scrollOffset += this.SCROLL_STEP;
      this.applyScroll();
    }
    if (actions.wasActionPressed('uiCancel')) {
      this.hide();
    }
  }

  private applyScroll(): void {
    if (this.contentEl) {
      this.contentEl.scrollTop = this.scrollOffset;
    }
  }

  private detectEnvironment(): void {
    this.osInfo = detectOS();
    this.browserInfo = detectBrowser();
  }

  private detectGPU(renderer: THREE.WebGLRenderer): void {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      this.gpuInfo = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string;
    } else {
      this.gpuInfo = 'Unknown (debug info unavailable)';
    }
  }

  // References to live-updating elements
  private fpsValueEl: HTMLSpanElement | null = null;
  private drawCallsValueEl: HTMLSpanElement | null = null;
  private controllerStatusEl: HTMLSpanElement | null = null;

  private render(): void {
    this.container.innerHTML = '';

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '1.2rem',
    });

    const title = document.createElement('h2');
    title.textContent = 'Diagnostics';
    Object.assign(title.style, { margin: '0', fontSize: '1.3rem', color: '#dd88ff' });
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'X';
    Object.assign(closeBtn.style, {
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.3)',
      borderRadius: '4px',
      color: '#aaa',
      cursor: 'pointer',
      fontSize: '1rem',
      padding: '0.2rem 0.6rem',
    });
    closeBtn.addEventListener('click', () => this.hide());
    header.appendChild(closeBtn);
    this.container.appendChild(header);

    // Scrollable content area
    this.contentEl = document.createElement('div');
    Object.assign(this.contentEl.style, {
      overflowY: 'auto',
      maxHeight: 'calc(70vh - 6rem)',
    });
    this.container.appendChild(this.contentEl);

    // --- System Section ---
    this.addSectionHeader('System');
    this.addInfoRow('OS', this.osInfo);
    this.addInfoRow('Browser', this.browserInfo);
    this.addInfoRow(
      'Screen',
      `${window.screen.width}x${window.screen.height} @ ${window.devicePixelRatio.toFixed(1)}x`,
    );
    this.addInfoRow('Viewport', `${window.innerWidth}x${window.innerHeight}`);

    // --- Renderer Section ---
    this.addSectionHeader('Renderer');
    this.addInfoRow('GPU', this.gpuInfo || 'Detecting...');
    this.fpsValueEl = this.addInfoRow('FPS', this.formatFps(this.lastSnapshot.fps));
    this.drawCallsValueEl = this.addInfoRow('Draw Calls', String(this.lastSnapshot.drawCalls));

    // --- Controller Section ---
    this.addSectionHeader('Controller');
    this.addInfoRow('Active Input', this.formatInputDevice(this.inputDevice));
    this.controllerStatusEl = this.addInfoRow('Gamepad', this.getGamepadStatus());

    // Hint line
    this.hintEl = document.createElement('div');
    Object.assign(this.hintEl.style, {
      marginTop: '1rem',
      fontSize: '0.7rem',
      color: '#777',
      textAlign: 'center',
      lineHeight: '1.4',
    });
    this.updateHintText();
    this.container.appendChild(this.hintEl);
  }

  private addSectionHeader(text: string): void {
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style, {
      fontSize: '0.8rem',
      fontWeight: 'bold',
      color: '#aa88ff',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginTop: '0.8rem',
      marginBottom: '0.4rem',
      borderBottom: '1px solid rgba(170, 136, 255, 0.2)',
      paddingBottom: '0.2rem',
    });
    this.contentEl.appendChild(el);
  }

  /** Add a label-value row. Returns the value span for live updating. */
  private addInfoRow(label: string, value: string): HTMLSpanElement {
    const row = document.createElement('div');
    Object.assign(row.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.35rem 0.8rem',
      marginBottom: '0.2rem',
      background: 'rgba(40, 40, 60, 0.5)',
      border: '1px solid rgba(100, 100, 130, 0.3)',
      borderRadius: '4px',
      fontSize: '0.85rem',
    });

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    Object.assign(labelEl.style, { color: '#999' });
    row.appendChild(labelEl);

    const valueEl = document.createElement('span');
    valueEl.textContent = value;
    Object.assign(valueEl.style, {
      color: '#ccc',
      textAlign: 'right',
      maxWidth: '60%',
      wordBreak: 'break-word',
    });
    row.appendChild(valueEl);

    this.contentEl.appendChild(row);
    return valueEl;
  }

  private updateLiveRows(): void {
    if (this.fpsValueEl) {
      this.fpsValueEl.textContent = this.formatFps(this.lastSnapshot.fps);
      this.fpsValueEl.style.color = this.fpsColor(this.lastSnapshot.fps);
    }
    if (this.drawCallsValueEl) {
      this.drawCallsValueEl.textContent = String(this.lastSnapshot.drawCalls);
    }
    if (this.controllerStatusEl) {
      this.controllerStatusEl.textContent = this.getGamepadStatus();
    }
  }

  private formatFps(fps: number): string {
    return fps > 0 ? String(fps) : '--';
  }

  private fpsColor(fps: number): string {
    if (fps <= 0) return '#ccc';
    if (fps < 30) return '#ff6644';
    if (fps < 50) return '#cccc44';
    return '#88cc88';
  }

  private formatInputDevice(device: InputDevice): string {
    switch (device) {
      case 'keyboard':
        return 'Keyboard / Mouse';
      case 'gamepad':
        return 'Gamepad';
      case 'touch':
        return 'Touch';
    }
  }

  private getGamepadStatus(): string {
    if (typeof navigator.getGamepads !== 'function') return 'Not supported';
    const gamepads = navigator.getGamepads();
    for (const gp of gamepads) {
      if (gp && gp.connected) {
        return gp.id;
      }
    }
    return 'Not connected';
  }

  private updateHintText(): void {
    if (!this.hintEl) return;
    switch (this.inputDevice) {
      case 'gamepad':
        this.hintEl.textContent = 'D-pad: scroll | B: close | LB/RB: switch tab';
        break;
      case 'touch':
        this.hintEl.textContent = 'Scroll to view | Tap X to close';
        break;
      default:
        this.hintEl.textContent = 'Up/Down: scroll | Esc: close';
    }
  }
}

/** Detect OS from user agent string */
export function detectOS(): string {
  const ua = navigator.userAgent;
  if (/CrOS/.test(ua)) return 'Chrome OS';
  if (/Windows NT 10/.test(ua)) return 'Windows 10/11';
  if (/Windows/.test(ua)) return 'Windows';
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/Mac OS X/.test(ua)) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    return match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
  }
  if (/Android/.test(ua)) {
    const match = ua.match(/Android (\d+(\.\d+)?)/);
    return match ? `Android ${match[1]}` : 'Android';
  }
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown';
}

/** Detect browser from user agent string */
export function detectBrowser(): string {
  const ua = navigator.userAgent;

  // Order matters — check more specific patterns first
  if (/Edg\//.test(ua)) {
    const match = ua.match(/Edg\/([\d.]+)/);
    return match ? `Edge ${match[1]}` : 'Edge';
  }
  if (/OPR\//.test(ua) || /Opera/.test(ua)) {
    const match = ua.match(/OPR\/([\d.]+)/);
    return match ? `Opera ${match[1]}` : 'Opera';
  }
  if (/Firefox\//.test(ua)) {
    const match = ua.match(/Firefox\/([\d.]+)/);
    return match ? `Firefox ${match[1]}` : 'Firefox';
  }
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) {
    const match = ua.match(/Version\/([\d.]+)/);
    return match ? `Safari ${match[1]}` : 'Safari';
  }
  if (/Chrome\//.test(ua)) {
    const match = ua.match(/Chrome\/([\d.]+)/);
    return match ? `Chrome ${match[1]}` : 'Chrome';
  }
  return 'Unknown';
}

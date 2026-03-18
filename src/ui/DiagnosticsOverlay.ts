/**
 * Diagnostics overlay showing real-time FPS and draw call count.
 *
 * Positioned at the top-right corner. Updates once per second to avoid
 * layout thrashing. Toggled via the Settings menu.
 */

import type * as THREE from 'three';

export class DiagnosticsOverlay {
  private container: HTMLDivElement;
  private fpsEl: HTMLSpanElement;
  private drawCallsEl: HTMLSpanElement;
  private visible = false;

  // FPS calculation
  private frameCount = 0;
  private elapsed = 0;
  private currentFps = 0;
  private lastDrawCalls = 0;

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '52px',
      right: '12px',
      padding: '0.3rem 0.6rem',
      background: 'rgba(0, 0, 0, 0.7)',
      border: '1px solid rgba(170, 68, 255, 0.3)',
      borderRadius: '4px',
      fontFamily: "'Segoe UI Mono', 'Courier New', monospace",
      fontSize: '0.7rem',
      color: '#88cc88',
      pointerEvents: 'none',
      zIndex: '50',
      display: 'none',
      lineHeight: '1.5',
    });

    this.fpsEl = document.createElement('span');
    this.fpsEl.textContent = 'FPS: --';
    this.container.appendChild(this.fpsEl);

    this.container.appendChild(document.createElement('br'));

    this.drawCallsEl = document.createElement('span');
    this.drawCallsEl.textContent = 'Draw: --';
    this.container.appendChild(this.drawCallsEl);

    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  show(): void {
    if (this.visible) return;
    this.visible = true;
    this.frameCount = 0;
    this.elapsed = 0;
    this.container.style.display = 'block';
  }

  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
  }

  isEnabled(): boolean {
    return this.visible;
  }

  /** Current FPS value (updated once per second) */
  get fps(): number {
    return this.currentFps;
  }

  /** Latest draw call count from the renderer */
  get drawCalls(): number {
    return this.lastDrawCalls;
  }

  /** Call once per frame with delta time and the renderer */
  update(dt: number, renderer: THREE.WebGLRenderer): void {
    if (!this.visible) return;

    this.frameCount++;
    this.elapsed += dt;

    // Update display once per second
    if (this.elapsed >= 1) {
      this.currentFps = Math.round(this.frameCount / this.elapsed);
      const drawCalls = renderer.info.render.calls;
      this.lastDrawCalls = drawCalls;

      // Color-code FPS: green >= 50, yellow >= 30, red < 30
      let fpsColor = '#88cc88';
      if (this.currentFps < 30) fpsColor = '#ff6644';
      else if (this.currentFps < 50) fpsColor = '#cccc44';

      this.fpsEl.textContent = `FPS: ${this.currentFps}`;
      this.fpsEl.style.color = fpsColor;
      this.drawCallsEl.textContent = `Draw: ${drawCalls}`;

      this.frameCount = 0;
      this.elapsed = 0;
    }
  }
}

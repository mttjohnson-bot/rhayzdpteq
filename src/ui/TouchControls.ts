/**
 * DOM overlay for virtual joystick and action buttons.
 *
 * Creates semi-transparent touch controls positioned for thumb-based
 * gameplay: a floating virtual joystick on the left side and action
 * buttons on the right. All visual elements are managed here; input
 * event handling lives in TouchProvider.
 */
export class TouchControls {
  readonly container: HTMLDivElement;

  // Joystick visual elements (pointer-events: none — purely decorative)
  readonly joystickBase: HTMLDivElement;
  readonly joystickKnob: HTMLDivElement;

  // Action buttons (pointer-events: auto — receive touch events)
  readonly attackBtn: HTMLDivElement;
  readonly interactBtn: HTMLDivElement;
  readonly inventoryBtn: HTMLDivElement;
  readonly skillTreeBtn: HTMLDivElement;

  /** Radius of the joystick base circle in pixels */
  static readonly JOYSTICK_RADIUS = 55;
  /** Radius of the joystick knob circle in pixels */
  static readonly KNOB_RADIUS = 22;

  constructor() {
    // Main container — covers the full viewport but doesn't block events
    this.container = document.createElement('div');
    this.container.id = 'touch-controls';
    Object.assign(this.container.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '50',
      display: 'none',
    });

    // ── Joystick ──────────────────────────────────────────────────────────

    const baseSize = TouchControls.JOYSTICK_RADIUS * 2;
    this.joystickBase = document.createElement('div');
    Object.assign(this.joystickBase.style, {
      position: 'absolute',
      width: `${baseSize}px`,
      height: `${baseSize}px`,
      borderRadius: '50%',
      background: 'rgba(0, 0, 0, 0.3)',
      border: '2px solid rgba(170, 68, 255, 0.4)',
      display: 'none',
      pointerEvents: 'none',
    });
    this.container.appendChild(this.joystickBase);

    const knobSize = TouchControls.KNOB_RADIUS * 2;
    this.joystickKnob = document.createElement('div');
    Object.assign(this.joystickKnob.style, {
      position: 'absolute',
      width: `${knobSize}px`,
      height: `${knobSize}px`,
      borderRadius: '50%',
      background: 'rgba(170, 68, 255, 0.6)',
      border: '2px solid rgba(200, 150, 255, 0.8)',
      left: `${TouchControls.JOYSTICK_RADIUS - TouchControls.KNOB_RADIUS}px`,
      top: `${TouchControls.JOYSTICK_RADIUS - TouchControls.KNOB_RADIUS}px`,
      pointerEvents: 'none',
    });
    this.joystickBase.appendChild(this.joystickKnob);

    // ── Action Buttons ────────────────────────────────────────────────────

    this.attackBtn = this.createButton('ATK', 64);
    Object.assign(this.attackBtn.style, {
      position: 'absolute',
      bottom: '40px',
      right: '24px',
    });

    this.interactBtn = this.createButton('E', 48);
    Object.assign(this.interactBtn.style, {
      position: 'absolute',
      bottom: '120px',
      right: '88px',
    });

    this.inventoryBtn = this.createButton('I', 44);
    Object.assign(this.inventoryBtn.style, {
      position: 'absolute',
      top: '70px',
      right: '64px',
    });

    this.skillTreeBtn = this.createButton('K', 44);
    Object.assign(this.skillTreeBtn.style, {
      position: 'absolute',
      top: '70px',
      right: '14px',
    });

    this.container.appendChild(this.attackBtn);
    this.container.appendChild(this.interactBtn);
    this.container.appendChild(this.inventoryBtn);
    this.container.appendChild(this.skillTreeBtn);

    // Mount to the UI overlay
    const overlay = document.getElementById('ui-overlay');
    overlay?.appendChild(this.container);
  }

  /** Show the touch controls overlay */
  show(): void {
    this.container.style.display = 'block';
  }

  /** Hide the entire touch controls overlay and reset joystick */
  hide(): void {
    this.container.style.display = 'none';
    this.hideJoystick();
  }

  /** Whether the touch controls are currently visible */
  get visible(): boolean {
    return this.container.style.display !== 'none';
  }

  /** Show the joystick base centered at the given page coordinates */
  showJoystick(x: number, y: number): void {
    const r = TouchControls.JOYSTICK_RADIUS;
    this.joystickBase.style.left = `${x - r}px`;
    this.joystickBase.style.top = `${y - r}px`;
    this.joystickBase.style.display = 'block';
    // Reset knob to center
    this.joystickKnob.style.left = `${r - TouchControls.KNOB_RADIUS}px`;
    this.joystickKnob.style.top = `${r - TouchControls.KNOB_RADIUS}px`;
  }

  /** Hide the joystick */
  hideJoystick(): void {
    this.joystickBase.style.display = 'none';
  }

  /** Update the knob's visual position. normX and normY are in [-1, +1]. */
  updateKnob(normX: number, normY: number): void {
    const r = TouchControls.JOYSTICK_RADIUS;
    const maxOffset = r - TouchControls.KNOB_RADIUS;
    const px = r + normX * maxOffset - TouchControls.KNOB_RADIUS;
    const py = r + normY * maxOffset - TouchControls.KNOB_RADIUS;
    this.joystickKnob.style.left = `${px}px`;
    this.joystickKnob.style.top = `${py}px`;
  }

  /** Set the active/pressed visual state on a button */
  setButtonActive(btn: HTMLDivElement, active: boolean): void {
    if (active) {
      btn.style.background = 'rgba(170, 68, 255, 0.5)';
      btn.style.borderColor = 'rgba(200, 150, 255, 0.9)';
    } else {
      btn.style.background = 'rgba(0, 0, 0, 0.4)';
      btn.style.borderColor = 'rgba(170, 68, 255, 0.5)';
    }
  }

  /** Remove the overlay from the DOM and clean up */
  destroy(): void {
    this.container.remove();
  }

  /** Create a circular action button with a text label */
  private createButton(label: string, size: number): HTMLDivElement {
    const btn = document.createElement('div');
    Object.assign(btn.style, {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: 'rgba(0, 0, 0, 0.4)',
      border: '2px solid rgba(170, 68, 255, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ddd',
      fontSize: size > 50 ? '0.9rem' : '0.75rem',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontWeight: 'bold',
      textShadow: '1px 1px 2px #000',
      pointerEvents: 'auto',
      touchAction: 'none',
      userSelect: 'none',
    });
    btn.textContent = label;
    return btn;
  }
}

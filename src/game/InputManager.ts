const GAMEPAD_DEADZONE = 0.2;

export class InputManager {
  private keysDown = new Set<string>();
  private keysPressed = new Set<string>();
  private mouseDown = false;
  private mousePressed = false;
  private _mouseX = 0;
  private _mouseY = 0;

  // Gamepad state
  private gamepadIndex: number | null = null;
  private gamepadButtonsPressed = new Set<number>();
  private gamepadAxes = { lx: 0, ly: 0, rx: 0, ry: 0 };

  constructor() {
    window.addEventListener('keydown', (e) => {
      if (!this.keysDown.has(e.code)) {
        this.keysPressed.add(e.code);
      }
      this.keysDown.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        if (!this.mouseDown) this.mousePressed = true;
        this.mouseDown = true;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      this._mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this._mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    // Prevent keys getting stuck when window loses focus
    window.addEventListener('blur', () => {
      this.keysDown.clear();
      this.mouseDown = false;
    });

    // Gamepad connection
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = (e as GamepadEvent).gamepad.index;
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.gamepadIndex === (e as GamepadEvent).gamepad.index) {
        this.gamepadIndex = null;
      }
    });
  }

  /** Poll gamepad state - call once per frame before reading input */
  private pollGamepad(): void {
    if (this.gamepadIndex === null) return;

    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.gamepadIndex];
    if (!gp) return;

    // Axes: left stick (0,1), right stick (2,3)
    this.gamepadAxes.lx = Math.abs(gp.axes[0]) > GAMEPAD_DEADZONE ? gp.axes[0] : 0;
    this.gamepadAxes.ly = Math.abs(gp.axes[1]) > GAMEPAD_DEADZONE ? gp.axes[1] : 0;
    this.gamepadAxes.rx = Math.abs(gp.axes[2]) > GAMEPAD_DEADZONE ? gp.axes[2] : 0;
    this.gamepadAxes.ry = Math.abs(gp.axes[3]) > GAMEPAD_DEADZONE ? gp.axes[3] : 0;

    // Buttons - track pressed (first frame) vs held
    for (let i = 0; i < gp.buttons.length; i++) {
      const pressed = gp.buttons[i].pressed;
      if (pressed && !this.gamepadButtonsPressed.has(i)) {
        // Map gamepad buttons to key codes for unified handling
        const mapped = this.mapGamepadButton(i);
        if (mapped) {
          this.keysPressed.add(mapped);
          this.keysDown.add(mapped);

          // Dispatch synthetic keyboard event so DOM-based UI listeners
          // (MenuScreen, FloorSelectUI, etc.) also receive gamepad input
          const key = this.gamepadButtonToKey(i);
          if (key) {
            window.dispatchEvent(
              new KeyboardEvent('keydown', { key, code: mapped, bubbles: true }),
            );
          }
        }
      } else if (!pressed && this.gamepadButtonsPressed.has(i)) {
        const mapped = this.mapGamepadButton(i);
        if (mapped) {
          this.keysDown.delete(mapped);
        }
      }

      if (pressed) {
        this.gamepadButtonsPressed.add(i);
      } else {
        this.gamepadButtonsPressed.delete(i);
      }
    }

    // A button (0) or right trigger (7) = attack (treat like mouse click)
    if (gp.buttons[0]?.pressed || gp.buttons[7]?.pressed) {
      if (!this.mouseDown) this.mousePressed = true;
      this.mouseDown = true;
    } else if (!gp.buttons[0]?.pressed && !gp.buttons[7]?.pressed && this.gamepadIndex !== null) {
      // Only clear mouseDown from gamepad if no real mouse is held
      // This is imperfect but works for gamepad-only play
    }
  }

  /** Map gamepad button index to KeyboardEvent.key value (for synthetic events) */
  private gamepadButtonToKey(index: number): string | null {
    switch (index) {
      case 0: return ' ';            // A = space
      case 1: return 'e';            // B = interact
      case 2: return 'i';            // X = inventory
      case 3: return 'k';            // Y = skill tree
      case 4: return 'r';            // L1 = respawn
      case 5: return 'x';            // R1 = drop (inventory)
      case 8: return 'Escape';       // Select
      case 9: return 'Escape';       // Start
      case 12: return 'ArrowUp';     // D-pad up
      case 13: return 'ArrowDown';   // D-pad down
      case 14: return 'ArrowLeft';   // D-pad left
      case 15: return 'ArrowRight';  // D-pad right
      default: return null;
    }
  }

  /** Map standard gamepad buttons to key codes */
  private mapGamepadButton(index: number): string | null {
    switch (index) {
      case 0: return 'Space';         // A = attack
      case 1: return 'KeyE';          // B = interact
      case 2: return 'KeyI';          // X = inventory
      case 3: return 'KeyK';          // Y = skill tree
      case 4: return 'KeyR';          // L1 = respawn
      case 5: return 'KeyX';          // R1 = drop (inventory)
      case 8: return 'Escape';        // Select = cancel/close
      case 9: return 'Escape';        // Start = pause/cancel
      case 12: return 'ArrowUp';      // D-pad up
      case 13: return 'ArrowDown';    // D-pad down
      case 14: return 'ArrowLeft';    // D-pad left
      case 15: return 'ArrowRight';   // D-pad right
      default: return null;
    }
  }

  /** True while the key is held down */
  isDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  /** True only on the first frame the key is pressed */
  wasPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }

  /** True only on the first frame the mouse button is pressed */
  wasMousePressed(): boolean {
    return this.mousePressed;
  }

  /** Normalized mouse position (-1 to 1) */
  get mouseX(): number { return this._mouseX; }
  get mouseY(): number { return this._mouseY; }

  /** Whether a gamepad is connected */
  get hasGamepad(): boolean { return this.gamepadIndex !== null; }

  /** Call at the end of each frame to reset per-frame state */
  endFrame(): void {
    this.keysPressed.clear();
    this.mousePressed = false;
    // Poll gamepad for next frame
    this.pollGamepad();
  }

  /** Movement direction based on WASD/arrows/gamepad, normalized */
  getMovement(): { x: number; z: number } {
    let x = 0;
    let z = 0;

    if (this.isDown('KeyW') || this.isDown('ArrowUp')) z -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) z += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;

    // Add gamepad left stick
    if (this.gamepadAxes.lx !== 0 || this.gamepadAxes.ly !== 0) {
      x += this.gamepadAxes.lx;
      z += this.gamepadAxes.ly;
    }

    // Normalize diagonal movement
    const len = Math.sqrt(x * x + z * z);
    if (len > 1) {
      x /= len;
      z /= len;
    }

    return { x, z };
  }
}

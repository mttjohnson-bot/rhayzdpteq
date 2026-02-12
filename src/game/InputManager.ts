export class InputManager {
  private keysDown = new Set<string>();
  private keysPressed = new Set<string>();

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

    // Prevent keys getting stuck when window loses focus
    window.addEventListener('blur', () => {
      this.keysDown.clear();
    });
  }

  /** True while the key is held down */
  isDown(code: string): boolean {
    return this.keysDown.has(code);
  }

  /** True only on the first frame the key is pressed */
  wasPressed(code: string): boolean {
    return this.keysPressed.has(code);
  }

  /** Call at the end of each frame to reset per-frame state */
  endFrame(): void {
    this.keysPressed.clear();
  }

  /** Movement direction based on WASD/arrows, normalized */
  getMovement(): { x: number; z: number } {
    let x = 0;
    let z = 0;

    if (this.isDown('KeyW') || this.isDown('ArrowUp')) z -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown')) z += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft')) x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;

    // Normalize diagonal movement
    const len = Math.sqrt(x * x + z * z);
    if (len > 0) {
      x /= len;
      z /= len;
    }

    return { x, z };
  }
}

type Listener = (...args: unknown[]) => void;

export class EventBus {
  private listeners = new Map<string, Listener[]>();

  on(event: string, fn: Listener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(fn);
  }

  off(event: string, fn: Listener): void {
    const fns = this.listeners.get(event);
    if (!fns) return;
    const idx = fns.indexOf(fn);
    if (idx >= 0) fns.splice(idx, 1);
  }

  emit(event: string, ...args: unknown[]): void {
    const fns = this.listeners.get(event);
    if (!fns) return;
    for (const fn of fns) {
      fn(...args);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const events = new EventBus();

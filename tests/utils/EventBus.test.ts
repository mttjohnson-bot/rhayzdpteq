import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, events } from '../../src/utils/EventBus';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  describe('on / emit', () => {
    it('calls listener when event is emitted', () => {
      const listener = vi.fn();
      bus.on('test', listener);
      bus.emit('test');
      expect(listener).toHaveBeenCalledOnce();
    });

    it('passes arguments to listeners', () => {
      const listener = vi.fn();
      bus.on('test', listener);
      bus.emit('test', 'a', 42, true);
      expect(listener).toHaveBeenCalledWith('a', 42, true);
    });

    it('supports multiple listeners on the same event', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('test', listener1);
      bus.on('test', listener2);
      bus.emit('test');
      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
    });

    it('calls listeners in registration order', () => {
      const order: number[] = [];
      bus.on('test', () => order.push(1));
      bus.on('test', () => order.push(2));
      bus.on('test', () => order.push(3));
      bus.emit('test');
      expect(order).toEqual([1, 2, 3]);
    });

    it('does not call listeners for different events', () => {
      const listener = vi.fn();
      bus.on('eventA', listener);
      bus.emit('eventB');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('off', () => {
    it('removes a specific listener', () => {
      const listener = vi.fn();
      bus.on('test', listener);
      bus.off('test', listener);
      bus.emit('test');
      expect(listener).not.toHaveBeenCalled();
    });

    it('does not remove other listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('test', listener1);
      bus.on('test', listener2);
      bus.off('test', listener1);
      bus.emit('test');
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledOnce();
    });

    it('is safe to call off for non-existent event', () => {
      const listener = vi.fn();
      expect(() => bus.off('nonexistent', listener)).not.toThrow();
    });

    it('is safe to call off for non-registered listener', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('test', listener1);
      expect(() => bus.off('test', listener2)).not.toThrow();
      bus.emit('test');
      expect(listener1).toHaveBeenCalledOnce();
    });
  });

  describe('emit unknown event', () => {
    it('does not throw when emitting an event with no listeners', () => {
      expect(() => bus.emit('unknown')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('removes all listeners for all events', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      bus.on('eventA', listener1);
      bus.on('eventB', listener2);
      bus.clear();
      bus.emit('eventA');
      bus.emit('eventB');
      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('no duplicate calls', () => {
    it('does not call listener twice when registered once', () => {
      const listener = vi.fn();
      bus.on('test', listener);
      bus.emit('test');
      expect(listener).toHaveBeenCalledOnce();
    });
  });

  describe('singleton events export', () => {
    it('is an instance of EventBus', () => {
      expect(events).toBeInstanceOf(EventBus);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { clamp, lerp, lerpVector3 } from '../../src/utils/math';
import * as THREE from 'three';

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('clamps to min when value is below', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it('clamps to max when value is above', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('returns min when min equals max', () => {
    expect(clamp(5, 3, 3)).toBe(3);
  });

  it('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
    expect(clamp(0, -10, -1)).toBe(-1);
  });

  it('returns boundary when value equals boundary', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('handles zero range at zero', () => {
    expect(clamp(5, 0, 0)).toBe(0);
  });
});

describe('lerp', () => {
  it('returns a when t is 0', () => {
    expect(lerp(0, 10, 0)).toBe(0);
  });

  it('returns b when t is 1', () => {
    expect(lerp(0, 10, 1)).toBe(10);
  });

  it('returns midpoint when t is 0.5', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it('works with negative values', () => {
    expect(lerp(-10, 10, 0.5)).toBe(0);
    expect(lerp(-10, -5, 0.5)).toBe(-7.5);
  });

  it('extrapolates beyond 0-1 range', () => {
    expect(lerp(0, 10, 2)).toBe(20);
    expect(lerp(0, 10, -1)).toBe(-10);
  });

  it('returns a when a equals b regardless of t', () => {
    expect(lerp(5, 5, 0.5)).toBe(5);
  });
});

describe('lerpVector3', () => {
  it('interpolates each component', () => {
    const target = new THREE.Vector3(0, 0, 0);
    const goal = new THREE.Vector3(10, 20, 30);
    lerpVector3(target, goal, 0.5);
    expect(target.x).toBe(5);
    expect(target.y).toBe(10);
    expect(target.z).toBe(15);
  });

  it('does not move when t is 0', () => {
    const target = new THREE.Vector3(1, 2, 3);
    const goal = new THREE.Vector3(10, 20, 30);
    lerpVector3(target, goal, 0);
    expect(target.x).toBe(1);
    expect(target.y).toBe(2);
    expect(target.z).toBe(3);
  });

  it('reaches goal when t is 1', () => {
    const target = new THREE.Vector3(1, 2, 3);
    const goal = new THREE.Vector3(10, 20, 30);
    lerpVector3(target, goal, 1);
    expect(target.x).toBe(10);
    expect(target.y).toBe(20);
    expect(target.z).toBe(30);
  });

  it('mutates the target vector in place', () => {
    const target = new THREE.Vector3(0, 0, 0);
    const goal = new THREE.Vector3(10, 10, 10);
    const ref = target;
    lerpVector3(target, goal, 0.5);
    expect(ref).toBe(target);
    expect(ref.x).toBe(5);
  });

  it('does not mutate the goal vector', () => {
    const target = new THREE.Vector3(0, 0, 0);
    const goal = new THREE.Vector3(10, 20, 30);
    lerpVector3(target, goal, 0.5);
    expect(goal.x).toBe(10);
    expect(goal.y).toBe(20);
    expect(goal.z).toBe(30);
  });
});

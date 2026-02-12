import * as THREE from 'three';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVector3(target: THREE.Vector3, goal: THREE.Vector3, t: number): void {
  target.x = lerp(target.x, goal.x, t);
  target.y = lerp(target.y, goal.y, t);
  target.z = lerp(target.z, goal.z, t);
}

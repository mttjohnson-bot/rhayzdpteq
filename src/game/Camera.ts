import * as THREE from 'three';
import { CAMERA_DISTANCE, CAMERA_ANGLE, CAMERA_ROTATION } from '../utils/constants';
import { lerpVector3 } from '../utils/math';

export type CameraViewMode = 'third-person' | 'first-person';

/** Height of the first-person camera above the ground (player eye level) */
const FP_EYE_HEIGHT = 1.4;
/** How far ahead the first-person look-at point is projected */
const FP_LOOK_DISTANCE = 10;

export class GameCamera {
  readonly camera: THREE.PerspectiveCamera;
  private targetPosition = new THREE.Vector3();
  private offset = new THREE.Vector3();

  private mode: CameraViewMode = 'third-person';

  // Third-person isometric offset (calculated once)
  private tpOffset = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);

    // Calculate isometric offset from distance, elevation angle, and rotation
    const horizontalDist = CAMERA_DISTANCE * Math.cos(CAMERA_ANGLE);
    this.tpOffset.set(
      horizontalDist * Math.sin(CAMERA_ROTATION),
      CAMERA_DISTANCE * Math.sin(CAMERA_ANGLE),
      horizontalDist * Math.cos(CAMERA_ROTATION),
    );
    this.offset.copy(this.tpOffset);

    this.camera.position.copy(this.offset);
    this.camera.lookAt(0, 0, 0);
  }

  setMode(mode: CameraViewMode): void {
    this.mode = mode;
  }

  getMode(): CameraViewMode {
    return this.mode;
  }

  /** Smoothly follow a world position */
  follow(position: THREE.Vector3, dt: number, facingAngle?: number): void {
    if (this.mode === 'first-person' && facingAngle !== undefined) {
      // First-person: camera at player eye level, looking in facing direction
      this.targetPosition.set(position.x, FP_EYE_HEIGHT, position.z);
      const smoothing = 1 - Math.pow(0.0001, dt);
      lerpVector3(this.camera.position, this.targetPosition, smoothing);

      const lookX = position.x + Math.cos(facingAngle) * FP_LOOK_DISTANCE;
      const lookZ = position.z + Math.sin(facingAngle) * FP_LOOK_DISTANCE;
      this.camera.lookAt(lookX, FP_EYE_HEIGHT * 0.8, lookZ);
    } else {
      // Third-person isometric (default)
      this.targetPosition.copy(position).add(this.tpOffset);
      const smoothing = 1 - Math.pow(0.001, dt);
      lerpVector3(this.camera.position, this.targetPosition, smoothing);
      this.camera.lookAt(position);
    }
  }

  /** Snap immediately to a position (no smoothing) */
  snapTo(position: THREE.Vector3, facingAngle?: number): void {
    if (this.mode === 'first-person' && facingAngle !== undefined) {
      this.camera.position.set(position.x, FP_EYE_HEIGHT, position.z);
      const lookX = position.x + Math.cos(facingAngle) * FP_LOOK_DISTANCE;
      const lookZ = position.z + Math.sin(facingAngle) * FP_LOOK_DISTANCE;
      this.camera.lookAt(lookX, FP_EYE_HEIGHT * 0.8, lookZ);
    } else {
      this.camera.position.copy(position).add(this.tpOffset);
      this.camera.lookAt(position);
    }
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

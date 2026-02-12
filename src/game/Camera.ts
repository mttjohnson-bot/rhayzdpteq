import * as THREE from 'three';
import { CAMERA_DISTANCE, CAMERA_ANGLE, CAMERA_ROTATION } from '../utils/constants';
import { lerpVector3 } from '../utils/math';

export class GameCamera {
  readonly camera: THREE.PerspectiveCamera;
  private targetPosition = new THREE.Vector3();
  private offset = new THREE.Vector3();

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);

    // Calculate isometric offset from distance, elevation angle, and rotation
    const horizontalDist = CAMERA_DISTANCE * Math.cos(CAMERA_ANGLE);
    this.offset.set(
      horizontalDist * Math.sin(CAMERA_ROTATION),
      CAMERA_DISTANCE * Math.sin(CAMERA_ANGLE),
      horizontalDist * Math.cos(CAMERA_ROTATION),
    );

    this.camera.position.copy(this.offset);
    this.camera.lookAt(0, 0, 0);
  }

  /** Smoothly follow a world position */
  follow(position: THREE.Vector3, dt: number): void {
    this.targetPosition.copy(position).add(this.offset);
    const smoothing = 1 - Math.pow(0.001, dt);
    lerpVector3(this.camera.position, this.targetPosition, smoothing);
    this.camera.lookAt(position);
  }

  /** Snap immediately to a position (no smoothing) */
  snapTo(position: THREE.Vector3): void {
    this.camera.position.copy(position).add(this.offset);
    this.camera.lookAt(position);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}

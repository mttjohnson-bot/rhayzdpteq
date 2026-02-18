/**
 * Training dummy — an attackable target in the Asset Library that shows damage
 * numbers without actually taking any damage. Lets the player test weapon
 * animations, attack speed, attack range, AoE coverage, and overall damage
 * output with different equipment loadouts.
 */

import * as THREE from 'three';
import { events } from '../utils/EventBus';

const DUMMY_WOOD = 0x8b6914;
const DUMMY_WOOD_DARK = 0x6a5010;
const DUMMY_BASE = 0x5a4a3a;
const DUMMY_TARGET = 0xcc3333;
const DUMMY_HEIGHT = 1.4;

export const TEST_DUMMY_COLLISION_RADIUS = 0.35;

export class TestDummy {
  readonly mesh: THREE.Group;
  readonly position: THREE.Vector3;
  readonly collisionRadius = TEST_DUMMY_COLLISION_RADIUS;
  readonly alive = true; // always alive — never dies

  private postMaterial: THREE.MeshLambertMaterial;
  private hitFlashTimer = 0;

  constructor(x: number, z: number) {
    this.mesh = new THREE.Group();
    this.mesh.position.set(x, 0, z);
    this.position = this.mesh.position;

    // --- Base stand ---
    const baseGeo = new THREE.CylinderGeometry(0.32, 0.38, 0.14, 8);
    const baseMat = new THREE.MeshLambertMaterial({ color: DUMMY_BASE });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.07;
    base.castShadow = true;
    this.mesh.add(base);

    // --- Vertical post ---
    const postGeo = new THREE.BoxGeometry(0.14, DUMMY_HEIGHT, 0.14);
    this.postMaterial = new THREE.MeshLambertMaterial({ color: DUMMY_WOOD });
    const post = new THREE.Mesh(postGeo, this.postMaterial);
    post.position.y = DUMMY_HEIGHT / 2 + 0.14;
    post.castShadow = true;
    this.mesh.add(post);

    // --- Horizontal cross-arm ---
    const armGeo = new THREE.BoxGeometry(0.75, 0.11, 0.11);
    const armMat = new THREE.MeshLambertMaterial({ color: DUMMY_WOOD_DARK });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.y = DUMMY_HEIGHT * 0.72 + 0.14;
    arm.castShadow = true;
    this.mesh.add(arm);

    // --- Head block ---
    const headGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const headMat = new THREE.MeshLambertMaterial({ color: DUMMY_WOOD });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = DUMMY_HEIGHT + 0.2;
    head.castShadow = true;
    this.mesh.add(head);

    // --- Target ring on torso (front face) ---
    const ringGeo = new THREE.RingGeometry(0.07, 0.14, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: DUMMY_TARGET, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, DUMMY_HEIGHT * 0.5 + 0.14, 0.08);
    this.mesh.add(ring);
  }

  /**
   * Called when hit by the player's attack. The dummy absorbs the hit without
   * losing HP, but emits a damage event so floating numbers appear.
   */
  takeDamage(amount: number): void {
    events.emit('enemyDamaged', this.position.x, this.position.z, amount);
    this.hitFlashTimer = 0.1;
  }

  update(dt: number): void {
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
      this.postMaterial.color.setHex(0xffffff);
    } else {
      this.postMaterial.color.setHex(DUMMY_WOOD);
    }
  }
}

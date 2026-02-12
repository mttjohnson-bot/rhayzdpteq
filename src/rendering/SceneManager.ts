import * as THREE from 'three';
import { COLORS } from '../utils/constants';

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 20, 40);

    this.setupLighting();

    window.addEventListener('resize', () => this.onResize());
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(COLORS.ambient, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(COLORS.directional, 0.8);
    directional.position.set(8, 12, 8);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 1024;
    directional.shadow.mapSize.height = 1024;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far = 40;
    directional.shadow.camera.left = -15;
    directional.shadow.camera.right = 15;
    directional.shadow.camera.top = 15;
    directional.shadow.camera.bottom = -15;
    this.scene.add(directional);
  }

  render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  private onResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /** Remove all objects from the scene except lights */
  clearScene(): void {
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        toRemove.push(child);
      }
    });
    for (const obj of toRemove) {
      obj.removeFromParent();
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }
  }

  /** Add a group of objects to the scene */
  addGroup(group: THREE.Group): void {
    this.scene.add(group);
  }

  /** Remove a group from the scene and dispose its geometry */
  removeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.scene.remove(group);
  }
}

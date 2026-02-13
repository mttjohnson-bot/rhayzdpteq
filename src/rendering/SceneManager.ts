import * as THREE from 'three';
import { COLORS } from '../utils/constants';
import { FloorTheme } from '../dungeon/FloorConfig';

export class SceneManager {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;

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

    this.ambientLight = new THREE.AmbientLight(COLORS.ambient, 0.6);
    this.directionalLight = new THREE.DirectionalLight(COLORS.directional, 0.8);
    this.setupLighting();

    window.addEventListener('resize', () => this.onResize());
  }

  private setupLighting(): void {
    this.scene.add(this.ambientLight);

    this.directionalLight.position.set(8, 12, 8);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 40;
    this.directionalLight.shadow.camera.left = -15;
    this.directionalLight.shadow.camera.right = 15;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.scene.add(this.directionalLight);
  }

  /** Apply floor-specific lighting and fog theme */
  applyFloorTheme(theme: FloorTheme): void {
    this.scene.background = new THREE.Color(theme.fogColor);
    this.scene.fog = new THREE.Fog(theme.fogColor, 18, 38);
    this.ambientLight.color.setHex(theme.ambientColor);
    this.directionalLight.color.setHex(theme.lightColor);
    this.directionalLight.intensity = theme.lightIntensity;
  }

  /** Reset to default hub lighting */
  resetLighting(): void {
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 20, 40);
    this.ambientLight.color.setHex(COLORS.ambient);
    this.ambientLight.intensity = 0.6;
    this.directionalLight.color.setHex(COLORS.directional);
    this.directionalLight.intensity = 0.8;
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

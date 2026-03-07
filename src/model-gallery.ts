/**
 * Model Gallery — standalone page for previewing character models side-by-side.
 * Renders the "Simple" box model and the "Owl" voxel model in split viewports.
 */

import * as THREE from 'three';
import { PLAYER_SIZE, PLAYER_HEIGHT } from './utils/constants';

// ── Scene setup ──

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setScissorTest(true);
renderer.shadowMap.enabled = true;

// ── Shared helpers ──

function createScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambient);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(3, 5, 3);
  dir.castShadow = true;
  scene.add(dir);

  // Grid floor
  const grid = new THREE.GridHelper(4, 8, 0x444466, 0x333355);
  scene.add(grid);

  // Ground plane to receive shadows
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 4),
    new THREE.ShadowMaterial({ opacity: 0.3 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;
  scene.add(ground);

  return scene;
}

function createCamera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  cam.position.set(2, 2.5, 3);
  cam.lookAt(0, 0.5, 0);
  return cam;
}

// ── Left scene: Simple model ──

const sceneLeft = createScene();
const camLeft = createCamera();

const simpleGeo = new THREE.BoxGeometry(PLAYER_SIZE, PLAYER_HEIGHT, PLAYER_SIZE);
const simpleMat = new THREE.MeshLambertMaterial({ color: 0x3498db });
const simpleMesh = new THREE.Mesh(simpleGeo, simpleMat);
simpleMesh.position.y = PLAYER_HEIGHT / 2;
simpleMesh.castShadow = true;
sceneLeft.add(simpleMesh);

const statusSimple = document.getElementById('status-simple')!;
statusSimple.textContent = 'Loaded';
statusSimple.className = 'status loaded';

// ── Right scene: Owl model ──

const sceneRight = createScene();
const camRight = createCamera();

const statusOwl = document.getElementById('status-owl')!;

/** Resolved base path for static assets (handles Vite base config). */
function assetBase(): string {
  return import.meta.env.BASE_URL ?? '/';
}

async function loadOwl(): Promise<void> {
  const base = assetBase();
  const glbUrl = base + 'assets/characters/owl.glb';

  try {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    const glbResponse = await fetch(glbUrl);

    if (!glbResponse.ok) {
      console.error(
        `[ModelGallery] .glb not found at ${glbUrl} (HTTP ${glbResponse.status}).`,
        `Run ./scripts/convert-models.mjs or trigger the CI conversion workflow.`,
      );
      statusOwl.textContent = `Failed: .glb not found (HTTP ${glbResponse.status})`;
      statusOwl.className = 'status failed';
      return;
    }

    const buffer = await glbResponse.arrayBuffer();
    const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
      loader.parse(buffer, '', resolve, reject);
    });
    const group = gltf.scene;
    console.log(`[ModelGallery] Loaded owl from .glb (optimized format)`);

    // Scale to match player dimensions
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = Math.max(PLAYER_SIZE, PLAYER_HEIGHT);
    const scale = targetSize / maxDim;
    group.scale.setScalar(scale);

    // Re-center after scaling
    const scaledBox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    scaledBox.getCenter(center);
    group.position.sub(center);
    group.position.y += scaledBox.getSize(new THREE.Vector3()).y / 2;

    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
      }
    });

    sceneRight.add(group);
    statusOwl.textContent = 'Loaded (.glb)';
    statusOwl.className = 'status loaded';
  } catch (err) {
    console.error(`[ModelGallery] Error loading .glb:`, err);
    statusOwl.textContent = `Failed: ${err instanceof Error ? err.message : String(err)}`;
    statusOwl.className = 'status failed';
  }
}

loadOwl();

// ── Orbit interaction ──

interface OrbitState {
  azimuth: number;
  elevation: number;
  distance: number;
  dragging: boolean;
  lastX: number;
  lastY: number;
}

const orbitLeft: OrbitState = {
  azimuth: 0.8,
  elevation: 0.6,
  distance: 4,
  dragging: false,
  lastX: 0,
  lastY: 0,
};
const orbitRight: OrbitState = { ...orbitLeft };

function updateCamera(cam: THREE.PerspectiveCamera, orbit: OrbitState): void {
  const x = orbit.distance * Math.sin(orbit.azimuth) * Math.cos(orbit.elevation);
  const y = orbit.distance * Math.sin(orbit.elevation);
  const z = orbit.distance * Math.cos(orbit.azimuth) * Math.cos(orbit.elevation);
  cam.position.set(x, y + 0.5, z);
  cam.lookAt(0, 0.5, 0);
}

function getOrbitForX(x: number): { orbit: OrbitState; cam: THREE.PerspectiveCamera } | null {
  const half = window.innerWidth / 2;
  if (x < half) return { orbit: orbitLeft, cam: camLeft };
  return { orbit: orbitRight, cam: camRight };
}

canvas.addEventListener('pointerdown', (e) => {
  const target = getOrbitForX(e.clientX);
  if (!target) return;
  target.orbit.dragging = true;
  target.orbit.lastX = e.clientX;
  target.orbit.lastY = e.clientY;
});

canvas.addEventListener('pointermove', (e) => {
  for (const { orbit, cam } of [
    { orbit: orbitLeft, cam: camLeft },
    { orbit: orbitRight, cam: camRight },
  ]) {
    if (!orbit.dragging) continue;
    const dx = e.clientX - orbit.lastX;
    const dy = e.clientY - orbit.lastY;
    orbit.azimuth -= dx * 0.01;
    orbit.elevation = Math.max(0.1, Math.min(1.4, orbit.elevation + dy * 0.01));
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    updateCamera(cam, orbit);
  }
});

canvas.addEventListener('pointerup', () => {
  orbitLeft.dragging = false;
  orbitRight.dragging = false;
});

canvas.addEventListener('wheel', (e) => {
  const target = getOrbitForX(e.clientX);
  if (!target) return;
  target.orbit.distance = Math.max(1.5, Math.min(10, target.orbit.distance + e.deltaY * 0.005));
  updateCamera(target.cam, target.orbit);
  e.preventDefault();
});

// ── Render loop ──

function animate(): void {
  requestAnimationFrame(animate);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const halfW = Math.floor(w / 2);

  // Auto-rotate when not dragging
  if (!orbitLeft.dragging) {
    orbitLeft.azimuth += 0.005;
    updateCamera(camLeft, orbitLeft);
  }
  if (!orbitRight.dragging) {
    orbitRight.azimuth += 0.005;
    updateCamera(camRight, orbitRight);
  }

  // Left viewport: Simple model
  camLeft.aspect = halfW / h;
  camLeft.updateProjectionMatrix();
  renderer.setViewport(0, 0, halfW, h);
  renderer.setScissor(0, 0, halfW, h);
  renderer.render(sceneLeft, camLeft);

  // Right viewport: Owl model
  camRight.aspect = (w - halfW) / h;
  camRight.updateProjectionMatrix();
  renderer.setViewport(halfW, 0, w - halfW, h);
  renderer.setScissor(halfW, 0, w - halfW, h);
  renderer.render(sceneRight, camRight);
}

// Handle resize
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
});

updateCamera(camLeft, orbitLeft);
updateCamera(camRight, orbitRight);
animate();

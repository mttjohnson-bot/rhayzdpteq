import * as THREE from 'three';

const OUTLINE_SCALE = 1.15;
const OUTLINE_OPACITY = 0.35;
/** Stencil reference value used to mark character pixels. */
const STENCIL_REF = 1;

/**
 * Creates a silhouette mesh that only renders when occluded by geometry
 * closer to the camera (e.g., walls). Uses GreaterDepth test so the
 * mesh is invisible when nothing is in front, but shows a colored
 * outline when a wall hides the character.
 */
export function createOcclusionSilhouette(
  width: number,
  height: number,
  depth: number,
  color: number,
  yOffset: number = 0,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(
    width * OUTLINE_SCALE,
    height * OUTLINE_SCALE,
    depth * OUTLINE_SCALE,
  );
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: OUTLINE_OPACITY,
    depthTest: true,
    depthWrite: false,
    depthFunc: THREE.GreaterDepth,
    stencilWrite: false,
    stencilRef: STENCIL_REF,
    stencilFunc: THREE.NotEqualStencilFunc,
    stencilFuncMask: 0xff,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 10;
  mesh.position.y = yOffset;
  return mesh;
}

/**
 * Enables stencil-write on a mesh material so it marks its pixels in the
 * stencil buffer. The occlusion silhouette uses NotEqualStencilFunc to
 * skip these pixels, preventing the character's own geometry from
 * triggering its silhouette.
 */
export function enableStencilWrite(material: THREE.Material): void {
  material.stencilWrite = true;
  material.stencilRef = STENCIL_REF;
  material.stencilFunc = THREE.AlwaysStencilFunc;
  material.stencilZPass = THREE.ReplaceStencilOp;
}

/**
 * Traverses a Three.js object and enables stencil-write on all mesh
 * materials found. Use this on loaded GLB model groups.
 */
export function enableStencilWriteOnGroup(group: THREE.Object3D): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m: THREE.Material) => enableStencilWrite(m));
      } else {
        enableStencilWrite(child.material);
      }
    }
  });
}

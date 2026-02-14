import * as THREE from 'three';

const OUTLINE_SCALE = 1.15;
const OUTLINE_OPACITY = 0.35;

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
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 10;
  mesh.position.y = yOffset;
  return mesh;
}

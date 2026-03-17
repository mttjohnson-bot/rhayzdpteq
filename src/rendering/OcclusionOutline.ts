import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

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

/**
 * Creates an occlusion silhouette that matches the actual shape of a loaded
 * GLB model group. Traverses the group, collects all mesh geometries with
 * their world transforms, merges them, and scales slightly to create an
 * outline effect. Falls back to a bounding-box silhouette if merging fails.
 */
export function createOcclusionSilhouetteFromModel(
  modelGroup: THREE.Group,
  color: number,
): THREE.Mesh | null {
  const geometries: THREE.BufferGeometry[] = [];

  // Ensure world matrices are up to date
  modelGroup.updateMatrixWorld(true);

  modelGroup.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const cloned = child.geometry.clone();
      // Apply the mesh's world transform so the merged geometry is in
      // the model group's local space
      cloned.applyMatrix4(child.matrixWorld);
      geometries.push(cloned);
    }
  });

  if (geometries.length === 0) return null;

  let merged: THREE.BufferGeometry;
  try {
    merged = mergeGeometries(geometries, false);
  } catch {
    // If merge fails (e.g. incompatible attributes), fall back to box
    for (const g of geometries) g.dispose();
    return null;
  }

  // Clean up cloned geometries
  for (const g of geometries) g.dispose();

  // Undo the model group's own world transform so the merged geometry
  // sits at the group's local origin
  const inverseParent = new THREE.Matrix4().copy(modelGroup.matrixWorld).invert();
  merged.applyMatrix4(inverseParent);

  // Scale outward from center for the outline effect
  merged.computeBoundingBox();
  const center = new THREE.Vector3();
  merged.boundingBox!.getCenter(center);
  merged.translate(-center.x, -center.y, -center.z);
  merged.scale(OUTLINE_SCALE, OUTLINE_SCALE, OUTLINE_SCALE);
  merged.translate(center.x, center.y, center.z);

  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: OUTLINE_OPACITY,
    depthTest: true,
    depthWrite: false,
    depthFunc: THREE.GreaterDepth,
  });

  const mesh = new THREE.Mesh(merged, mat);
  mesh.renderOrder = 10;
  return mesh;
}

/**
 * Loads and caches character .glb models for use as player meshes.
 * Falls back to loading .vox files directly when .glb is not available.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadVoxModel } from './VoxLoader';

export type CharacterModelId = 'simple' | 'owl';

/** Resolved base path for static assets (handles Vite base config). */
function assetBase(): string {
  return import.meta.env.BASE_URL ?? '/';
}

const MODEL_PATHS: Record<Exclude<CharacterModelId, 'simple'>, { glb: string; vox: string }> = {
  owl: {
    glb: 'assets/characters/owl.glb',
    vox: 'assets/characters/owl.vox',
  },
};

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

/**
 * Try loading a .glb file. Returns the scene group or null on failure.
 */
function loadGlb(url: string): Promise<THREE.Group | null> {
  return new Promise<THREE.Group | null>((resolve) => {
    loader.load(
      url,
      (gltf) => {
        const scene = gltf.scene;
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
          }
        });
        resolve(scene);
      },
      undefined,
      () => resolve(null),
    );
  });
}

/**
 * Load a character model by ID.
 * Returns a *clone* of the cached scene graph so each caller gets its own instance.
 * Returns `null` for the built-in 'simple' model (caller uses default box).
 *
 * Tries .glb first, then falls back to parsing .vox directly.
 */
export async function loadCharacterModel(id: CharacterModelId): Promise<THREE.Group | null> {
  if (id === 'simple') return null;

  const paths = MODEL_PATHS[id];
  const base = assetBase();
  const cacheKey = id;

  // Return cloned cached model
  const cached = cache.get(cacheKey);
  if (cached) return cached.clone();

  // Try .glb first
  const glbUrl = base + paths.glb;
  let group = await loadGlb(glbUrl);

  // Fall back to .vox
  if (!group) {
    const voxUrl = base + paths.vox;
    try {
      group = await loadVoxModel(voxUrl);
    } catch (err) {
      console.warn(`Failed to load character model "${id}" from ${voxUrl}:`, err);
      return null;
    }
  }

  cache.set(cacheKey, group);
  return group.clone();
}

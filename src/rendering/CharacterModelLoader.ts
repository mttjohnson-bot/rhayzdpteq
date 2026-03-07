/**
 * Loads and caches character .glb models for use as player meshes.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type CharacterModelId = 'simple' | 'owl';

/** Resolved base path for static assets (handles Vite base config). */
function assetBase(): string {
  return import.meta.env.BASE_URL ?? '/';
}

const MODEL_PATHS: Record<Exclude<CharacterModelId, 'simple'>, string> = {
  owl: 'assets/characters/owl.glb',
};

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

/**
 * Load a character model by ID.
 * Returns a *clone* of the cached scene graph so each caller gets its own instance.
 * Returns `null` for the built-in 'simple' model (caller uses default box).
 */
export async function loadCharacterModel(id: CharacterModelId): Promise<THREE.Group | null> {
  if (id === 'simple') return null;

  const relPath = MODEL_PATHS[id];
  const url = assetBase() + relPath;

  // Return cloned cached model
  const cached = cache.get(url);
  if (cached) return cached.clone();

  return new Promise<THREE.Group | null>((resolve) => {
    loader.load(
      url,
      (gltf) => {
        const scene = gltf.scene;
        // Ensure shadows
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
          }
        });
        cache.set(url, scene);
        resolve(scene.clone());
      },
      undefined,
      (err) => {
        console.warn(`Failed to load character model "${id}" from ${url}:`, err);
        resolve(null);
      },
    );
  });
}

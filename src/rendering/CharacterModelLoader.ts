/**
 * Loads and caches character .glb models for use as player meshes.
 *
 * IMPORTANT — Asset Pipeline:
 *   Models are optimized .glb files generated from .vox sources by the CI
 *   model conversion pipeline (scripts/convert-models.sh). The GLTFLoader
 *   is the ONLY loader used. There is no runtime .vox fallback.
 *
 *   If a .glb file is missing, the correct fix is to run the conversion
 *   pipeline — not to add a fallback loader.
 *   See CLAUDE.md "Asset Pipeline" section for details.
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
 * Load a .glb file. Returns the scene group or null on failure.
 * Logs detailed error information when loading fails.
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
        console.log(`[CharacterModelLoader] Loaded .glb model from ${url}`);
        resolve(scene);
      },
      undefined,
      (error) => {
        console.error(
          `[CharacterModelLoader] Failed to load .glb model from ${url}.`,
          `This means the model conversion pipeline has not been run.`,
          `Run: ./scripts/convert-models.sh`,
          `Or trigger the "Convert Character Models" GitHub Actions workflow.`,
          error,
        );
        resolve(null);
      },
    );
  });
}

/**
 * Load a character model by ID.
 * Returns a *clone* of the cached scene graph so each caller gets its own instance.
 * Returns `null` for the built-in 'simple' model (caller uses default box).
 */
export async function loadCharacterModel(id: CharacterModelId): Promise<THREE.Group | null> {
  if (id === 'simple') return null;

  const glbPath = MODEL_PATHS[id];
  const base = assetBase();

  // Return cloned cached model
  const cached = cache.get(id);
  if (cached) return cached.clone();

  const glbUrl = base + glbPath;
  const group = await loadGlb(glbUrl);

  if (!group) {
    console.error(
      `[CharacterModelLoader] Model "${id}" not found at ${glbUrl}.`,
      `The model conversion pipeline may not have run.`,
      `Check the deploy workflow or run: ./scripts/convert-models.sh`,
    );
    return null;
  }

  cache.set(id, group);
  return group.clone();
}

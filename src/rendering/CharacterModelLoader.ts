/**
 * Loads and caches character .glb models for use as player meshes.
 *
 * IMPORTANT — Asset Pipeline:
 *   Models are optimized .glb files generated from .vox sources by the CI
 *   model conversion pipeline (scripts/convert-models.mjs). The GLTFLoader
 *   is the ONLY loader used. There is no runtime .vox fallback.
 *
 *   If a .glb file is missing, the correct fix is to run the conversion
 *   pipeline — not to add a fallback loader.
 *   See CLAUDE.md "Asset Pipeline" section for details.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { EnemyTypeId } from '../utils/constants';

export type CharacterModelId = 'simple' | 'owl' | 'owlbear';

/** Model IDs for enemy mobs — matches filenames in assets/characters/ */
export type EnemyModelId = EnemyTypeId; // 'grunt' | 'brute' | 'archer' | 'mage' | 'assassin'

/** Model IDs for bosses — derived from boss name by lowercasing and stripping spaces */
export type BossModelId =
  | 'cryptguardian'
  | 'fungalbrute'
  | 'forgetitan'
  | 'frostwyrm'
  | 'shadowlord'
  | 'sewerabomination'
  | 'infernodemon'
  | 'crystalgolem'
  | 'bloodtyrant'
  | 'abyssaloverlord';

/** Resolved base path for static assets (handles Vite base config). */
function assetBase(): string {
  return import.meta.env.BASE_URL ?? '/';
}

const MODEL_PATHS: Record<Exclude<CharacterModelId, 'simple'>, string> = {
  owl: 'assets/characters/owl.glb',
  owlbear: 'assets/characters/owlbear.glb',
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
          `Run: ./scripts/convert-models.mjs`,
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
      `Check the deploy workflow or run: ./scripts/convert-models.mjs`,
    );
    return null;
  }

  cache.set(id, group);
  return group.clone();
}

/**
 * Derive a boss model ID from a BossConfig name.
 * E.g. "Crypt Guardian" → "cryptguardian", "Abyssal Overlord" → "abyssaloverlord"
 */
export function bossNameToModelId(bossName: string): BossModelId {
  return bossName.toLowerCase().replace(/\s+/g, '') as BossModelId;
}

/**
 * Load an enemy mob GLB model by type ID.
 * Returns a clone of the cached scene graph, or null on failure.
 */
export async function loadEnemyModel(typeId: EnemyModelId): Promise<THREE.Group | null> {
  const cacheKey = `enemy_${typeId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached.clone();

  const base = assetBase();
  const url = `${base}assets/characters/${typeId}.glb`;
  const group = await loadGlb(url);

  if (!group) {
    console.error(
      `[CharacterModelLoader] Enemy model "${typeId}" not found at ${url}.`,
      `Run: ./scripts/convert-models.mjs`,
    );
    return null;
  }

  cache.set(cacheKey, group);
  return group.clone();
}

/**
 * Load a boss GLB model by boss name or model ID.
 * Returns a clone of the cached scene graph, or null on failure.
 */
export async function loadBossModel(bossName: string): Promise<THREE.Group | null> {
  const modelId = bossNameToModelId(bossName);
  const cacheKey = `boss_${modelId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached.clone();

  const base = assetBase();
  const url = `${base}assets/characters/${modelId}.glb`;
  const group = await loadGlb(url);

  if (!group) {
    console.error(
      `[CharacterModelLoader] Boss model "${modelId}" not found at ${url}.`,
      `Run: ./scripts/convert-models.mjs`,
    );
    return null;
  }

  cache.set(cacheKey, group);
  return group.clone();
}

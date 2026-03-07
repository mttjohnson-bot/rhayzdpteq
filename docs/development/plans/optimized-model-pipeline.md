# Optimized Model Pipeline — v-optimizer + gltfpack

**Status:** Ready to Build
**Created:** 2026-03-07

## Background

The game uses a `.vox` → `.glb` conversion pipeline to prepare character models for Three.js. The current implementation (`scripts/convert-models.mjs`) uses `@gltf-transform/core` to:

1. Parse MagicaVoxel `.vox` binary format
2. Build mesh geometry with neighbor-based face culling and vertex colors
3. Write `.glb` output

This works correctly and produces valid GLB files, but it does **not** apply the advanced mesh optimizations that dedicated tools provide.

## Why Optimize Further

The current naive approach generates one quad per exposed voxel face. For a model with 1000 voxels, this can mean thousands of vertices and indices. Dedicated tools can dramatically reduce this:

### v-optimizer (Greedy Voxel Meshing)

[VOptimizer/VoxelOptimizer](https://github.com/VOptimizer/VoxelOptimizer) — [itch.io page](https://vailor1.itch.io/v-optimizer)

- **Greedy meshing** merges adjacent same-color faces into larger quads
- Reduces vertex count by 50-90% depending on model complexity
- Fewer draw calls and less GPU memory usage
- Supports multiple meshing algorithms (simple, greedy, greedy textured)
- Open source (MIT), built in Godot

**Challenge:** As of 2026-03-07, the GitHub repo has no pre-built CLI release binaries. Options:
1. Build from source in CI (Godot export)
2. Download from itch.io releases (may require manual URL management)
3. Use the VCore library directly if it has a standalone CLI
4. Implement greedy meshing in the Node.js script directly (removes external dependency)

### gltfpack (meshoptimizer)

[zeux/meshoptimizer](https://github.com/zeux/meshoptimizer) — [Releases](https://github.com/zeux/meshoptimizer/releases)

- Vertex cache optimization (reorders triangles for GPU efficiency)
- Overdraw reduction
- Vertex quantization (smaller file size)
- Mesh simplification
- Available as both native binary and npm package (`npm i gltfpack`)

**This tool has working release binaries** and an npm package. It's straightforward to integrate.

## Proposed Approach

### Phase 1: Add gltfpack post-processing (low effort, high impact)

Since `gltfpack` is available via npm, add it as a post-processing step after the current `@gltf-transform/core` conversion:

```
.vox → convert-models.mjs (current) → raw.glb → gltfpack → optimized.glb
```

Or use the npm package programmatically within `convert-models.mjs`.

### Phase 2: Implement greedy meshing in Node.js (medium effort, high impact)

Rather than depending on `v-optimizer` (which lacks CLI binaries), implement the greedy meshing algorithm directly in `convert-models.mjs`. The algorithm is well-documented:

1. For each axis direction, build a 2D slice of exposed faces
2. Greedily merge adjacent same-color faces into larger rectangles
3. Emit one quad per merged rectangle instead of one per voxel face

This eliminates the external dependency while achieving similar optimization.

### Phase 3: Benchmark and validate (required before merging)

- Compare file sizes: current vs gltfpack vs greedy+gltfpack
- Compare vertex/face counts
- Compare load times in browser
- Compare FPS impact on Chromebook-class hardware
- Ensure visual fidelity is maintained (no visible artifacts)

## Implementation Notes

- The conversion script must remain a pure Node.js script (no external binary downloads in CI)
- `@gltf-transform/core` stays as the GLB writer regardless of mesh optimization approach
- The script's MD5-based skip logic already handles caching
- All three verification layers (verify-assets, verify-build-assets, post-deploy smoke test) work regardless of optimization approach

## Success Criteria

- GLB file sizes reduced by at least 30% compared to current output
- Vertex count reduced by at least 50%
- No visible quality degradation
- Conversion still runs in under 10 seconds in CI
- No external tool downloads required (everything via npm or implemented in-script)

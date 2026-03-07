# Architecture Overview

This document describes the technical architecture of Rhayzd Pteq for developers and AI agents working on the codebase. For the game design document with milestones and design decisions, see [GAME_PLAN.md](../../GAME_PLAN.md).

---

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript (strict mode) | Type safety, IDE support, excellent Three.js typings |
| 3D Engine | Three.js | Most popular browser 3D lib, huge community, lightweight |
| Bundler | Vite | Fast HMR, simple config, easy GitHub Pages deploy |
| Art Style | Voxel-based | Performant, procedurally friendly, distinctive look |
| Testing | Vitest (unit) + Playwright (E2E) | Native Vite integration; real-browser testing |
| Linting | ESLint v9 + Prettier | Flat config, TypeScript-first, auto-formatting |
| Hosting | GitHub Pages | Free, integrates with repo, static site friendly |

---

## Project Structure

```
src/
├── main.ts                      # App entry point; error overlay; game startup
├── game/                        # Core game loop, player, camera, input, saves
│   ├── Game.ts                  # Main game loop, state machine
│   ├── Player.ts                # Player entity, movement, attacks
│   ├── Camera.ts                # Isometric camera controller
│   ├── Hub.ts                   # Hub scene setup, floor selection
│   ├── ActionManager.ts         # Action-based input API
│   ├── InputAction.ts           # Action type definitions & mappings
│   ├── SaveManager.ts           # localStorage-based persistence (4 slots)
│   ├── AssetLibrary.ts          # Visual asset inspection room
│   └── providers/               # Input device abstraction layer
│       ├── InputProvider.ts     # Provider interface
│       ├── KeyboardProvider.ts  # Keyboard input
│       ├── MouseProvider.ts     # Mouse input
│       ├── GamepadProvider.ts   # Gamepad/controller input
│       └── TouchProvider.ts     # Touch input with virtual joystick
├── combat/                      # Combat system, enemies, bosses
│   ├── CombatSystem.ts          # Hit detection, damage calculation
│   ├── Enemy.ts                 # Base enemy class with AI (patrol/chase/attack)
│   ├── Boss.ts                  # Boss entities with special abilities
│   └── TestDummy.ts             # Non-hostile training dummies
├── dungeon/                     # Procedural generation, rooms, floors, tiles
│   ├── DungeonGenerator.ts      # Procedural room & corridor generation
│   ├── FloorConfig.ts           # 10 floor definitions with difficulty scaling
│   ├── FloorRenderer.ts         # InstancedMesh voxel rendering
│   ├── ObstacleSystem.ts        # Environmental hazards (mud, water, fire, traps)
│   └── types.ts                 # TileType, ObstacleType enums
├── rpg/                         # Skill tree, inventory, loot, stats
│   ├── Stats.ts                 # Character stats & modifiers
│   ├── Leveling.ts              # XP system & level progression
│   ├── SkillTree.ts             # 3-branch skill tree with ranking
│   ├── Inventory.ts             # Equipment slots & bag system
│   ├── LootTable.ts             # Random drop generation
│   └── LootDrop.ts              # World drop meshes
├── ui/                          # HUD, menus, overlays
│   ├── MenuScreen.ts            # Title screen with save slot selection
│   ├── HUD.ts                   # Health bar, floor indicator, minimap, device info
│   ├── HealthBar.ts             # Player health display
│   ├── BossHealthBar.ts         # Boss health indicator
│   ├── XPBar.ts                 # Experience/leveling bar
│   ├── Minimap.ts               # Explored area visualization
│   ├── DamageNumbers.ts         # Floating damage text
│   ├── InventoryUI.ts           # Equipment & bag management
│   ├── SkillTreeUI.ts           # Skill allocation interface
│   ├── FloorSelectUI.ts         # Dungeon floor selection
│   ├── LibraryAssetDialog.ts    # Asset inspection dialog
│   ├── ConfirmDialog.ts         # Drop confirmation overlay
│   ├── ItemActionDialog.ts      # Touch-friendly item action menu
│   ├── TouchControls.ts         # Virtual joystick & action buttons
│   ├── InstructionsPanel.ts     # Control hints overlay (device-adaptive)
│   ├── InputHints.ts            # Centralized device-specific hint text
│   ├── SettingsUI.ts            # Settings panel (camera, controller, character model, diagnostics)
│   ├── DiagnosticsOverlay.ts    # Real-time FPS & draw call counter
│   └── VaultUI.ts               # Vault storage transfer interface
├── rendering/                   # Voxel renderer, scene management, lighting
│   ├── SceneManager.ts          # Three.js scene setup & management
│   ├── OcclusionOutline.ts      # Character silhouettes behind walls
│   └── CharacterModelLoader.ts  # Async GLB model loading with caching (GLTFLoader only)
├── utils/                       # Math helpers, constants, event bus
│   ├── math.ts                  # clamp, lerp, lerpVector3 helpers
│   ├── EventBus.ts              # Pub/sub event system
│   ├── assetHealthReport.ts     # Dev-mode asset status diagnostics
│   └── constants.ts             # Game-wide constants & enemy definitions
├── assets/characters/           # Source .vox models (canonical location)
├── scripts/
│   ├── convert-models.sh        # .vox → .glb conversion (v-optimizer + gltfpack)
│   ├── verify-assets.mjs        # Pre-build: check .glb files exist for all .vox sources
│   └── verify-build-assets.mjs  # Post-build: check code-referenced assets exist in dist/
```

---

## Asset Pipeline

Character models follow a `.vox` → `.glb` conversion pipeline:

```
assets/characters/*.vox  (source, checked into git)
        ↓
  convert-models.sh      (v-optimizer + gltfpack)
        ↓
public/assets/characters/*.glb  (optimized, generated in CI)
        ↓
  Vite build copies to dist/
        ↓
  GLTFLoader loads at runtime (CharacterModelLoader.ts)
```

**Key principles:**
- `.glb` (GLTF Binary) is the only runtime format — loaded via Three.js `GLTFLoader`
- `.vox` files are source assets only — never loaded at runtime (no VoxLoader exists)
- The deploy workflow generates `.glb` files automatically with caching
- Three verification layers prevent silent 404s: pre-build (`verify-assets.mjs`), post-build (`verify-build-assets.mjs`), and post-deploy smoke test

See CLAUDE.md "Asset Pipeline" section for the full set of rules and diagnostics.

---

## Key Architectural Patterns

### Game State Machine

The game uses a state machine with these states:

```
Menu → Hub → Dungeon → Hub → ...
         ↕        ↕
      Overlays  Overlays
```

**States:** `menu`, `hub`, `dungeon`, `dead`, `won`

**Overlays** (inventory, skill tree, floor select) are layered on top of Hub or Dungeon states rather than being separate states.

### Scene Management

Two scene types with different lifecycles:
- **Hub scene** — Persistent, hand-built, always in memory. Player returns here after each dungeon run.
- **Dungeon scenes** — Disposable, procedurally generated, created on floor entry and destroyed on exit.

### Entity-Component Pattern

Game objects (player, enemies, items) use composition over inheritance:
- Entities hold references to their mesh, stats, and behavior components.
- Common interfaces allow uniform treatment (health system applies to both player and enemies).

### Fixed-Timestep Game Loop

```
Game.update(delta):
  1. ActionManager.update()      // Poll all input providers
  2. Update game logic           // Fixed timestep
  3. Render scene                // Variable rate
  4. ActionManager.endFrame()    // Reset per-frame input state
```

### Event System

`EventBus` provides decoupled pub/sub communication:
- `enemyDied` → triggers loot drop + XP grant
- `bossDefeated` → unlocks next floor
- `playerDied` → triggers death overlay
- Events are fire-and-forget with no return values.

### Input Architecture

```
Game/UI Code (queries actions: "attack", "interact", etc.)
        ↑ reads
  ActionManager (merges all providers)
   ↑         ↑         ↑         ↑
Keyboard  Mouse   Gamepad   Touch
Provider  Provider Provider  Provider
```

Each provider implements `InputProvider` interface with `poll()`, `endFrame()`, and `destroy()`. ActionManager merges state and exposes semantic action queries. See [plans/input-abstraction.md](plans/input-abstraction.md) for the full design.

### Save System

- 4 save slots in `localStorage`.
- Auto-save on hub return and every 30 seconds.
- Save data includes: character level, XP, skill tree, inventory, highest unlocked floor, completion status.
- Graceful degradation: private browsing and full storage fail silently.
- Item migration handles old save formats automatically.

---

## Testing Architecture

### Unit Tests (Vitest)

Pure-logic modules that run without a browser:

| Directory | Pure Logic (testable) | Needs Browser (E2E only) |
|-----------|----------------------|--------------------------|
| `src/utils/` | math.ts, EventBus.ts, constants.ts | — |
| `src/rpg/` | Stats.ts, Leveling.ts, LootTable.ts, SkillTree.ts, Inventory.ts | LootDrop.ts |
| `src/dungeon/` | types.ts, FloorConfig.ts, DungeonGenerator.ts, ObstacleSystem.ts | FloorRenderer.ts |
| `src/game/` | SaveManager.ts, InputAction.ts | Game.ts, Player.ts, Camera.ts, Hub.ts, ActionManager.ts |
| `src/combat/` | — | All (Three.js dependent) |
| `src/ui/` | — | All (DOM dependent) |
| `src/rendering/` | — | All (WebGL dependent) |

### E2E Tests (Playwright)

Run against the production build in headless Chromium:
- **Functional tests** — Game load, menu, new game flow, hub navigation. Required for merge.
- **Visual regression** — Screenshot comparison with 2% threshold. Non-blocking; diffs uploaded as CI artifacts.

### Coverage

- 451 unit tests, 98% statement coverage on pure-logic modules.
- Thresholds enforced: 80% lines, 80% functions, 70% branches.
- Coverage report uploaded as CI artifact.

---

## Performance Design

Target: Chromebook-playable (60 FPS mid-range, 30 FPS low-end).

Key decisions:
- **InstancedMesh** for voxel geometry — minimizes draw calls.
- **Simple shaders** — no heavy post-processing.
- **Shadow follows player** — not a full shadow map.
- **Anti-aliasing disabled**, pixel ratio capped at 1.5.
- **Bundle budget: < 5 MB gzipped** (current: ~162 KB).

---

## CI/CD Pipeline

```
Push/PR
  ├── lint + typecheck (parallel)
  │     └── unit-test + bundle-size (after both pass)
  │           └── e2e-functional + e2e-visual (after unit tests pass)
  └── security (independent: npm audit + CodeQL)

Merge to main
  └── Build + Deploy to GitHub Pages
```

All required jobs must pass before PR merge. Visual regression is non-blocking.

---

## Key Files for Common Tasks

| Task | Key Files |
|------|-----------|
| Add a new enemy type | `src/utils/constants.ts` (define stats), `src/combat/Enemy.ts` (behavior), `src/dungeon/FloorConfig.ts` (assign to floors) |
| Add a new floor | `src/dungeon/FloorConfig.ts` (theme + enemies), `src/dungeon/DungeonGenerator.ts` (if new generation rules needed) |
| Add a new item type | `src/rpg/LootTable.ts` (drop tables), `src/rpg/Inventory.ts` (equip logic), `src/ui/InventoryUI.ts` (display) |
| Add a new skill node | `src/rpg/SkillTree.ts` (node definition), `src/ui/SkillTreeUI.ts` (rendering) |
| Add a new input action | `src/game/InputAction.ts` (define action + mappings), provider files (add bindings) |
| Add a new UI overlay | Create in `src/ui/`, add action routing in `src/game/Game.ts` |
| Add a new boss ability | `src/combat/Boss.ts` (ability logic), `src/dungeon/FloorConfig.ts` (assign to boss) |

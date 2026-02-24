# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

Input abstraction layer — Phase 2: Migrate game code to actions.

- **Game.ts migrated to ActionManager** — Replaced all `InputManager` usage in Game.ts with the new `ActionManager`. UI toggle checks (`Escape`, `KeyI`, `KeyK`) now use semantic actions (`uiCancel`, `toggleInventory`, `toggleSkillTree`). Interaction checks (`KeyE`) use `interact`. Death/win screen respawn checks (`KeyR`, `Enter`, `Space`) consolidated to the single `respawn` action. The game loop now calls `ActionManager.update()` at the start of each frame and `endFrame()` at the end.
- **Player.ts migrated to ActionManager** — Player movement and combat input now use the action-based API. Attack detection (`wasMousePressed`, `isMouseDown`, `isDown('Space')`) replaced with `wasActionPressed('attack')` and `isActionHeld('attack')`. Movement-speed reduction while attacking uses `isActionHeld('attack')` instead of checking mouse and keyboard separately.
- **InputManager deprecated** — With Game.ts and Player.ts fully migrated, InputManager is no longer used by core game logic. It remains temporarily for UI components that still use independent `keydown` listeners (to be migrated in Phase 3).

---

Input abstraction layer — Phase 1: ActionManager shell and input providers.

- **Action type system** — Defined `InputAction` union type covering all game actions (movement, combat, UI navigation, toggles, slot/floor selection) in `src/game/InputAction.ts`. Includes default mapping configurations for keyboard, mouse, and gamepad with full action catalog coverage.
- **Input provider interface** — Created `InputProvider` interface and `InputProviderState` type in `src/game/providers/InputProvider.ts`, establishing the contract all input devices implement: poll for state, end-of-frame cleanup, and active device detection.
- **Keyboard provider** — Splits keyboard handling out of InputManager into a standalone `KeyboardProvider` that maps key codes to named actions. Supports digital-to-axis conversion (WASD/arrows produce ±1 on moveX/moveZ) with proper cancellation when opposing keys are held simultaneously.
- **Mouse provider** — Standalone `MouseProvider` maps button clicks to actions (left click = attack + uiConfirm) and tracks normalized mouse position. Mouse position is exposed separately since continuous cursor coordinates are not a game action.
- **Gamepad provider** — Standalone `GamepadProvider` polls `navigator.getGamepads()` each frame, maps buttons to actions, and converts left stick input to moveX/moveZ axes with deadzone filtering. No synthetic keyboard events — a clean break from the old workaround.
- **ActionManager** — Central `ActionManager` class merges state from all active providers into a unified action-based API. Exposes `wasActionPressed()`, `isActionHeld()`, `getAxis()`, `getMovement()`, `getMousePosition()`, and `getActiveDevices()`. Includes a `createDefault()` factory that wires up all three providers.

---

Unit & integration testing infrastructure — Phase 2 of the quality roadmap.

- **Vitest test framework** — Installed Vitest, @vitest/coverage-v8, and jsdom. Created `vitest.config.ts` with v8 coverage provider targeting `src/utils/`, `src/rpg/`, `src/dungeon/`, and `src/game/SaveManager.ts`. Added `test`, `test:watch`, and `test:coverage` scripts to `package.json`.
- **335 unit tests across 13 test files** — Comprehensive test coverage for all pure-logic modules: math utilities (clamp, lerp, lerpVector3), EventBus (subscribe/emit/unsubscribe/clear), constants validation (numeric ranges, unique enemy type IDs, valid hex colors), PlayerStats (base stats, level scaling, modifier stacking, crit cap), LevelSystem (XP thresholds, level-up, skill points, max level, serialization), LootTable (drop generation, rarity distribution, slot coverage, weapon subtypes), DungeonGenerator (room placement, no overlaps, connectivity, boss room, exit reachability, seeded determinism, obstacles), FloorConfig (all 10 floors validated, difficulty scaling, boss abilities, obstacle configs), SaveManager (save/load round-trip, slot isolation, corrupt data, localStorage failure), SkillTree (node structure, prerequisites, rank-up, modifiers, serialization), Inventory (equip/unequip, bag capacity, weapon migration, serialization), ObstacleSystem (mud/water/fire/trap effects, trap one-time trigger), and dungeon types (enum members, no duplicates).
- **98% test coverage** — Achieved 98% statement, 94% branch, 100% function, and 99% line coverage across all tested modules, well above the 80% target.
- **CI test job** — Added a `test` job to `.github/workflows/quality.yml` that runs after lint and typecheck, executes `npm run test:coverage`, and uploads the coverage report as a workflow artifact.
- **TypeScript config updated** — Added `tests/` to `tsconfig.json` include array so test files receive full type checking.

---

Linting & formatting infrastructure — Phase 1 of the quality roadmap.

- **ESLint v9 with TypeScript support** — Installed ESLint v9, the unified `typescript-eslint` package, and `eslint-config-prettier`. Created a flat config (`eslint.config.js`) extending recommended TypeScript rules with `no-explicit-any` as a warning, `no-unused-vars` as an error, and `no-empty-function` disabled for Three.js lifecycle patterns.
- **Prettier formatting** — Installed Prettier with single quotes, trailing commas, and 100-character line width. Applied formatting across all source files. Added `.prettierrc` and `.prettierignore` configs.
- **Lint error fixes** — Fixed 8 lint errors in the existing codebase: removed unused imports (`ENEMY_CHASE_RANGE`, `TILE_SIZE`, `FloorTheme`, `buildArmorDisplayMesh`, `buildRingDisplayMesh`, `TestDummy`), prefixed an unused function parameter with underscore, and eliminated a useless assignment in `InventoryUI.ts`.
- **New package.json scripts** — Added `lint:fix`, `format`, and `format:check` scripts. Updated the existing `lint` script to use `--max-warnings 0` for strict enforcement.
- **CI quality workflow** — Created `.github/workflows/quality.yml` that runs lint, format check, and TypeScript type check on every PR and push to main.

---

Quality roadmap review — expanded and corrected the six-phase testing & quality improvement plan.

- **QUALITY_PLAN.md revised** — Reviewed the quality roadmap against the actual codebase and made corrections and additions. Fixed ESLint Phase 1 to use the modern unified `typescript-eslint` package (v8+) instead of the older separate plugin/parser packages. Added a "Current State Baseline" section documenting the project's starting point. Added a "Testability Map" showing which modules are pure logic vs. Three.js-dependent. Expanded Phase 2 with four additional test files (SkillTree, Inventory, ObstacleSystem, dungeon types) and split tests into Core and Extended priority groups. Added visual regression testing details to Phase 4 using Playwright's screenshot comparison. Expanded Phase 5 error handling audit from 3 to 6 items including InputManager gamepad errors, Inventory migration failures, and global unhandled rejection handling. Added bundle size monitoring as a CI gate in Phase 6. Added phase dependency documentation and session reference instructions for future Claude Code sessions.

---

Boss difficulty overhaul — all floor bosses are significantly more dangerous.

- **4× boss HP and damage** — Every boss's health and melee damage multipliers are quadrupled, making boss fights a true test of the player's build and skill rather than an afterthought.
- **Faster, more aggressive bosses** — Boss movement speed increased by ~30–40% and base attack cooldowns reduced by ~30–35% across all floors, so bosses pressure the player much harder.
- **Amplified charge ability** — Charge speed increased from 4× to 6× normal speed, charge damage multiplier raised from 1.5× to 2.5×, charge duration extended from 0.6 s to 0.8 s, and cooldown cut from 4 s to 2.5 s.
- **Wider slam AoE** — Slam's area-of-effect radius expanded from 3 to 5 units and its damage multiplier raised from 2× to 3.5×. Cooldown reduced from 5 s to 3 s so the boss uses it more frequently.
- **More frequent summons** — Summon cooldown dropped from 8 s to 5 s and the per-boss summon cap doubled from 3 to 6, letting bosses flood the arena with minions throughout the fight.
- **Aggressive teleport** — Teleport teleports 3–6 units (up from 2–4) and cooldown reduced from 6 s to 3.5 s, making the boss far harder to pin down.
- **Earlier, stronger enrage** — Enrage now triggers at 50% HP (up from 30%), giving the player less time before the boss enters its frenzied state. Enrage speed bonus increased from 1.4× to 1.8× and damage bonus from 1.3× to 1.6×. Attack cooldown during enrage reduced to 0.4× of base (down from 0.6×).
- **More frequent ability use** — The per-frame ability trigger chance doubled from 2% to 4%, so bosses rotate through their special attacks more aggressively throughout the encounter.

---

Shadow Lord fading invisibility — a haunting phase-cycling transparency effect.

- **Boss fading invisibility ability** — Added a new `invisibility` boss ability that cycles the Shadow Lord (Floor 5) between a ghostly peek state and full concealment. The boss fades to only 25% opacity at peak visibility — still mostly transparent for a haunting effect — then fades back to invisible over a 0.5 s transition and stays hidden for ~4 s before reappearing. Eyes retain a faint red ember glow (4% opacity) even when fully hidden so the player can track the boss's position. Damage hits briefly snap the boss to near-full opacity so hit feedback always reads clearly.

---

Asset Library usability improvements — item selection, collision, and spacing.

- **Centralized floor count constant** — Introduced a `TOTAL_FLOORS` constant derived from the floor config array so that all UI displays (HUD, save slots, floor select, win screen) automatically reflect the correct number of floors. Fixed the HUD and menu save-slot displays which still showed "/5" instead of "/10".
- **Library item selection fix** — Reworked the highlight algorithm to strongly prioritize proximity over facing direction. Reduced the detection range from 4.0 to 2.5 tiles and increased the distance penalty 5x so the closest item in front of the player is always selected first, similar to melee attack range.
- **Library pedestal collision** — Display pedestals now have collision boxes, preventing the player from walking through items on display. The player must navigate around them like any other solid object.
- **Library item spacing** — Increased spacing between displayed assets in all library wings (enemies, items, structures) so the player can comfortably walk between pedestals. Expanded the Enemy and Items wing rooms to accommodate the wider layouts.

## 2026-02-18

Asset library and weapon system polish, focusing on combat feedback and animation visuals.

- **Asset Library room** — Added a dedicated room in the hub for inspecting all game assets during development, with 3 training dummies for damage testing. Library auto-enters on proximity instead of requiring an E key press.
- **Weapon swing animations** — Implemented weapon swing visuals in the hub and during dungeon combat, with fixed player facing direction and proper weapon visibility. Movement is restricted to 1/4 speed while the attack button is held, and enemies now have solid collision that blocks player movement during combat.
- **Build version display** — Added a build version indicator to the title screen for tracking deployed versions.
- **Saved weapons migration** — Fixed old save files that don't have the weapon subtype field by automatically migrating them to the correct format, preventing weapons from becoming invisible when loaded from older saves.

## 2026-02-17

Combat refinement and collision improvements.

- **Attack movement restriction** — Restrict player movement during attacks and add enemy solid collision so enemies block the player instead of being walked through.

## 2026-02-14

Improved visual clarity by adding character silhouettes that show through walls, so the player and enemies are never lost behind geometry. Also added a proper README and updated the license copyright.

- **Occlusion silhouettes** — Player, enemies, and bosses now render semi-transparent outlines (cyan for player, orange-red for enemies, red for bosses) when occluded by walls, using a GreaterDepth test pass so characters are always visible.
- **README and credits** — Added a full README with game overview, feature list, GitHub Pages play link, development setup, controls reference, and tech stack summary. Updated the LICENSE copyright holder to Matt Johnson and Nathaniel Johnson.

## 2026-02-13

A massive day of development spanning the final two milestones, a game rename, major dungeon scaling, and a full gamepad/keyboard accessibility pass across every UI screen.

### Milestones completed

- **Milestone 5: Persistence & Polish** — Implemented save/load via localStorage with auto-save on hub return and every 30 seconds. Added 5 distinct floor themes (Stone Crypt, Mossy Caverns, Lava Forge, Frozen Depths, Shadow Sanctum) each with unique colors, lighting, and fog. Introduced boss encounters on every floor with special abilities (charge, slam, summon minions, teleport, enrage at low HP), larger models with crown markers, and dedicated health bars. The exit now requires defeating the boss before ascending. Added polished HUD elements including floor name display and boss health bar. Added initial gamepad support with left stick movement and button mappings for core actions.
- **Milestone 6: Final Boss & Release** — Expanded levels with configurable grid sizes (80–120 tiles), wider corridors (3–4 tiles), larger rooms with pillars, and dedicated boss rooms (16–24 tiles). Introduced 5 enemy types (grunt, brute, archer, mage, assassin) with unique visuals and stats, plus captain variants with gold crowns. Added a knockback system and enhanced the boss with 5 abilities. Implemented 4 save slots with selection UI, delete with confirmation, and game completion tracking. Expanded inventory with 24-slot bag, 5 weapon categories (sword, axe, mace, dagger, spear), 4 potion types, and a consumable buff system. Floor 5 Shadow Lord serves as the final boss with a victory screen on defeat. Performance tuning: shadow follows player, disabled AA, capped pixel ratio at 1.5.

### Game identity and scaling

- **Renamed to "Rhayzd Pteq"** — Updated the HTML page title and menu screen title from "Dungeon Ascent" to the new name.
- **4x dungeon scale** — Doubled grid dimensions in both axes for 4x total area across all 5 floors. Room counts quadrupled (e.g. Floor 1 went from 10 to 40 rooms). Increased placement attempts from 500 to 2000 to reliably fill the larger grids. Enemy density per room stays the same, so total enemies scale naturally with the room count.

### Gamepad and keyboard accessibility

- **Title screen and floor select** — Gamepad D-pad and A button now work on the title screen and floor select dialog by dispatching synthetic KeyboardEvents from the InputManager. Added a gamepad connection indicator on the title screen and updated hint text.
- **Inventory navigation** — D-pad navigates between equipment slots and bag items, A button equips/unequips or uses consumables, B button closes the dialog. Selection is highlighted with a purple outline and auto-scrolls in the bag list.
- **Skill tree, death screen, and tooltips** — D-pad left/right switches skill branches, up/down navigates nodes, A allocates points, B closes. Death screen accepts gamepad A in addition to keyboard. Inventory now shows an item stats tooltip panel for gamepad/keyboard users (replacing the mouse-only title attribute).
- **Item drop** — Added X key and gamepad R1 to drop the selected bag item, with a custom in-game confirmation dialog supporting keyboard, mouse, and gamepad input (defaults to Cancel to prevent accidents).

### Bug fixes

- **Floor selection** — Fixed a bug where canceling floor selection left `floorSelectOpen=true`, permanently blocking player movement. Also fixed Enter key and number key selection calling `hide()` before the `onSelect` callback (which nulled the callback). Added arrow key and A/D key navigation for save slot selection on the title screen.
- **Continuous attack** — Added hold-to-attack: holding the mouse button or Space key now continuously attacks when the cooldown expires (previously required repeated clicks). Then fixed a follow-up bug where gamepad polling set `mouseDown=true` on button press but never cleared it on release, causing permanent auto-attack after any gamepad input.

## 2026-02-12

The game went from an empty repo to a fully playable dungeon crawler in a single day, completing Milestones 1 through 4 — project scaffolding, hub world, dungeon generation, combat, and the full RPG progression system.

### Milestones completed

- **Milestone 1: Hub & Movement** — Scaffolded the Vite + TypeScript + Three.js project. Built a game state machine (Menu, Hub, Dungeon), a hand-built hub scene with voxel checkerboard floor, walls, corner pillars, and an animated purple portal. Added a player character (blue cube) with WASD movement and isometric camera follow. Portal interaction (press E) transitions to a dungeon room; press E at the green exit tile to return to hub. Hub persists in memory while dungeon scenes are created and destroyed per run. Production build came in at 122KB gzipped.
- **Milestone 2: Dungeon Generation & Transitions** — Added procedural dungeon generation with room placement, L-shaped corridors, walls, and doors connected via Prim's MST. Rendering uses InstancedMesh for batched voxel geometry. Implemented tile-based collision, a fog-of-war minimap that reveals as the player explores, a floor selection UI at the portal (5 floors with unlock progression), and a floor indicator in the HUD.
- **Milestone 3: Combat** — Introduced real-time action combat with melee attacks (click or Space), enemy AI with patrol/chase/attack behaviors, a health system with death and respawn, and floating damage numbers. Enemies spawn in dungeon rooms and scale in difficulty per floor. Added an EventBus for decoupled combat communication, health bar HUD, and i-frames on the player.
- **Milestone 4: RPG Systems** — Full RPG progression: XP and leveling with enemies granting floor-scaled XP, a 3-branch skill tree (Warrior, Guardian, Scout) with 4 tiers and multi-rank nodes, randomized loot drops with rarity tiers (common through epic) and procedural names, an inventory system with 3 equipment slots and a 20-slot bag, and consumable items. Combat now uses computed stats (attack, defense, maxHP, crit chance, movement speed) derived from base attributes, equipment, and skill modifiers.

### Infrastructure and fixes

- **GitHub Pages deployment** — Added a GitHub Actions workflow that builds and deploys to GitHub Pages on push to main. Set the Vite base path to `/rhayzdpteq/` for correct asset URLs.
- **Movement direction fix** — Negated the isometric rotation angle so WASD maps to screen-relative directions (W=up, S=down, A=left, D=right). Added an instructions overlay showing controls and current objective.
- **Deploy workflow fix** — Changed the workflow trigger from `master` to `main` to match the repo's default branch.

## 2026-02-11

- **Initial commit** — Created the repository with the MIT license, CLAUDE.md with foundational AI assistant guidance, and the game design document (GAME_PLAN.md) capturing all architectural decisions: Three.js + TypeScript + Vite stack, voxel art style, isometric camera, real-time combat, procedural generation, localStorage saves, and 6 development milestones. Also added the hub area concept to the game plan establishing the Menu → Hub → Dungeon → Hub game loop.

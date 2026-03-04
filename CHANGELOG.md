# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

Security scanning — Phase 5 of the quality roadmap.

- **Dependabot configuration** — Added `.github/dependabot.yml` to automate weekly dependency update PRs for both npm packages and GitHub Actions workflows, keeping dependencies current with minimal manual effort.
- **Security CI workflow** — Created `.github/workflows/security.yml` that runs on every push to main, every PR, and on a weekly schedule. Two jobs: `npm audit --audit-level=high` to catch known vulnerabilities in production dependencies, and a CodeQL static analysis scan for the JavaScript/TypeScript language pack.
- **`npm run audit` script** — Added a convenience `audit` script to `package.json` so developers can run `npm run audit` locally to replicate the CI vulnerability check before pushing.
- **Error overlay in main.ts** — Wrapped `Game.start()` in a top-level try/catch. On failure, a red overlay is rendered directly to the page body with the error message and a prompt to refresh. Added a `window.addEventListener('unhandledrejection', ...)` handler so silent promise rejections are also surfaced in the same overlay.
- **SaveManager localStorage hardening** — The `activeSlot` getter and setter, `hasSave()`, and `deleteSave()` were missing try/catch around localStorage calls. All four are now wrapped so that private browsing mode or a full storage quota degrade gracefully: reads return safe defaults (slot 1 or `false`), writes fail silently with the in-memory state still updated.
- **GamepadProvider graceful degradation** — Wrapped `navigator.getGamepads()` in a try/catch. Restrictive browser contexts (some security policies disallow gamepad API access) now fall back cleanly to keyboard-only input instead of throwing.
- **Inventory.fromJSON validation** — Added a `safeMigrate` helper inside `fromJSON` that validates each raw item from save data (checks for `id` and `name` strings) before passing it to `migrateItem`. Corrupt or unrecognizable items are silently skipped rather than crashing the load. The same guard is applied to both equipped slots and bag items.

---

E2E & visual testing — Phase 4 of the quality roadmap.

- **Playwright E2E test framework** — Installed `@playwright/test` and created `playwright.config.ts` configured for headless Chromium against the production build (`npm run preview`). Tests run with screenshot-on-failure, trace-on-retry, and a 2% pixel-difference threshold for visual regression snapshots.
- **23 E2E tests across 4 test files** — Comprehensive browser-based tests covering the full game startup flow: game loading (5 tests verifying canvas creation, no JS errors, load time under 5 seconds), menu screen (9 tests for title, save slots, buttons, keyboard slot selection, visual regression), new game flow (4 tests for click and keyboard game start, hub transition, HUD display), and hub navigation (6 tests for WASD movement, inventory/skill tree overlays, portal interaction, visual regression).
- **Visual regression baselines** — Generated screenshot baselines for the title screen and hub HUD stored in `tests/e2e/__snapshots__/`. The version info is masked on the title screen to avoid false positives from build metadata changes.
- **Split E2E CI into functional and visual jobs** — Functional E2E tests (game load, menu, new game, hub navigation) are a required merge gate. Visual regression tests are non-blocking (`continue-on-error`) — when they fail, a bot comment is posted on the PR explaining the failure and linking to downloadable diff artifacts so a reviewer can decide whether to accept or fix the change.
- **Visual regression tagged `@visual`** — Screenshot comparison tests are tagged with `@visual` so they can be run or skipped independently. New npm scripts: `test:e2e:functional` (excludes visual), `test:e2e:visual` (only visual), `test:e2e:update-snapshots` (regenerate baselines).
- **Update Visual Snapshots workflow** — Added a manually-triggered GitHub Actions workflow (`update-snapshots.yml`) that regenerates screenshot baselines in the CI environment and commits them to a specified branch. This ensures baselines always match CI's rendering (Ubuntu, Playwright Chromium) rather than a developer's local environment.
- **CLAUDE.md E2E guidance** — Documented E2E test categories, when to run them locally vs. relying on CI, how visual regression baselines work, and when/how to update them. Clarified that E2E tests are primarily a CI concern and not needed every session.

---

Build & developer experience — Phase 3 of the quality roadmap.

- **Pre-commit quality gates** — Installed Husky and lint-staged so every `git commit` automatically lints and formats staged TypeScript files under `src/`. Commits are blocked if ESLint errors remain after auto-fix, catching issues locally before they reach CI.
- **Bundle analysis tooling** — Added `rollup-plugin-visualizer` to the Vite build, gated behind the `ANALYZE=true` environment variable. Running `npm run analyze` produces an interactive treemap at `dist/stats.html` showing gzipped module sizes. Current production bundle is 162 KB gzipped — well within the 5 MB budget.
- **New npm scripts** — Added `analyze` script for on-demand bundle visualization. Husky's `prepare` script ensures hooks are installed automatically on `npm install`.
- **CLAUDE.md quality guidance** — Added a "Quality Gates" section to CLAUDE.md documenting the pre-commit hook, the full pre-commit checklist (lint, format, type-check, build), and the bundle size budget. Ensures Claude Code proactively runs quality checks rather than relying solely on the git hook. Updated Common Commands table with `format` and `analyze` entries.

---

Touch input fixes — death screen, inventory, and inspect dialog.

- **Death/win overlay now dismissible by tap** — Changed both overlays from `pointer-events: none` to `pointer-events: auto` and added a click handler so tapping anywhere on the screen (not just the hidden "E" button) exits the screen and returns to the hub. The cursor also shows a pointer so the intent is clear.
- **Inventory touch action dialog** — Tapping a bag item on a touch device now opens a contextual action dialog (Equip/Use, Drop, Cancel) instead of immediately acting on the item. Tapping an equipped item shows an Unequip/Cancel dialog. This prevents mis-equips caused by imprecise taps and provides a consistent way to drop items without relying on invisible gestures (shift-click, right-click) that don't exist on touch screens. Mouse and gamepad behaviour is unchanged.
- **Inventory hint text adapts to device** — The hint line at the bottom of the inventory panel now updates whenever the active device changes: touch devices see "Tap any item to equip, use, or drop it"; gamepad sees the D-pad hints; keyboard/mouse sees the full click/right-click/shift-click reference.
- **Library inspect dialog dismissible by tap** — Added a tap-outside-to-close handler on the backdrop overlay and a dedicated "Close" button inside the dialog box. Previously touch users had no way to exit the dialog because the backdrop captured all touch events and the E virtual button was blocked behind the overlay.

---

Input abstraction layer — Phase 6: Cleanup and remove legacy code.

- **Removed InputManager.ts** — Deleted the legacy `InputManager` class that was fully replaced by ActionManager and the provider-based input system in Phases 1–5. The file had no remaining imports anywhere in the codebase but still contained the old monolithic input handling with synthetic keyboard event dispatch for gamepad support.
- **Updated documentation references** — Updated GAME_PLAN.md, QUALITY_PLAN.md, and PLAN.md to reference ActionManager and the provider architecture instead of the removed InputManager. The QUALITY_PLAN.md testability map and error handling audit now point to the correct files.
- **Input system unit tests** — Added 116 unit tests across 6 test files covering the entire input abstraction layer: ActionManager (23 tests for merging, device detection, lifecycle), KeyboardProvider (31 tests for key mapping, axis cancellation, blur handling), MouseProvider (15 tests for click mapping, position tracking), GamepadProvider (22 tests for button mapping, stick axes, deadzone, no synthetic events), TouchProvider (7 tests for initialization and auto-hide), and InputAction mappings (18 tests validating all default configurations). Total test count increased from 335 to 451.
- **Coverage config expanded** — Added `InputAction.ts`, `ActionManager.ts`, and `src/game/providers/**` to the vitest coverage include list so the input system is tracked alongside existing pure-logic modules.

---

Input abstraction layer — Phase 5: Polish and device detection.

- **Primary device tracking** — ActionManager now tracks a `primaryDevice` property that reflects the most recently used input device (keyboard, gamepad, or touch). Mouse input counts as keyboard since the two are used together. The property persists between frames and only changes when a different device is actually used, preventing UI flicker.
- **Device-adaptive HUD prompts** — All interaction prompts throughout the game (portal, dungeon exit, library, death/win screens) now show device-appropriate hint text: "Press E" for keyboard, "Press A" for gamepad, "Tap E" for touch. A new `InputHints` utility provides centralized hint-text mappings for all action types across all device categories.
- **Active device indicator** — The HUD bottom-right corner now shows a brief device indicator ("Keyboard & Mouse", "Gamepad", or "Touch") that fades after 3 seconds when the active input device changes. Gamepad connection still triggers a green "Gamepad Connected" notification on state transitions.
- **Context-sensitive InstructionsPanel** — The controls cheat sheet in the top-right corner now dynamically updates its control bindings based on the active device, showing keyboard shortcuts, gamepad buttons, or touch button names as appropriate. The objective text also adapts (e.g., "press E" vs "tap E" to enter the dungeon).
- **Touch controls polish** — Added CSS transitions for smooth button press/release animations with a subtle scale effect (0.92x on press). Added haptic feedback via `navigator.vibrate()` on button presses when the Vibration API is available. Added responsive scaling that adjusts button sizes based on viewport dimensions (0.8x–1.4x scale) for better usability across phones and tablets.
- **Removed per-frame gamepad polling** — Eliminated redundant `setGamepadConnected()` calls from `updateHub()`, `updateDungeon()`, and `updateLibrary()` since the new `updateActiveDevice()` method handles device tracking centrally each frame.

---

Input abstraction layer — Phase 4: Touch provider and virtual controls.

- **Touch provider** — Added `TouchProvider` implementing the `InputProvider` interface, enabling full touch-screen gameplay. The provider feeds into ActionManager alongside keyboard, mouse, and gamepad with no changes needed in game logic or UI components.
- **Virtual joystick** — A floating joystick appears where the user first touches the left half of the screen. Dragging produces analog moveX/moveZ axis values with deadzone filtering and diagonal normalization. The joystick base and knob follow the finger and disappear on release.
- **On-screen action buttons** — Four semi-transparent circular buttons on the right side of the screen: ATK (attack, large), E (interact/confirm/respawn), I (toggle inventory), and K (toggle skill tree). Buttons provide both pressed (one-shot) and held (continuous) states for seamless combat.
- **Auto-detection** — Touch controls automatically appear on the first touch event and hide when keyboard or mouse input is detected. Synthetic mouse events fired by the browser after touch are filtered with a 1-second grace period to prevent flicker.
- **Touch-safe overlays** — Death and win screen overlays now use `pointer-events: none` so touch events pass through to the virtual buttons beneath, allowing touch users to respawn via the E button.
- **Canvas touch-action** — Added `touch-action: none` to the canvas element to prevent browser default touch behaviors (double-tap zoom, scroll gestures) from interfering with gameplay.

---

Input abstraction layer — Phase 3: Migrate UI components to actions.

- **All UI components migrated to ActionManager** — Six UI components (MenuScreen, FloorSelectUI, InventoryUI, SkillTreeUI, ConfirmDialog, LibraryAssetDialog) now use the action-based input system instead of independent `window.addEventListener('keydown', ...)` listeners. Each component exposes a `handleActions(actions)` method that queries semantic actions (`uiUp`, `uiDown`, `uiConfirm`, `uiCancel`, `dropItem`, etc.) instead of checking raw key codes.
- **Game.ts routes actions to active overlays** — Added a `routeUIActions()` method to Game.ts that delegates ActionManager input to whichever UI overlay is currently active (inventory, skill tree, floor select, or library dialog). The menu screen receives actions directly during the menu state. This eliminates the need for each overlay to register and unregister its own event listeners.
- **Gamepad works natively in all UI** — Gamepad D-pad, A/B buttons, and shoulder buttons now work in every UI screen without synthetic keyboard event dispatch. The gamepad provider maps directly to actions that UI components query, providing a clean first-class gamepad experience.
- **ConfirmDialog integrated with InventoryUI** — The drop-item confirmation dialog is now action-driven. When the confirm dialog is open, InventoryUI delegates all action handling to it, replacing the previous capture-phase keydown listener pattern.
- **Floor selection uses selectFloor actions** — FloorSelectUI now uses `selectFloor0`–`selectFloor9` actions for direct number-key floor selection, replacing raw `parseInt(e.key)` parsing.

---

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

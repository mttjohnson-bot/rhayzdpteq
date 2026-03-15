# Changelog

All notable changes to this project are documented in this file, grouped by the date they were made.

## 2026-03-14

Boss Challenge mode; move Controls & Objective panel to menu tab system; fix enemy voxel model facing direction; add concurrent session rebase-before-push rule; fix Asset Library room overlaps; skip CI checks for documentation-only PRs; switch voxel art models to the default for player character and enemies; fix boss enemy display size in Asset Library; fix vitest upgrade peer dependency conflict and high-severity undici security vulnerability; add session completion workflow requiring auto-PR and auto-merge; reposition modals to top of window; add web session environment guidance to prevent wasted effort.

- **Added Boss Challenge mode for completed floors** — Floors that have been cleared (marked with ★ in the floor selection menu) now offer a choice between "Full Floor" (normal entry from the start) and "Boss Challenge" (skip directly to the boss room). Boss Challenge spawns the player at the edge of the boss room with only the boss present — no regular enemies. This lets players re-fight bosses for practice or loot without replaying the entire floor.

- **Moved Controls & Objective to menu tab system** — The Controls and Objective information panel that was always visible in the top-right corner has been moved into the menu tab bar as a new "Controls" tab, accessible alongside Inventory, Skills, Map, Settings, and Diagnostics. The former panel location now shows a compact "Menu" button with a hamburger icon (three horizontal lines) that opens the menu when clicked.

- **Fixed enemy and boss voxel models facing away from the player** — GLB voxel models have their front facing +Z, but the procedural enemy models face -Z. The facing-angle formula was tuned for -Z, causing voxel enemies to face backwards when chasing or attacking the player. Added a 180° rotation offset when loading GLB models so they correctly face the player.

- **Added concurrent session rebase-before-push rule to CLAUDE.md** — Multiple Claude Code sessions running simultaneously can produce conflicts in append-only files (CHANGELOG.md, SESSION_LOG.md). Added instructions requiring sessions to rebase onto `origin/main` before pushing and to resolve conflicts by keeping all entries from both sides.

- **Fixed Asset Library room overlaps** — The Enemy and Structure rooms on the north side of the corridor overlapped with adjacent rooms (NPC and each other) because the large room widths exceeded the spacing between connector positions. Added `roomCX` offsets to shift room centers away from their connectors, extended the main corridor from X=63 to X=74 to accommodate the shifted rooms, increased the Enemy room depth from 22 to 26 for better wall clearance on the boss rows, and shifted the Training room slightly east to maintain a 2.5-unit gap from the Player Characters room. All rooms now have at least 2 units of gap between them, and models near walls have adequate clearance to be fully visible.

- **Skip CI checks for documentation-only PRs** — Added `paths-ignore` filters to the Quality and Security workflows so that PRs changing only Markdown files, docs, or LICENSE no longer trigger lint, type check, unit tests, bundle size, E2E, visual regression, npm audit, or CodeQL checks. This avoids wasting CI minutes on PRs with no code changes.

- **Added Claude Code web session environment guidance to CLAUDE.md** — New section documents hard constraints of web sessions: `gh` CLI unavailable (do not attempt to install or use workarounds), dependencies not pre-installed (always run `npm install` first), E2E tests cannot run (no browser binary), and no interactive terminal. Updated Session Completion, Quality Gates, and E2E Testing sections to account for these limitations. This prevents sessions from wasting effort on repeated failed attempts to use `gh`, diagnose missing `node_modules`, or run Playwright tests.

- **Repositioned all modals and dialogs to the top of the window** — Modals (Inventory, Skills, Map, Settings, Diagnostics, Vault, Floor Select) and overlay dialogs (Confirm, Item Action, Library Asset) now appear at a fixed position near the top of the viewport instead of being vertically centered. This reserves space for the MenuTabBar at the top and keeps modal content consistently positioned regardless of content height.

- **Switched voxel art models to the default** — The game now defaults to the owl voxel model for the player character and voxel art for all enemies/bosses, instead of simple procedural geometry. Players can still switch back to simple models via the Settings menu. The voxel defaults are applied when entering the hub so the first game session uses the full art style.
- **Added model conversion to E2E CI workflow** — The quality workflow's E2E test jobs now run the `.vox` → `.glb` model conversion pipeline and asset verification before building, matching the deploy workflow. This prevents false console errors from missing model files when the game defaults to voxel art.

- **Added session completion workflow to CLAUDE.md** — Claude Code sessions that produce code changes are now required to open a pull request and enable auto-merge (`gh pr merge --auto --squash`) before the session ends. This eliminates the two-step review process where a human had to wait for CI checks to complete before merging, allowing PR description review and CI results to be available at the same time.

- **Fixed enemy and boss voxel models facing away from the player** — GLB voxel models have their front facing +Z, but the procedural enemy models face -Z. The facing-angle formula was tuned for -Z, causing voxel enemies to face backwards when chasing or attacking the player. Added a 180° rotation offset when loading GLB models so they correctly face the player.

- **Fixed boss enemies appearing tiny in Asset Library** — Boss display meshes in the library were being normalized to unit size (`1.0 / scale`), making them appear the same size as or smaller than regular enemies. Removed the normalization so bosses now display at their actual dungeon scale (2.2–3.0), correctly appearing as the largest enemy type.

- **Fixed `@vitest/coverage-v8` peer dependency conflict** — Bumped `@vitest/coverage-v8` from `^4.0.18` to `^4.1.0` to match the vitest 4.1.0 upgrade (PR #104). The strict peer dependency on the exact vitest version caused `npm ci` to fail in CI.

- **Fixed 6 high-severity `undici` vulnerabilities** — Updated `undici` from 7.22.0 to 7.24.1 to resolve WebSocket parser crash, HTTP request/response smuggling, unbounded memory consumption, unhandled exception, CRLF injection, and DoS via response buffering (GHSA-f269-vfmq-vjvj, GHSA-2mjp-6q6p-2qxm, GHSA-vrm6-8vpv-qv8q, GHSA-v9p9-hfj2-hcw8, GHSA-4992-7rv2-5pvq, GHSA-phc3-fgpg-7m6h). This is a transitive dependency via `jsdom`.

## 2026-03-13

Scale up GLB character models, enemy voxel art models, settings toggle, asset library model sync, library model sizing fix, CI deprecation fixes, and security fix.

- **Fixed high-severity `flatted` vulnerability** — Updated `flatted` from 3.3.x to 3.4.1 to resolve an unbounded recursion DoS vulnerability in `parse()` (GHSA-25h7-pfq9-p65f). This was a transitive dependency via `flat-cache` (used by ESLint).

- **Fixed Asset Library voxel models appearing smaller than in-game** — Enemy and boss GLB models in the Asset Library now apply the same `MODEL_SCALE_DEFAULT` (2x) multiplier used in dungeon floors. Previously the library omitted this multiplier, making voxel models appear at half their in-game size. Boss models were especially tiny due to an additional normalization factor compounding the issue.

- **Scaled up GLB character models with per-model multipliers** — The owl player model now renders at 1.5x size and the owlbear at 2.5x size. All other GLB models (enemies, bosses) render at 2x their previous size. Models were previously normalized to fit within the base player dimensions, making them appear too small. Added `MODEL_SCALE_OWL`, `MODEL_SCALE_OWLBEAR`, and `MODEL_SCALE_DEFAULT` constants for easy tuning.
- **Player collision radius now scales with active character model** — When switching to a larger GLB model, the player's collision radius increases proportionally so movement collision with walls and mobs matches the visual size. Switching back to the simple box model restores the default collision radius.
- **Enlarged Asset Library rooms for scaled-up models** — The Player Characters room expanded from 10×8 to 16×10 tiles with wider pedestal spacing. The Enemies room expanded from 18×16 to 26×22 tiles with increased spacing between rows and columns to prevent model overlap.
- **Model Gallery shows owl at game scale** — The standalone model gallery page now applies the same 1.5x scale multiplier used in-game, with an enlarged grid/ground plane and pulled-back camera to accommodate the larger model.

- **Fixed Asset Library not reflecting enemy model style setting** — The Asset Library now responds to the "Enemy Models" setting toggle, switching enemy and boss display meshes between simple procedural geometry and custom voxel art models. Previously, changing the setting only affected enemies on dungeon floors — the library always showed simple geometry. The library also applies the current model style when first opened.

- **Converted all enemy and boss .vox files to optimized .glb models** — Ran the conversion pipeline for all 17 character models (5 enemy types: grunt, brute, archer, mage, assassin; 10 bosses: Crypt Guardian, Fungal Brute, Forge Titan, Frost Wyrm, Shadow Lord, Sewer Abomination, Inferno Demon, Crystal Golem, Blood Tyrant, Abyssal Overlord; plus 2 player characters). All .glb files verified present.
- **Added GLB model loading for enemies and bosses** — Extended CharacterModelLoader with `loadEnemyModel()` and `loadBossModel()` functions that load and cache enemy/boss .glb models by type ID or boss name. Boss names are automatically mapped to filenames (e.g. "Crypt Guardian" → "cryptguardian.glb").
- **Enemies and bosses can now display custom voxel art models** — Added `setModelStyle('simple' | 'custom')` to both Enemy and Boss classes. When set to 'custom', the procedural box geometry is hidden and replaced with the loaded GLB voxel model, auto-scaled to match the enemy's dimensions. Health bars remain visible on top of custom models.
- **Added "Enemy Models" toggle in Settings** — New settings option lets players switch all enemies between "Simple" (procedural boxes) and "Voxel Art" (custom .glb models). The setting applies immediately to all active enemies and persists for newly spawned enemies. Accessible via the pause menu Settings panel.

Fix Node.js 20 deprecation warnings in deploy workflow.

- **Eliminated upload-artifact Node.js 20 deprecation warning** — Replaced the `actions/upload-pages-artifact@v4` composite action (which internally uses `upload-artifact@v4.6.2` / Node.js 20) with inline tar archiving + `actions/upload-artifact@v7` (Node.js 24 native). The `deploy-pages@v4` warning remains because GitHub has not yet released a Node.js 24 version of that action.
- **Fixed Node.js 20 deprecation warnings for deploy-pages and upload-pages-artifact** — Moved `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` from step-level env (which didn't propagate to composite action internals like `upload-artifact`) to job-level env on both the `build` and `deploy` jobs. This eliminates the remaining two Node.js 20 deprecation warnings from `actions/upload-pages-artifact@v4` and `actions/deploy-pages@v4`.

## 2026-03-12

Library collision fixes, corridor end gaps, accurate player model display, room transition positioning, GitHub Actions Node.js 24 migration, and CI artifact upload fix.

- **Fixed spurious "No files were found" warning in CI artifact uploads** — Changed the E2E test results upload steps from `if: always()` to `if: failure()` (functional) and `if: steps.visual.outcome == 'failure'` (visual regression). Playwright only creates the `test-results/` directory when tests fail, so uploading unconditionally produced a harmless but noisy warning on every passing run.

- **Updated GitHub Actions to resolve Node.js 20 deprecation warnings** — Upgraded `actions/cache` from v4 to v5 (now runs on Node.js 24 natively) across deploy and convert-models workflows. Added `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` env for `upload-pages-artifact` (no v5 available yet). Updated all workflows from Node.js 20 to Node.js 22 LTS for the build runtime.

- **Fixed exit position when leaving library** — Previously, exiting the library teleported the player to the center of the hub instead of near the library door. Now exiting the library places the player just outside the library entrance on the hub's east wall, and returning from a dungeon places the player near the portal. Room transitions now feel spatially consistent in both directions.

- **Fixed library exit loop** — Exiting the library placed the player 1.5 units from the library door, but the auto-enter trigger radius is 2.5 units, causing the player to immediately re-enter the library. Increased the exit offset to 3.0 units so the player spawns safely outside the trigger zone.

- **Asset Library now shows actual .glb models for Owl and Owlbear** — The player character pedestals previously displayed hand-built geometric approximations (cylinders, cones, boxes) that didn't match the real voxel art models. Now the Asset Library loads the actual `.glb` models from the conversion pipeline and displays them on pedestals, so what you see in the library matches what you get in gameplay. Falls back to the simple box if `.glb` files aren't available.

- **Fixed invisible wall blocking end of library corridor** — Player movement bounds were capped at X=54 but the corridor extends to X=63. Updated bounds to cover the full library extent so the player can reach the corridor end and all rooms.
- **Fixed floor gaps between corridor and room connectors** — The main corridor floor only extended to the wall center line, leaving a 0.5-unit gap at each connector opening where the wall gap meets the connector floor. Extended the corridor floor to cover the full wall thickness, closing the gaps.

## 2026-03-11

Library layout fixes, wider corridor, and owlbear character selection.

- **Added Owlbear as a selectable player character** — The owlbear voxel model is now available as a player character option in Settings → Character, alongside Simple and Owl. Updated the Asset Library status from "Coming soon" to "Available."

- **Refactored library to corridor-based layout** — Replaced the hub-style entry hall with a long east-west corridor spine that rooms branch off of via short connector corridors. This makes it much easier to add new rooms in the future — just extend the corridor and add a branch. Room signs mark each connector entrance.
- **Added Player Characters room** — New room (south side, first branch) displaying the three player models: Simple (default box), Owl, and Owlbear. Each sits on an inspectable pedestal with model info and flavor text. Geometric display meshes built for owl (with ear tufts, wings, beak) and owlbear (hulking bear body with owl features and claws).
- **Added dedicated NPC Characters room** — Moved the Merchant Vendor out of the entry hall into a separate north-side room for NPC characters. Added a Quest Giver placeholder NPC to preview future hub inhabitants.
- **Added dedicated Training room** — Moved the three practice dummies out of the entry hall into a separate south-side room with a raised platform. Training area is now clearly separated from the display wings.
- **Improved navigation between rooms** — The corridor-and-branch layout eliminates the cluttered entry hall where training dummies, NPCs, and corridor openings were all competing for space. Each room is now accessed via a clearly visible connector corridor with consistent 3-tile-wide openings.
- **Widened main corridor from 3 to 5 tiles** — The main east-west corridor spine is now much more spacious, matching the scale of the rooms it connects.
- **Fixed floor tile gaps at doorway openings** — Extended the corridor floor to cover the area under wall positions so that doorway openings no longer have visible gaps between the corridor and connector floors.
- **Fixed room overlaps** — Spread room connector positions along the corridor so that rooms on the same side (north or south) no longer overlap each other. The Enemies and Dungeon Structures rooms (north) and Training and Items rooms (south) are now properly spaced apart.

## 2026-03-08

Boss hitbox fix and touch inventory fix.

- **Fixed touch inventory action menu not appearing** — The TouchProvider only marked itself as active for joystick and button touches on the game canvas, causing touches on inventory items to fall through to the MouseProvider. This switched the detected input device from "touch" to "keyboard," preventing the touch-friendly item action dialog (Use/Equip/Drop) from appearing. Now any touch on the screen keeps the provider active for device detection, so the action menu reliably appears when tapping inventory items.
- **Fixed boss hitbox not scaling with model size** — Player attack hit detection now accounts for the target's collision radius, so hits register at the edge of the boss model rather than requiring the player to push into the boss's center. Also fixed auto-face targeting to use the same edge-distance calculation for consistent behavior.

## 2026-03-07

Asset pipeline overhaul, character models, balance tuning, and favicon.

- **Replaced broken conversion pipeline with Node.js script** — The previous `convert-models.sh` relied on external tools (`v-optimizer`, `gltfpack`) at URLs that didn't exist, causing the deploy workflow to fail. Replaced with `convert-models.mjs`, a self-contained Node.js script using `@gltf-transform/core` that requires no external tool downloads.
- **Fixed GLB asset pipeline** — The deploy workflow now converts `.vox` models to optimized `.glb` files during CI with caching, ensuring GLTFLoader is the only model loader used.
- **Removed VoxLoader** — Deleted `VoxLoader.ts` entirely. There is no runtime `.vox` fallback. If `.glb` files are missing, the conversion pipeline must be fixed — not worked around.
- **Removed duplicate .vox files from public/** — Source `.vox` files now live only in `assets/characters/` (the canonical location). The `public/assets/characters/` directory is reserved for generated `.glb` output.
- **Added build-time asset verification** — New `verify-assets.mjs` script checks that every source `.vox` file has a corresponding `.glb` output before building. Fails the deploy if assets are missing.
- **Added build-time asset manifest check** — New `verify-build-assets.mjs` script scans source code for asset path references and verifies each one exists in `dist/`, catching silent 404s before deployment.
- **Added post-deploy smoke test** — After deploying to GitHub Pages, CI now curls key asset URLs and fails if any return 404, catching deployment issues immediately.
- **Improved CharacterModelLoader diagnostics** — GLB load failures now log detailed error messages with remediation steps including the exact command to run.
- **Added runtime asset health report** — In dev mode, the app logs a console table of all expected assets and their HTTP status on startup, making pipeline issues immediately visible.
- **Added CLAUDE.md asset pipeline guardrails** — New "Asset Pipeline" section with explicit rules preventing future sessions from adding runtime `.vox` loaders or duplicating `.vox` files.
- **Added favicon** — Created SVG and ICO favicons with "RP" letters (gold on dark purple) to eliminate 404 errors on GitHub Pages. Added `<link>` tags to `index.html` for both formats.
- **Added runtime VoxLoader (later removed)** — Temporary `.vox` fallback loader and model gallery page, subsequently replaced by the proper GLB pipeline above.
- **Added character model switching** — New "Character" setting in the Settings menu lets players switch between the default simple box model and the Owl voxel model (.glb loaded via Three.js GLTFLoader).
- **Created .vox-to-.glb conversion pipeline** — Node.js script (`scripts/convert-models.mjs`) converts MagicaVoxel .vox files to optimized .glb using @gltf-transform/core, with MD5-based skip logic to avoid redundant conversions.
- **Added CI workflow for model conversion** — GitHub Actions workflow (`convert-models.yml`) runs the conversion with cache keyed on .vox file hashes, so unchanged models are never re-processed.
- **Added CharacterModelLoader** — New module (`src/rendering/CharacterModelLoader.ts`) handles async GLB loading with caching, cloning, and graceful fallback on load failure.
- **Created VR/WebXR plan document** — 5-phase development plan for Meta Quest 2 support covering immersive rendering via WebXR sessions, XR controller input provider, VR comfort options, VR-compatible UI strategies, and VR-specific gameplay enhancements.
- **Doubled regular enemy damage** — Base enemy attack damage increased from 10 to 20, making trash mobs more threatening and encouraging defensive play and gear upgrades.
- **Halved boss damage again** — All boss damage multipliers quartered (to offset the doubled base) across all 10 floors, resulting in a net 50% reduction from previous values.

## 2026-03-06

Balance tuning, UI bug fixes, menu tab bar, and mouse interaction fixes.

- **Doubled regular enemy health** — Base enemy HP increased from 40 to 80, making trash mobs more durable and encouraging use of skills and gear upgrades.
- **Halved boss damage** — All boss damage multipliers reduced by 50% across all 10 floors, making boss fights less punishing and more about sustained combat.
- **Increased boss health to 150%** — Boss HP multipliers adjusted upward by 50%, creating longer boss encounters that reward consistent play.
- **Doubled Regeneration rate** — The Guardian skill tree's Regeneration node now grants +1 HP/sec per rank (up from +0.5), making the defensive path more viable.
- **Added 3rd Regeneration tier** — Regeneration now supports 3 ranks (up from 2), allowing a maximum of +3 HP/sec for fully invested Guardian builds.
- **Fixed description overflow in tooltips** — Item descriptions that exceeded the fixed-height tooltip panel were cut off. The tooltip now auto-sizes downward to fit all content.
- **Fixed vault item hover descriptions** — Hovering over items in the Vault storage screen didn't display the item description tooltip. Mouse hover now updates the selected item and shows its stats in the tooltip panel, matching Inventory behavior.
- **Fixed confusing tab-switch hint** — The keyboard hint below the tab bar displayed `[ / ]: switch tab`, which looked like the `/` key was the shortcut. Changed to `[ and ]: switch tab` to clearly indicate the bracket keys.
- **Removed per-tab shortcut labels** — Tab buttons previously showed shortcut keys for some tabs but not others, creating an inconsistent appearance. All tabs now display only their name.
- **Fixed tooltip hover jitter** — Hovering over inventory items caused the tooltip panel to resize, which shifted item positions and caused a rapid jitter loop. The tooltip panel now has a fixed height so its content never causes layout reflows.
- **Applied jitter fix to Vault UI** — The same fixed-height tooltip was applied to the Vault storage screen which had the same issue.
- **Visual tab bar** — Added a `MenuTabBar` component that appears at the top of the screen whenever any menu panel is open. Displays clickable tabs for Inventory, Skills, Map, Settings, and Diagnostics with the active tab highlighted.
- **ESC key conflict fix** — Fixed a bug where pressing Escape while any menu was open would close it then immediately reopen Settings. ESC now only maps to `toggleMenu`.
- **Keyboard tab cycling** — Added `[` and `]` key bindings for switching between menu tabs.
- **Map shortcut key** — Added `M` key to directly open/close the Map tab from gameplay (dungeon only).
- **Unified ESC handling** — ESC now closes any open overlay (including Floor Select and Library Dialog), not just tab-system menus.
- **Default menu tab** — ESC now opens the Inventory tab (instead of Settings) as the default menu when nothing else is open.
- **Tab cycling skips disabled tabs** — When cycling tabs with `[`/`]` or LB/RB, the Map tab is automatically skipped when not in a dungeon.
- **Inventory selection tracking** — Mouse hover and click now update the selection highlight to match the hovered/clicked item.
- **Settings close button fix** — The X button in the Settings menu now responds to mouse clicks. The MouseProvider was mapping left-click to a `uiConfirm` action that triggered a DOM re-render before the button's click event could fire.
- **UI click isolation** — Mouse clicks on UI overlay elements no longer emit game actions through the input action system.

## 2026-03-05

Full map tab, diagnostics, settings menu, item vault, documentation reorganization, and quality Phase 6.

- **Full map tab** — Added a Map tab (`src/ui/MapUI.ts`) accessible via the menu tab cycling system. Shows the entire revealed dungeon layout with zoom and pan controls.
- **Map discovery percentage** — The map tab displays the percentage of non-empty tiles that have been revealed by the player.
- **Key indicators** — Entrance (blue), exit (green), boss room outline (red), and player position (blue dot) are highlighted on the map with a color legend.
- **Zoom and pan** — Zoom in with Enter/A button, zoom out with X/R1, pan with arrow keys/D-pad. Map auto-centers on the player when opened.
- **Five-tab menu system** — Extended the menu tab cycling from 4 tabs to 5 tabs. Map tab is only available while in a dungeon.
- **Minimap data sharing** — Added getters to the Minimap class so the full map can reuse the fog-of-war state.
- **Diagnostics info tab** — Added a Diagnostics tab (`src/ui/DiagnosticsInfoUI.ts`) accessible via the menu tab cycling system. Displays OS, browser, screen resolution, viewport size, GPU name, live FPS/draw calls, active input device, and connected gamepad name.
- **OS and browser detection** — Detects operating system and browser from the user agent string with version numbers.
- **Controller status** — Shows the active input device and the connected gamepad's name and ID in real-time.
- **Four-tab menu system** — Extended the menu tab cycling from 3 tabs to 4 tabs (Inventory, Skills, Settings, Diagnostics).
- **DiagnosticsOverlay getters** — Added `fps` and `drawCalls` public getters to the existing DiagnosticsOverlay for data sharing.
- **Settings menu** — Added a Settings panel (`src/ui/SettingsUI.ts`) accessible via Start button on gamepad or Escape on keyboard. Includes camera mode, controller detection, and diagnostics overlay toggle.
- **First-person camera mode** — Extended `GameCamera` to support a first-person view at player eye level. Toggle via Settings menu.
- **Diagnostics overlay** — Added a real-time FPS counter and draw call display in the top-right corner with color-coded FPS indicator.
- **Gamepad Start button opens menu** — The Start button (button 9) now opens the Settings panel as a pause menu.
- **LB/RB tab cycling** — When a menu overlay is open, pressing LB or RB on a gamepad cycles between tabs.
- **New input actions** — Added `toggleMenu`, `tabLeft`, and `tabRight` actions to the input system.
- **Vault storage system** — Added a VaultStorage class (`src/rpg/VaultStorage.ts`) with a 48-slot capacity for long-term item storage.
- **Vault UI overlay** — Added a two-column vault dialog (`src/ui/VaultUI.ts`) with full keyboard, gamepad, and touch support.
- **Vault chest in Hub** — Added a decorative chest object on the west wall of the Hub. Walk near it and press E to open the vault.
- **Save/load integration** — Vault contents persist across saves via the existing localStorage save system.
- **Documentation structure** — Created a `docs/` directory with separate sections for player-facing and developer-facing documentation.
- **Player guide** — Created `docs/player/PLAYER_GUIDE.md` covering game startup, controls, dungeon floors, combat mechanics, enemy types, RPG systems, saving, HUD elements, and troubleshooting.
- **Development roadmap** — Created `docs/development/ROADMAP.md` organizing all project work into Completed, Ready to Build, and Needs Planning categories.
- **Architecture overview** — Created `docs/development/ARCHITECTURE.md` documenting the tech stack, project structure, and architectural patterns.
- **AI session log** — Created `docs/development/SESSION_LOG.md` with a template for capturing AI session prompts, plans, and outcomes.
- **Planning docs reorganized** — Moved `PLAN.md` and `QUALITY_PLAN.md` into `docs/development/plans/` with descriptive filenames.
- **CLAUDE.md documentation rules** — Added a "Documentation Maintenance" section with standing requirements for keeping all docs current.
- **Coverage thresholds enforced** — Added `thresholds` configuration to `vitest.config.ts` requiring 80% line, 80% function, and 70% branch coverage.
- **Bundle size CI gate** — Added a `bundle-size` job to the quality workflow that fails if gzipped size exceeds 5 MB.
- **Consolidated CI workflow** — Restructured `.github/workflows/quality.yml` with a clear job dependency graph.
- **README quality badges** — Added live status badges for the Quality workflow, Deploy workflow, and MIT license.
- **Quality roadmap completed** — Updated `QUALITY_PLAN.md` to mark Phase 6 as complete.

## 2026-03-04

Security scanning — Phase 5 of the quality roadmap.

- **Dependabot configuration** — Added `.github/dependabot.yml` to automate weekly dependency update PRs for both npm packages and GitHub Actions workflows.
- **Security CI workflow** — Created `.github/workflows/security.yml` that runs on every push to main, every PR, and on a weekly schedule. Two jobs: `npm audit --audit-level=high` and CodeQL static analysis.
- **`npm run audit` script** — Added a convenience `audit` script to `package.json` for local vulnerability checking.
- **Error overlay in main.ts** — Wrapped `Game.start()` in a top-level try/catch with a red overlay on failure and an `unhandledrejection` handler.
- **SaveManager localStorage hardening** — All localStorage calls now wrapped in try/catch so private browsing mode or full storage degrades gracefully.
- **GamepadProvider graceful degradation** — Wrapped `navigator.getGamepads()` in a try/catch for restrictive browser contexts.
- **Inventory.fromJSON validation** — Added a `safeMigrate` helper that validates each raw item from save data before processing. Corrupt items are silently skipped.

## 2026-03-02

E2E testing, visual regression, pre-commit hooks, and bundle analysis — Phases 3 & 4 of the quality roadmap.

- **Playwright E2E test framework** — Installed `@playwright/test` and created `playwright.config.ts` configured for headless Chromium against the production build.
- **23 E2E tests across 4 test files** — Comprehensive browser-based tests covering game loading, menu screen, new game flow, and hub navigation.
- **Visual regression baselines** — Generated screenshot baselines for the title screen and hub HUD stored in `tests/e2e/__snapshots__/`.
- **Split E2E CI into functional and visual jobs** — Functional E2E tests are a required merge gate. Visual regression tests are non-blocking with bot comments on failure.
- **Visual regression tagged `@visual`** — Screenshot comparison tests tagged for independent run/skip. New npm scripts: `test:e2e:functional`, `test:e2e:visual`, `test:e2e:update-snapshots`.
- **Update Visual Snapshots workflow** — Added a manually-triggered GitHub Actions workflow (`update-snapshots.yml`) that regenerates screenshot baselines in CI.
- **CLAUDE.md E2E guidance** — Documented E2E test categories, when to run locally vs. CI, and how visual regression baselines work.
- **Pre-commit quality gates** — Installed Husky and lint-staged so every `git commit` automatically lints and formats staged TypeScript files. Commits are blocked if ESLint errors remain after auto-fix.
- **Bundle analysis tooling** — Added `rollup-plugin-visualizer` to the Vite build gated behind `ANALYZE=true`. Running `npm run analyze` produces an interactive treemap at `dist/stats.html`.
- **New npm scripts** — Added `analyze` script for on-demand bundle visualization.
- **CLAUDE.md quality guidance** — Added a "Quality Gates" section documenting the pre-commit hook, the full pre-commit checklist, and the bundle size budget.

## 2026-02-27

Touch input fixes and legacy input system removal.

- **Death/win overlay now dismissible by tap** — Changed both overlays from `pointer-events: none` to `pointer-events: auto` and added a click handler so tapping anywhere exits the screen.
- **Inventory touch action dialog** — Tapping a bag item on a touch device now opens a contextual action dialog (Equip/Use, Drop, Cancel) instead of immediately acting on the item.
- **Inventory hint text adapts to device** — The hint line at the bottom of the inventory panel now updates whenever the active device changes.
- **Library inspect dialog dismissible by tap** — Added a tap-outside-to-close handler on the backdrop overlay and a dedicated "Close" button inside the dialog box.
- **Removed InputManager.ts** — Deleted the legacy `InputManager` class that was fully replaced by ActionManager and the provider-based input system.
- **Updated documentation references** — Updated GAME_PLAN.md, QUALITY_PLAN.md, and PLAN.md to reference ActionManager instead of InputManager.
- **Input system unit tests** — Added 116 unit tests across 6 test files covering the entire input abstraction layer. Total test count increased from 335 to 451.
- **Coverage config expanded** — Added input system files to the vitest coverage include list.

## 2026-02-26

Input abstraction layer — Phases 4 & 5: Touch provider, virtual controls, and device detection.

- **Touch provider** — Added `TouchProvider` implementing the `InputProvider` interface, enabling full touch-screen gameplay.
- **Virtual joystick** — A floating joystick appears where the user first touches the left half of the screen with analog axis values, deadzone filtering, and diagonal normalization.
- **On-screen action buttons** — Four semi-transparent circular buttons on the right side of the screen: ATK, E, I, and K.
- **Auto-detection** — Touch controls automatically appear on first touch event and hide when keyboard or mouse input is detected.
- **Touch-safe overlays** — Death and win screen overlays now use `pointer-events: none` so touch events pass through to virtual buttons.
- **Canvas touch-action** — Added `touch-action: none` to the canvas to prevent browser default touch behaviors.
- **Primary device tracking** — ActionManager now tracks a `primaryDevice` property reflecting the most recently used input device.
- **Device-adaptive HUD prompts** — All interaction prompts now show device-appropriate hint text.
- **Active device indicator** — The HUD bottom-right corner shows a brief device indicator that fades after 3 seconds.
- **Context-sensitive InstructionsPanel** — The controls cheat sheet dynamically updates based on the active device.
- **Touch controls polish** — Added CSS transitions for smooth button press/release animations, haptic feedback via `navigator.vibrate()`, and responsive scaling.
- **Removed per-frame gamepad polling** — Eliminated redundant `setGamepadConnected()` calls since `updateActiveDevice()` handles device tracking centrally.

## 2026-02-24

Input abstraction layer — Phases 1–3: ActionManager, providers, and full migration.

- **Action type system** — Defined `InputAction` union type covering all game actions in `src/game/InputAction.ts` with default mapping configurations for keyboard, mouse, and gamepad.
- **Input provider interface** — Created `InputProvider` interface and `InputProviderState` type establishing the contract all input devices implement.
- **Keyboard provider** — Standalone `KeyboardProvider` that maps key codes to named actions with digital-to-axis conversion and proper cancellation.
- **Mouse provider** — Standalone `MouseProvider` mapping button clicks to actions and tracking normalized mouse position.
- **Gamepad provider** — Standalone `GamepadProvider` polling `navigator.getGamepads()` each frame with deadzone filtering. No synthetic keyboard events.
- **ActionManager** — Central class merging state from all active providers into a unified action-based API.
- **Game.ts migrated to ActionManager** — Replaced all `InputManager` usage with semantic actions.
- **Player.ts migrated to ActionManager** — Player movement and combat input now use the action-based API.
- **All UI components migrated to ActionManager** — Six UI components now use `handleActions(actions)` instead of raw key listeners.
- **Game.ts routes actions to active overlays** — Added `routeUIActions()` method delegating input to the active UI overlay.
- **Gamepad works natively in all UI** — Gamepad D-pad, A/B buttons, and shoulder buttons work in every UI screen without synthetic keyboard events.
- **ConfirmDialog integrated with InventoryUI** — The drop-item confirmation dialog is now action-driven.
- **Floor selection uses selectFloor actions** — FloorSelectUI now uses `selectFloor0`–`selectFloor9` actions for direct number-key floor selection.

## 2026-02-20

Unit testing, linting infrastructure, quality planning, boss difficulty overhaul, and Shadow Lord invisibility.

- **Vitest test framework** — Installed Vitest, @vitest/coverage-v8, and jsdom. Created `vitest.config.ts` with v8 coverage provider.
- **335 unit tests across 13 test files** — Comprehensive test coverage for all pure-logic modules: math utilities, EventBus, constants, PlayerStats, LevelSystem, LootTable, DungeonGenerator, FloorConfig, SaveManager, SkillTree, Inventory, ObstacleSystem, and dungeon types.
- **98% test coverage** — Achieved 98% statement, 94% branch, 100% function, and 99% line coverage across all tested modules.
- **CI test job** — Added a `test` job to `.github/workflows/quality.yml` that runs after lint and typecheck.
- **ESLint v9 with TypeScript support** — Installed ESLint v9 with flat config extending recommended TypeScript rules.
- **Prettier formatting** — Installed Prettier with single quotes, trailing commas, and 100-character line width. Applied across all source files.
- **Lint error fixes** — Fixed 8 lint errors in the existing codebase.
- **CI quality workflow** — Created `.github/workflows/quality.yml` for lint, format check, and type check on every PR and push to main.
- **QUALITY_PLAN.md revised** — Reviewed and corrected the quality roadmap. Added Current State Baseline, Testability Map, expanded Phase 2 test files, visual regression details, expanded Phase 5 error handling audit, and bundle size monitoring.
- **QUALITY_PLAN.md created** — Six-phase testing and quality improvement roadmap.
- **4× boss HP and damage** — Every boss's health and melee damage multipliers quadrupled.
- **Faster, more aggressive bosses** — Boss movement speed increased ~30–40%, base attack cooldowns reduced ~30–35%.
- **Amplified charge ability** — Charge speed increased from 4× to 6×, damage from 1.5× to 2.5×, duration extended, cooldown cut.
- **Wider slam AoE** — Slam radius expanded from 3 to 5 units, damage from 2× to 3.5×, cooldown reduced.
- **More frequent summons** — Summon cooldown dropped from 8s to 5s, cap doubled from 3 to 6.
- **Aggressive teleport** — Teleport range increased, cooldown reduced from 6s to 3.5s.
- **Earlier, stronger enrage** — Enrage triggers at 50% HP (up from 30%), with increased speed and damage bonuses.
- **More frequent ability use** — Per-frame ability trigger chance doubled from 2% to 4%.
- **Boss fading invisibility ability** — Shadow Lord (Floor 5) cycles between ghostly peek state and full concealment with a haunting transparency effect.

## 2026-02-19

Asset Library usability improvements — item selection, collision, and spacing.

- **Centralized floor count constant** — Introduced a `TOTAL_FLOORS` constant so all UI displays automatically reflect the correct number of floors. Fixed HUD and menu save-slot displays showing "/5" instead of "/10".
- **Library item selection fix** — Reworked the highlight algorithm to strongly prioritize proximity over facing direction. Reduced detection range and increased distance penalty.
- **Library pedestal collision** — Display pedestals now have collision boxes, preventing the player from walking through items.
- **Library item spacing** — Increased spacing between displayed assets in all library wings and expanded rooms to accommodate wider layouts.

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

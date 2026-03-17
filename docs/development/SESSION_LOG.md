# AI Session Log

This document captures AI development session prompts, plans, and outcomes. The purpose is to preserve the intent and context behind changes so that:

1. **Plans trace back to prompts** — Understanding *why* something was built, not just *what* was built.
2. **Prompts can be analyzed and improved** — Reviewing past prompts helps identify patterns where initial descriptions were unclear, leading to plans that missed the concept, requiring rework.
3. **Lost intent can be recovered** — When something was asked for but got lost in translation during planning or building, the original prompt provides a reference point.
4. **Development decisions have context** — The conversation between the human and AI agent is a primary input to the software development lifecycle, and capturing it preserves institutional knowledge.

---

## How to Use This Log

### During a Session

At the end of each AI development session, add an entry below with:

1. **Date** — When the session occurred.
2. **Session prompt(s)** — The key prompts or instructions given to the AI agent, paraphrased or quoted. Focus on the prompts that drove significant decisions, not every minor follow-up.
3. **Plan produced** — What plan or approach was decided on. Link to any plan documents created.
4. **What was built** — Brief summary of the actual outcome (details go in CHANGELOG.md).
5. **Gaps or rework** — Note if the initial prompt was unclear and had to be restated, or if something was asked for but not captured in the plan. This is valuable for improving future prompts.

### Entry Format

```markdown
## YYYY-MM-DD — Short Description

### Prompt
> Paraphrase or quote the key prompt(s) that initiated this session's work.
> Include follow-up prompts if they significantly changed direction.

### Plan
Brief description of the plan or approach decided on.
Link to plan document if one was created: [plan-name.md](plans/plan-name.md)

### Outcome
What was actually built or changed. Reference CHANGELOG.md for details.

### Notes
- Any gaps between what was asked and what was delivered.
- Prompts that were unclear and had to be restated.
- Ideas mentioned but deferred.
- Lessons for future prompts.
```

---

## Why Capture Prompts?

### The Prompt → Plan → Build Pipeline

```
Prompt (intent)
  → Plan (structured design)
    → Build (implementation)
      → Test (verification)
        → Document (player guide, changelog, roadmap)
```

Each stage can introduce drift from the original intent. By capturing prompts alongside plans and outcomes, you create a traceable chain from "what was imagined" to "what was built." This is especially valuable when:

- **Reviewing past work** — "Why was this built this way?" can be answered by reading the original prompt and plan together.
- **Identifying prompt patterns** — If certain types of requests consistently need clarification, the prompt style can be improved.
- **Recovering missed requirements** — "I'm sure I asked for X" can be verified by searching the session log.
- **Onboarding new contributors** — The session log provides narrative context that code comments and changelogs cannot.

### Improving Prompts Over Time

Patterns to watch for when reviewing past sessions:

- **Restated prompts** — If you had to re-explain something, the original was probably too vague or too broad. Next time, break it into specific asks.
- **Plan drift** — If the plan didn't capture the concept well, the prompt may have been ambiguous about priorities or constraints.
- **Missing pieces** — If something was mentioned in a prompt but not built, it may have been buried in a long description. Consider leading with the most important requirements.
- **Scope creep vs. scope miss** — Sometimes a broad prompt leads to more work than intended; other times key details get lost. Reviewing past sessions helps calibrate.

---

## Session Entries

Entries are listed in reverse chronological order (newest first).

---

## 2026-03-17 — Fix Update Visual Snapshots Workflow

### Prompt
> The last couple PRs hit a visual regression notice and I tried running the Update Visual Snapshots but that doesn't seem to have changed anything, and I don't think I noticed the Update Visual Snapshots commit anything... are you able to see what it did and if it actually performed what was expected

### Plan
1. Compare the Update Visual Snapshots workflow against the Quality workflow's visual regression job to find discrepancies.
2. Fix whatever is causing the workflow to produce no changes.

### Outcome
Found that `update-snapshots.yml` was missing the `.vox` → `.glb` model conversion steps (`convert-models.mjs` and `verify-assets.mjs`) that the quality workflow includes. Without these, the update workflow generated screenshots without character models, which either matched the existing (also modelless) baselines or produced screenshots that differed from what the quality workflow sees. Added the two missing steps so both workflows now run in identical environments.

### Notes
- The quality workflow (`quality.yml`) converts models before both the functional E2E and visual regression jobs, but this was never copied to the update-snapshots workflow when it was created.
- After this fix, running "Update Visual Snapshots" on a branch should properly regenerate baselines that match what the visual regression job expects.

---

## 2026-03-14 — Reposition Modals to Top of Window

### Prompt
> For the dialogs or modals that pop up, I would like the top of them to appear at a fixed height toward the top of the window rather than being centered vertically. There should still be some margin at the top to have the menu tab bar to switch between dialogs/modals, so have them all start at the top with that space reserved.

### Plan
1. Change all 7 tab-bar modals (Inventory, SkillTree, Settings, Vault, Map, DiagnosticsInfo, FloorSelect) from `top: 50%` + `translate(-50%, -50%)` to `top: 60px` + `translateX(-50%)` to position them below the MenuTabBar.
2. Change all 3 overlay dialogs (ConfirmDialog, ItemActionDialog, LibraryAssetDialog) from `alignItems: center` to `alignItems: flex-start` with `paddingTop: 60px`.

### Outcome
All modals and dialogs now appear at a fixed position near the top of the viewport (60px from the top), reserving space for the MenuTabBar. The change is consistent across all 10 UI components.

### Notes
- The MenuTabBar is positioned at `top: 8px` and occupies roughly 50px of vertical space, so `60px` provides adequate clearance.
- No changes needed to MenuTabBar itself — it was already top-positioned.

---

## 2026-03-13 — Scale Up GLB Character Models

### Prompt
> The GLB models are all the same size and when being rendered appear a bit small. I would like to see the player character owl model about 1.5x bigger and the owlbear model 2.5x bigger. Can we double the size of the GLB models (taking into account whatever is needed for make sure their hit box and such is properly calculated). I would also like change made in the library so that the models in the library appear the same size they would in the game. This means that you will probably need to resize the room (and anything else surrounding) for the enemy characters in the library to accommodate the additional space needed for these changes.

### Plan
1. Add per-model scale constants (`MODEL_SCALE_OWL=1.5`, `MODEL_SCALE_OWLBEAR=2.5`, `MODEL_SCALE_DEFAULT=2.0`) to `constants.ts`.
2. Apply these multipliers in `Player.setCharacterModel()` on top of the base normalization scaling, and make the player collision radius dynamic to match.
3. Apply 2x multiplier in `Enemy.setModelStyle()` and `Boss.setModelStyle()` for GLB models.
4. Update `AssetLibrary.scaleModelForDisplay()` to accept a scale multiplier, and enlarge the Player Characters room (16×10) and Enemies room (26×22) with wider pedestal spacing.
5. Update the standalone model gallery to apply the owl's 1.5x scale with a larger grid and camera distance.

### Outcome
All GLB models now render at their intended scale — owl at 1.5x, owlbear at 2.5x, and all enemies/bosses at 2x. Player collision radius is dynamic and matches the active model. Asset Library rooms are enlarged to prevent model overlap. Model gallery shows the owl at its in-game scale.

### Notes
- The collision radius change only affects movement collision (wall/mob blocking). Combat hit detection uses separate range constants and enemy/boss `collisionRadius` properties, which are unchanged.
- The simple box fallback model retains its original size and collision radius.

---

## 2026-03-13 — Fix Asset Library Voxel Model Display

### Prompt
> I went into the library to see the new voxel models on all the enemy characters but it didn't change to use the voxel models there when I changed the setting. When I was on a level I did see the new models loaded on enemy characters so I think there is an issue that is not behaving the same in the library for the enemy characters. I would really like the library to render things the same as it would on a floor level since I'm using the library as a development and diagnostics tool at the moment.

### Plan
1. Add a `setEnemyModelStyle()` method to `AssetLibrary` that iterates enemy/boss assets and swaps display meshes between simple geometry and loaded voxel GLB models.
2. Call the new method from `Game.ts` when the settings change (alongside the existing `CombatSystem.setEnemyModelStyle()` call).
3. Apply the current model style when the library is first created, so it matches the setting from the start.

### Outcome
Asset Library now mirrors dungeon floor behavior: changing the "Enemy Models" setting immediately swaps all enemy and boss display meshes in the library. On first library visit, the current style is applied automatically. Voxel models are loaded asynchronously with the same scaling logic used by Enemy/Boss classes.

### Notes
- The library stores simple children and hides them (rather than removing) when voxel models are shown, allowing fast toggling back to simple mode.
- Boss display meshes apply the same `1/config.scale` normalization as `buildBossDisplayMesh()` so voxel models display at consistent size on pedestals.

---

## 2026-03-13 — Enemy Voxel Art Models & Settings Toggle

### Prompt
> I have uploaded several assets/characters directory of the repo and there should be one for each of the enemy characters (mob, captain, boss) with a filename that closely matches the enemy name. Can you make sure all the vox files are converted to optimized glb models and update all the enemy models to also support the use of the glb models. I would like to have a toggle in the settings to switch all enemies between the simple models and the custom asset models.

### Plan
1. Run the vox-to-glb conversion pipeline for all 17 character .vox files (5 enemy types + 10 bosses + 2 player characters).
2. Expand CharacterModelLoader with `loadEnemyModel()` and `loadBossModel()` functions, mapping enemy type IDs and boss names to .glb filenames.
3. Add `setModelStyle('simple' | 'custom')` to both Enemy and Boss classes that toggles between procedural box geometry and loaded GLB models.
4. Add an "Enemy Models" setting (Simple / Voxel Art) to the Settings UI and GameSettings interface.
5. Wire the setting through Game.ts → CombatSystem so it applies to all active enemies and newly spawned ones.

### Outcome
All 17 .vox files converted to optimized .glb models. Enemy and Boss classes now support model switching. A new "Enemy Models" toggle in Settings lets players switch between simple procedural geometry and custom voxel art models. The setting applies immediately to all active enemies and persists for new spawns.

### Notes
- Boss name → filename mapping uses simple lowercase + strip spaces (e.g. "Crypt Guardian" → "cryptguardian.glb"), which matches all 10 boss .vox filenames.
- Health bars remain visible when custom models are active.
- Model loading is async with graceful fallback to simple geometry if GLB loading fails.

---

## 2026-03-13 — Fix Remaining Node.js 20 Deprecation Warnings

### Prompt
> Even after merging the last fix which was supposed to fix the warnings in GitHub Actions, I'm still seeing some warnings on Deploy to GitHub Pages #105 — `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02` (from upload-pages-artifact) and `actions/deploy-pages@v4`.

### Plan
Research revealed that `actions/upload-pages-artifact@v4` is a composite action that internally uses `upload-artifact@v4.6.2` (Node.js 20). The `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` env var forces the runtime but doesn't suppress the informational warning. Fix: inline the composite action's tar + upload logic using `upload-artifact@v7` (Node.js 24 native). The `deploy-pages@v4` warning cannot be fixed — GitHub has not released a Node.js 24 version of that action yet (latest is v4.0.5).

### Outcome
Replaced `upload-pages-artifact@v4` with inline tar archiving + `upload-artifact@v7`, eliminating one of the two warnings. The `deploy-pages@v4` warning remains until GitHub releases a Node 24-native version.

### Notes
- The previous fix (moving env var from step-level to job-level) was correct in ensuring Node 24 runtime, but the warnings are emitted by GitHub Actions infrastructure based on action metadata, not the actual runtime used.
- Neither `upload-pages-artifact` nor `deploy-pages` have released Node 24-native versions as of March 2026. The June 2026 deadline should prompt releases.

---

## 2026-03-12 — Fix Library Collision Issues

### Prompt
> I'm still seeing some gaps in the floor in the library between the corridor and the rooms. I am also not able to go to the end of the corridor — it is as if there is an invisible wall or something preventing the player from reaching the end of the corridor.

### Plan
Two bugs from the 2026-03-11 library refactor:
1. **Invisible wall**: Player bounds in `enterLibrary()` were set to maxX=54, but `CORRIDOR_END_X=63`. Updated bounds to cover the full library extent (X up to 64, Z from -33 to 23).
2. **Floor gaps**: Main corridor floor depth was `(CORRIDOR_HALF_WIDTH + 0.5) * 2 = 6.0`, only reaching the wall center (Z=±3.0). Connector floors start at the wall outer edge (Z=±3.5), leaving 0.5-unit gaps at each opening. Extended corridor floor to `(CORRIDOR_HALF_WIDTH + 1.0) * 2 = 7.0` to reach the wall outer edge.

### Outcome
Both fixes applied. Player can now walk the full corridor length and floor is continuous at all connector openings. All quality gates pass.

### Notes
- The bounds issue was a simple oversight from the refactor — the hardcoded bounds weren't updated when the corridor was extended.
- The floor gap fix from the previous session partially addressed the issue but only extended the floor to the wall center, not the wall outer edge where connector floors begin.

---

## 2026-03-11 — Library Navigation Refactor

### Prompt
> Make improvements to the library. Fix navigation issues when walking into rooms. Organize the library so it's easier to expand — a long corridor with rooms branching off the sides. Add a Player Characters room showing the simple model, owl, and owlbear as possible player models. Add a separate NPC Characters room for the merchant and future NPCs. Move practice dummies into a separate Training room.

### Plan
Replace the hub-style entry hall layout with a corridor-based spine:
1. Main corridor runs east from the hub entry, with rooms branching north/south via connector corridors.
2. Six rooms: Player Characters (south), NPC Characters (north), Training (south), Enemies (north), Items (south), Structures (north).
3. Data-driven room definitions (`ROOM_BRANCHES` array) with automated wall/gap generation for easy future expansion.
4. Build geometric display meshes for owl and owlbear player characters.
5. Update library bounds and training area coordinates in Game.ts.

### Outcome
Complete refactor of AssetLibrary.ts. New corridor-based layout with six rooms, three new room types (Player Characters, NPC Characters, Training). All existing content (enemies, items, structures, obstacles) preserved in their original wings. Geometric owl and owlbear display meshes created. All quality gates pass (lint, format, typecheck, build).

### Notes
- The `ROOM_BRANCHES` array makes it trivial to add new rooms — just append a new entry with connector position, side, and dimensions.
- The owlbear model exists as a `.vox` file but isn't yet available as a selectable character model (listed as "Coming soon" in the library).
- The cluttered entry hall problem is resolved: training dummies, NPCs, and display assets each have their own dedicated room now.

---

## 2026-03-05 — Item Storage Vault

### Prompt
> Work on Item Storage Vault which is mentioned in the ROADMAP.md. A storage container in the Hub where the player can transfer items between their bag and long-term storage. Requires a vault UI dialog with keyboard and gamepad support, similar to the existing inventory overlay.

### Plan
Implement the vault as three new components:
1. `VaultStorage` data model — a standalone class with 48-slot item array, add/remove/serialize methods, and event emission.
2. `VaultUI` overlay — two-column dialog (bag left, vault right) following the same overlay pattern as InventoryUI. Full keyboard, gamepad, and touch support with item tooltips and device-adaptive hints.
3. Hub integration — a decorative chest object on the west wall of the hub, proximity detection in Game.ts, and vault open/close lifecycle with auto-save on close.
4. Save/load support — extend SaveManager to persist vault items alongside inventory.

### Outcome
All four components implemented. VaultStorage class, VaultUI overlay, chest mesh in Hub, Game.ts integration with proximity detection, UI routing, overlay management, and save/load support. All quality gates pass (lint, format, typecheck, build, 451 unit tests).

### Notes
- The vault follows the same architectural patterns as the existing inventory system (event-driven, overlay-based UI, action-based input routing).
- Vault is only accessible in the Hub, not during dungeon runs, matching the design intent of a safe storage location.
- Save format remains backward-compatible — the vault field is optional in SaveData, so old saves load without issues.

---

## 2026-03-05 — Organize Planning Documentation

### Prompt
> Organize and clean up initial planning docs. Separate documentation by audience: player-facing docs (for people using the game, also useful for AI agents doing testing and troubleshooting) and developer-facing docs (for people building/changing software). Developer docs should organize project management pieces — what has been built, what is ready to build, and what needs more planning. Player docs help automate testing by giving agents guidance on expected behavior.
>
> Also want to capture AI session prompts as part of development history. Prompts inform plans, plans inform building, and all of this results in something used. Capturing initial prompts provides context for why something was built. Past prompts can be analyzed to improve future prompts — identifying where things were repeated, unclear, or lost in translation.

### Plan
Reorganize documentation into a `docs/` directory with two audiences:
- `docs/player/` — Player guide covering controls, mechanics, progression, and troubleshooting.
- `docs/development/` — Architecture overview, development roadmap (built/ready/needs-planning), session log for prompt capture, and a `plans/` subdirectory for detailed feature plans.

Move existing planning docs (PLAN.md, QUALITY_PLAN.md) into `docs/development/plans/`. Update CLAUDE.md with maintenance rules for keeping all docs current during sessions. Keep GAME_PLAN.md and CHANGELOG.md at the root as canonical reference documents.

### Outcome
Created the full documentation structure. See CHANGELOG.md for details.

### Notes
- The prompt covered a lot of ground in a single description — documentation organization, prompt capture philosophy, and workflow improvements. Breaking it into the audience-separation piece and the prompt-capture piece helped structure the work.
- The concept of prompts as a primary input to the software development lifecycle is captured in the session log template guidance, not just as a procedural step.

---

## 2026-03-05 — Settings Menu & Menu Button Support

### Prompt
> Work on the "Settings Menu" and "Menu Button Support" parts of the ROADMAP.md

### Plan
Implement both roadmap items together since they are closely related:
1. Add new input actions (`toggleMenu`, `tabLeft`, `tabRight`) to the action system with gamepad (Start, LB, RB) and keyboard (Escape) mappings.
2. Create `SettingsUI` with three options: camera mode (third-person/first-person), controller detection (auto/keyboard/gamepad), diagnostics overlay toggle.
3. Create `DiagnosticsOverlay` for real-time FPS and draw call display.
4. Extend `GameCamera` with a first-person mode.
5. Wire everything into `Game.ts`: Start/Escape opens settings as a pause menu, LB/RB cycles between inventory/skills/settings tabs, settings changes apply to camera and input systems.
6. Update `InputHints` with the new actions and gamepad control descriptions.

### Outcome
Both roadmap items implemented. Settings accessible via Start button or Escape key. First-person camera mode works. Diagnostics overlay toggles on/off. LB/RB cycles between menu tabs. All 451 unit tests pass. Lint, format, typecheck, and build all clean.

### Notes
- Combined Settings Menu and Menu Button Support into a single session since the Start button behavior is the entry point for the settings menu.
- The tab cycling works when any of the three overlays (inventory, skills, settings) is open, not just from a dedicated pause screen. This keeps the existing standalone overlay UIs intact while adding gamepad-friendly navigation between them.

## 2026-03-05 — Diagnostics Info Tab

### Prompt
> Work on the "Diagnostics Info Tab" part of the ROADMAP.md

### Plan
1. Create `DiagnosticsInfoUI` component following the same patterns as `SettingsUI` — modal overlay, show/hide/handleActions, input device awareness.
2. Display three sections: System (OS, browser, screen, viewport), Renderer (GPU, FPS, draw calls), Controller (active device, gamepad status).
3. Add `fps` and `drawCalls` getters to `DiagnosticsOverlay` so the info tab can read live performance data.
4. Integrate into `Game.ts`: add 'diagnostics' as 4th menu tab, wire up tab cycling, route actions, pause movement when open.
5. Export `detectOS()` and `detectBrowser()` as pure functions for unit testing.
6. Write unit tests for OS/browser detection and basic UI lifecycle.

### Outcome
Diagnostics Info Tab fully implemented. Menu system expanded from 3 to 4 tabs. 17 new unit tests added (468 total, all passing). Lint, format, typecheck, and build all clean.

### Notes
- iOS detection needed to be ordered before macOS in the user agent check since iOS UA strings contain "Mac OS X".
- `navigator.getGamepads()` doesn't exist in jsdom, so added a guard for the gamepad API availability.

## 2026-03-05 — Full Map Tab in Menu

### Prompt
> Work on the "Full Map Tab in Menu" part of the ROADMAP.md

### Plan
1. Create `MapUI` component (`src/ui/MapUI.ts`) following the same overlay pattern as `DiagnosticsInfoUI` — modal overlay, show/hide/handleActions, input device awareness.
2. Render the full revealed dungeon map on a canvas with zoom (1-8x tile size) and pan (arrow keys/D-pad) support.
3. Show discovery percentage (revealed non-empty tiles / total non-empty tiles).
4. Highlight key indicators: entrance (blue), exit (green), boss room outline (red), player position (blue dot) with a color legend.
5. Add getters to `Minimap` (`getRevealed()`, `getDungeon()`, `getPlayerTile()`) to share fog-of-war state with the map tab.
6. Integrate into `Game.ts`: add 'map' as 5th menu tab, wire up tab cycling, route actions, pause movement when open. Map tab only available in dungeon state.
7. Write unit tests for MapUI lifecycle and discovery percentage computation.

### Outcome
Full Map Tab fully implemented. Menu system expanded from 4 to 5 tabs. 8 new unit tests added (476 total, all passing). Lint, format, typecheck, and build all clean.

### Notes
- The map tab is only available when the player is in a dungeon. When tab-cycling reaches the map tab outside of dungeon state, it gracefully skips by setting `activeMenuTab = null`.
- Canvas `getContext('2d')` returns null in jsdom, so the `ctx` field was made nullable with early returns in drawing methods to handle test environments gracefully.

## 2026-03-06 — Inventory & Settings Mouse Interaction Fixes

### Prompt
> "There are some issues with the mouse and inventory where it doesn't seem to highlight or select the correct item."
> "Also it looks like in the settings menu if I pull that up I can't close it by clicking on the X with the mouse."

### Plan
1. Investigate inventory mouse handling — found that click/hover handlers in `InventoryUI` don't update `selectedColumn` or `selectedIndex`, so the highlight stays on the wrong item.
2. Investigate settings X button — found that `MouseProvider` maps left-click to `uiConfirm`, which triggers `cycleOption()` → `render()` in `SettingsUI.handleActions()`, destroying the X button DOM element before its `click` event fires.
3. Fix inventory: add `selectedColumn`/`selectedIndex` updates to mouseenter and click handlers for both equipment and bag items. Convert `for...of` to indexed loops to track positions.
4. Fix settings/all UIs: skip game action mapping in `MouseProvider` when the click target is inside `#ui-overlay`, since UI elements have their own DOM click handlers.

### Outcome
Both bugs fixed. Inventory highlight now follows the mouse correctly. Settings X button (and all UI close buttons) now respond to mouse clicks. All 476 unit tests pass, lint/typecheck/build clean.

### Notes
- The root cause of the settings bug affects all menu UIs, not just settings — any UI that re-renders its DOM in response to `uiConfirm` would have the same broken close button. The fix in MouseProvider addresses this class of bugs globally.
- The inventory fix required changing `for (const item of bag)` to `for (let bagIdx = 0; ...)` to have index access in closure-captured event handlers.

## 2026-03-06 — Unified Menu Tab Bar & ESC Key Fix

### Prompt
> "I don't see any control information for opening the settings, I can't see any map, and the esc key seems like it may be mapped for multiple UI actions where I can't use it to close the settings dialog, and if I have some other dialog open it opens the settings page without closing whatever dialog I have open."
> "I don't think I'm seeing any main menu where I could switch between tabs in a single unified menu dialog to show diagnostics info, a few setting controls, map, skills, and inventory that I can switch between tabs."

### Plan
1. Investigate the ESC key conflict — found that ESC maps to both `uiCancel` and `toggleMenu`. When pressed with a menu open, `routeUIActions` fires `uiCancel` (closing the panel), then `handleUIToggle` sees `toggleMenu` with nothing open and reopens Settings. Fix by removing `uiCancel` from ESC.
2. Add a visual `MenuTabBar` component that renders clickable tabs at the top of the screen when any menu panel is open.
3. Add keyboard bindings for tab cycling (`[`/`]`) and map toggle (`M`), since these were previously gamepad-only.
4. Add `toggleMap` input action so M key opens the Map tab directly.
5. Update `handleUIToggle` so ESC closes all overlay types (including Floor Select and Library Dialog) and opens Inventory as the default tab instead of Settings.
6. Make tab cycling skip disabled tabs (e.g., Map when not in dungeon).

### Outcome
All issues fixed. ESC now cleanly opens/closes the menu without conflicts. Visual tab bar shows at top of screen with all 5 tabs. Keyboard users can cycle tabs with `[`/`]` and open Map with `M`. Lint, typecheck, and build all clean.

### Notes
- The ESC double-action was a subtle frame-ordering bug: `routeUIActions` ran before `handleUIToggle`, so the panel's `uiCancel` handler closed it before `toggleMenu` could detect it was open. Removing `uiCancel` from ESC is clean because gamepad B (which fires `uiCancel`) is a separate button from Start (which fires `toggleMenu`).
- Changed default menu tab from Settings to Inventory since it's the most commonly needed panel.
- Made `FloorSelectUI.cancel()` public so `handleUIToggle` can close it via ESC.

---

## 2026-03-06 — Fix Inventory Tooltip Hover Jitter

### Prompt
> "The mouse correctly highlights an item now but because an item's description may be longer than another the window resizes and causes the mouse cursor to hover over a different item and it jitters back and forth between two items. Maybe the dialog needs to have a fixed upper bound or something so that what the cursor hovers over doesn't move."

### Plan
1. Identify root cause: the tooltip panel below the inventory/vault item list has dynamic height based on content. When hovering changes the selected item, the tooltip content changes, the panel resizes, items shift vertically, and the cursor lands on a different item — creating a jitter loop.
2. Fix: give the tooltip panel a fixed `height` (6rem) with `overflowY: auto` so it never causes layout reflows regardless of content length.
3. Apply the same fix to both `InventoryUI.ts` and `VaultUI.ts`.

### Outcome
Fixed in both InventoryUI and VaultUI. The tooltip panel now has a fixed height of 6rem with scrolling for longer tooltips, preventing any layout shift when hovering between items.

### Notes
- Simple CSS-only fix — no logic changes needed. The root cause was purely a layout reflow issue.

---

## 2026-03-06 — Fix Tab Switching Keyboard Hints

### Prompt
> "In the main menu it seems to indicate the `/` key could switch tabs but the `/` key doesn't do anything. I also noticed that while inventory and skills list some kind of letter to open them the settings and diagnostics tab doesn't... I don't think the individual dialogs need a special key to open them if the main menu can switch to any of the menu tabs (but we need tab switching to work properly with the keyboard)."

### Plan
1. Fix the ambiguous hint text `[ / ]: switch tab` which looks like `/` is the shortcut — change to `[ and ]: switch tab` to clearly indicate the bracket keys.
2. Remove per-tab shortcut key labels (e.g. `Inventory [I]`) from the tab bar buttons since they were inconsistent (only some tabs had them) and redundant with bracket-key tab cycling.
3. Keep the underlying I/K/M quick-open keyboard shortcuts functional — they're still useful for opening a specific tab directly from gameplay.

### Outcome
Fixed hint text in `MenuTabBar.ts` and removed the `TAB_KEYS` constant and per-tab label rendering. Updated player guide to remove the per-tab shortcut line from the tab switching instructions.

### Notes
- The actual `[` and `]` tab cycling worked correctly all along — the issue was purely a UX/hint text problem that made users think `/` was the key.

---

## 2026-03-06 — Balance Enemy Stats & Buff Regeneration

### Prompt
> "We need to make the bosses cause about half the damage as they currently do, but increase their health to about 150% of what it currently is. Also make the regular enemies have about twice as much health. Also double the regeneration rate skill and add a 3rd tier to regeneration."

### Plan
1. Double `ENEMY_HP` constant (40→80) for regular enemies.
2. Halve all boss `dmgMultiplier` values across 10 floors.
3. Multiply boss `hpMultiplier` values by 0.75 to compensate for the doubled base HP (net effect: 1.5x boss HP).
4. Double Regeneration's `hpRegen` per rank (0.5→1.0) and increase max rank from 2 to 3.

### Outcome
All changes applied to `constants.ts`, `FloorConfig.ts`, and `SkillTree.ts`. All 476 unit tests pass. Build and lint clean.

### Notes
- Since both enemies and bosses derive HP from the shared `ENEMY_HP` constant, boss `hpMultiplier` values were adjusted by ×0.75 so the net effect (2 × 0.75 = 1.5) yields 150% boss HP as requested.

---

## 2026-03-06 — Fix Description Overflow & Vault Hover Tooltips

### Prompt
> "Some items have a longer description that doesn't fit in the box. It would be fine if it auto-sized as long as the dialog only expanded downward. Also vault item hover doesn't display descriptions."

### Plan
1. Change the tooltip panel from fixed `height: 6rem` to `minHeight: 3rem` with no max height, allowing it to grow downward to fit content.
2. Add selection tracking to the vault's `mouseenter` handler so hovering updates `selectedColumn`/`selectedIndex` and triggers `updateSelectionHighlight()` which updates the tooltip.

### Outcome
Fixed tooltip sizing in both InventoryUI and VaultUI to auto-expand downward. Added mouse hover selection tracking to VaultUI's `createItemRow` method, matching the pattern already used in InventoryUI.

### Notes
- The previous fix (fixed-height tooltip to prevent jitter) was correct for the upper portion of the UI where hovering items are located. The tooltip sits below all hoverable items, so expanding it downward doesn't cause the jitter loop.

---

## 2026-03-07 — Meta Quest 2 WebXR Support Plan

### Prompt
> "Can we build a development plan for supporting running the game immersively on a Meta Quest 2? I can open the game in a web browser on the Quest 2 and play it, but it wasn't detecting the controls as gamepad controls — it ended up treating them like touch controls on the web page. Right now in the browser it just shows up like a panel window rather than some immersive experience. I would like to know how to make it so the player can enter the game so that looking around in VR would look around in the 3D game. How would we detect if someone is using VR and support the controls better?"

### Plan
Created [quest-2-webxr.md](plans/quest-2-webxr.md) — a 5-phase plan covering:
1. **Immersive rendering** — Enable `renderer.xr`, VRButton, camera rig for head tracking
2. **XR controller input** — New `XRControllerProvider` using WebXR Gamepads Module (explains why standard Gamepad API doesn't see Quest controllers)
3. **VR comfort** — Snap/smooth turning, vignette, teleport movement, scale calibration
4. **VR UI** — Three options analyzed: DOM Overlay API (simplest), 3D world-space UI (most immersive), hybrid (recommended)
5. **VR gameplay enhancements** — Motion-controlled combat, hand tracking, spatial audio (stretch goals)

### Outcome
Plan document created with architecture analysis showing the existing codebase is well-suited for VR (ActionManager provider pattern, camera mode system, device-agnostic game logic). Includes technical explanation of why Quest controllers only work through WebXR sessions, not the standard Gamepad API. Updated roadmap with plan link.

### Notes
- The user's observation that Quest controllers are treated as "touch controls" is expected — Quest browser translates controller input into touch/pointer events for non-XR pages. The WebXR Gamepads Module is the only way to get proper button/axis input from Quest controllers.
- Minimum viable VR is Phases 1 + 2 + DOM Overlay (Phase 4 Option A), which would be the least development effort for a playable VR experience.
- Performance should be achievable — the game already targets 60 FPS on Chromebooks with instanced voxel rendering, and Quest 2 needs 72 FPS.

---

## 2026-03-07 — Further Damage Balance Pass

### Prompt
> "Let's reduce the boss attack damage by about half again... it seems to be too powerful right now, but make regular enemies deal about twice as much damage."

### Plan
1. Double `ENEMY_ATTACK_DAMAGE` from 10 to 20 (doubles regular enemy damage).
2. Quarter all boss `dmgMultiplier` values across 10 floors (halved for the nerf + halved again to compensate for the doubled base constant, yielding a net 50% reduction in boss damage).

### Outcome
Updated `constants.ts` and `FloorConfig.ts`. Type check, lint, and build all pass.

### Notes
- Since both enemies and bosses share the `ENEMY_ATTACK_DAMAGE` base constant, boss multipliers were divided by 4 (not 2) to achieve the net halving after the base was doubled.

---

## 2026-03-07 — Character Model System & Vox-to-GLB Pipeline

### Prompt
> "I have added a couple character 3d models to the `assets/characters` directory in the repo. I was told that I could use v-optimizer and gltfpack to convert the vox files to a more optimized glb format so that it would perform well in the three.js game... I would like to use the owl.vox as the model for the primary player character for now, but I would like something in the setting menu where I can switch between the current simple model and the assets/characters/owl optimized model."

The user also asked about storing .vox files in the repo vs committing .glb files, and whether CI conversion could be cached efficiently.

### Plan
1. Create a conversion script (`scripts/convert-models.sh`) with MD5-based skip logic.
2. Create a GitHub Actions workflow with cache keyed on .vox file hashes — unchanged models skip conversion entirely.
3. Build a `CharacterModelLoader` module using Three.js GLTFLoader with async loading, caching, and graceful fallback.
4. Modify `Player.ts` to support swapping between the simple box geometry and loaded GLB models.
5. Add a "Character" setting to `SettingsUI` with options "Simple" and "Owl (Voxel)".
6. Wire the setting through `Game.ts` `applySettings`.

### Outcome
All code implemented. Lint, format, typecheck, build, and 476 unit tests pass. The .glb files are not yet generated (requires running the conversion script with v-optimizer and gltfpack installed, or triggering the CI workflow). The code gracefully falls back to the simple model if the .glb file is not found.

### Notes
- The CI workflow (`convert-models.yml`) is manual-dispatch for now, since model conversion is infrequent.
- The v-optimizer and gltfpack download URLs in the workflow are placeholders — they will need to be updated to match the actual release artifacts for those tools.
- An alternative approach (committing pre-built .glb files alongside .vox sources) may be simpler if the team prefers fewer CI dependencies.

---

## Session — 2026-03-07: Fix Owl Model Loading & Add Model Gallery

### Prompt
> "I reloaded the game with the latest version where I was expecting to see the owl model loaded for the main character, but it looks like it defaults to the simple model, and when I tried switching to the owl for the main character and escaped out of the setting dialog nothing changed with the character. How can I confirm the owl model loaded properly... could we add the simple player character model and the owl model in the library somewhere so that I could preview both of them and confirm that the owl model actually loaded and renders as well."

### Plan
1. Diagnose why the owl model doesn't load — the `.glb` file was never generated, so the loader silently failed.
2. Write a runtime `.vox` file parser (`VoxLoader.ts`) that can load MagicaVoxel files directly without the conversion pipeline.
3. Update `CharacterModelLoader` to try `.glb` first, then fall back to `.vox`.
4. Copy `.vox` source files to `public/assets/characters/` so they're served at runtime.
5. Create a standalone model gallery page (`model-gallery.html`) with split viewports showing both Simple and Owl models side-by-side with orbit controls and load status.
6. Optimize bundle chunking so Three.js is shared across entry points.

### Outcome
All code implemented. The owl model now loads from the `.vox` file at runtime. The model gallery page at `/model-gallery.html` shows both models side-by-side with auto-rotation, drag-to-orbit, and status indicators showing whether each model loaded successfully and from which format. Lint, format, typecheck, and build all pass.

### Notes
- The `.glb` conversion pipeline still exists but is no longer required — the runtime `.vox` loader serves as a reliable fallback.
- The VoxLoader uses neighbor-based face culling and merged BufferGeometry with vertex colors for good performance.
- Previous session noted the `.glb` files weren't generated — this was the root cause of the user's reported issue.

---

## Session: 2026-03-07 — Add Favicon

### Prompt
> "When the GitHub Pages site is built and I visit it I also get a 404 error when any browser attempts to download the favicon.ico. Can we get a simple icon with the two letters RP as the contents of the icon."

### Plan
1. Generate a 32x32 `.ico` file with "RP" in gold on dark purple background.
2. Create an SVG version for better quality in modern browsers.
3. Add `<link>` tags to `index.html` referencing both formats.
4. Place both files in `public/` so Vite copies them to `dist/`.

### Outcome
Both `public/favicon.ico` and `public/favicon.svg` created. `index.html` updated with `<link rel="icon">` tags for SVG (preferred) and ICO (fallback). Vite build confirms both files are copied to `dist/`.

### Notes
- SVG favicon uses text rendering so it looks crisp at any size.
- ICO uses a programmatically drawn bitmap for maximum compatibility with older browsers.

---

## 2026-03-07 — Asset Pipeline Overhaul & Diagnostics

### Prompt
> "I am getting a 404 when switching to the owl character model for the .glb file... the owl.vox appears to be the one being used which is much less performant than loading a converted .glb file. The issue is how GitHub Actions builds the GLB assets and makes sure those optimized assets are the ones being used."
>
> "PR 86 was an initial attempt to get the github actions fixed so that the GLB file would be built and loaded with GLTFLoader correctly. Instead those efforts were avoided and duplicate files were made and VoxLoader was used instead bypassing the use of GLTFLoader."
>
> "I don't want to use VoxLoader, I want to use the optimized models with GLTFLoader. I want to try to prevent this kind of issue in future Claude Code sessions, and improve the ability to diagnose issues."
>
> Also requested all 5 recommended improvements: error logging on loadGlb, post-deploy smoke test, build-time asset manifest check, runtime asset health report, CI integration for convert-models.

### Plan
1. Remove duplicate `.vox` files from `public/assets/characters/` (keep only source in `assets/characters/`).
2. Integrate model conversion (`.vox` → `.glb`) directly into `deploy.yml` with caching, so `.glb` files are always available in production.
3. Add `verify-assets.mjs` — pre-build script that checks every `.vox` source has a corresponding `.glb` output.
4. Add `verify-build-assets.mjs` — post-build script that scans source code for asset path references and verifies they exist in `dist/`.
5. Add post-deploy smoke test that curls key asset URLs after GitHub Pages deployment.
6. Fix `CharacterModelLoader` to log loud errors on GLB failure, restrict VoxLoader to dev-only fallback, and fail loudly in production.
7. Add runtime asset health report (dev mode console table of all assets and their HTTP status).
8. Add comprehensive "Asset Pipeline" section to `CLAUDE.md` with explicit rules preventing future sessions from bypassing GLTFLoader.

### Outcome
All 8 items implemented. Deploy workflow now includes model conversion, three layers of asset verification (pre-build, post-build, post-deploy), and CLAUDE.md has guardrails to prevent the VoxLoader bypass pattern from recurring. All quality gates pass (lint, format, typecheck, build).

### Notes
- **Root cause analysis**: PR 85 set up the GLB pipeline correctly, but the conversion never ran during deploy (it was manual-dispatch only). PR 86 worked around the missing GLB by duplicating `.vox` into `public/` and adding VoxLoader fallback — a well-intentioned but misguided fix that masked the real problem.
- **Key lesson for future prompts**: When an asset fails to load, the fix should address the pipeline (why wasn't the asset generated?), not add a fallback loader. The CLAUDE.md rules now make this explicit.
- **Three layers of defense**: (1) `verify-assets.mjs` catches missing `.glb` before build, (2) `verify-build-assets.mjs` catches missing assets in `dist/`, (3) post-deploy smoke test catches 404s on the live site.
- VoxLoader was subsequently removed entirely — GLTFLoader is the only model loader. No fallback.
- The deploy workflow failed on merge because `convert-models.sh` referenced tools (`nicholasgasior/v-optimizer`, `nicholasgasior/gltfpack`) at GitHub URLs that don't exist. These were placeholder URLs from the original session that were never validated. The fix was to rewrite the conversion as a self-contained Node.js script (`convert-models.mjs`) using `@gltf-transform/core`, eliminating all external tool dependencies.

---

## 2026-03-08 — Fix Boss Hitbox Scaling

### Prompt
> "It seems like the hit box when attacking one of the boss characters is very small and I have to push into the enemy in order for it to register a hit, rather than when the area of attack ends up intersecting with the edge of the boss character's model. It seems like the hit box might not have scaled with the size of the boss."

### Plan
1. Diagnose the hit detection code in `CombatSystem.ts` — found that `tryHitTarget` checks distance to the target's center point against `PLAYER_ATTACK_RANGE` (1.2) without accounting for the target's `collisionRadius`.
2. For regular enemies (radius 0.2–0.35), this is barely noticeable. For bosses (scale 2.2–3.0, radius 0.66–0.90), the player must push deep into the model to reach within 1.2 of center.
3. Fix `tryHitTarget` to subtract the target's `collisionRadius` from the distance, so hits register at the model edge.
4. Apply the same fix to `findNearestTarget` for consistent auto-facing behavior.

### Outcome
Fixed in `CombatSystem.ts`. Both `tryHitTarget` and `findNearestTarget` now compute effective distance as `max(0, dist - collisionRadius)`, meaning player attacks connect when reaching the edge of any enemy model. Build passes.

### Notes
- The bug existed since bosses were introduced — regular enemies were too small for it to be noticeable.
- The fix is target-size-aware, so it automatically scales correctly for all enemy types (regular, captain, boss) without needing separate logic per type.

---

## 2026-03-08 — Fix Touch Inventory Item Action Menu

### Prompt
> "It doesn't seem possible to use a health potion using touch controls, and using touch controls it is very difficult to hit the x to attempt to destroy an item in the inventory. If an item is selected with touch controls can we present a simple menu dialog to allow them to choose which action they want to do with the item?"

### Plan
1. Investigate why the existing touch-friendly `ItemActionDialog` (Use/Equip/Drop/Cancel) wasn't appearing when tapping inventory items on touch devices.
2. Root cause: `TouchProvider.onWindowTouchStart` only set `_active = true` for joystick touches on the game canvas and button element touches. Touches on UI elements (like inventory rows) were filtered out by the `isGameArea` check, so the provider was never marked active for those touches.
3. Meanwhile, the browser fired synthetic mouse events for the touch, which made `MouseProvider._active = true`, switching `primaryDevice` from `'touch'` to `'keyboard'`.
4. With `inputDevice === 'keyboard'`, `InventoryUI`'s click handler skipped the action dialog and fell through to the keyboard/mouse path (click = equip only, right-click = use, shift+click = drop — none of which work on touch).
5. Fix: move `this._active = true` to the top of `onWindowTouchStart`, before the per-touch filtering loop, so any touch on the screen keeps the provider active for device detection purposes.

### Outcome
One-line fix in `TouchProvider.ts`. The `ItemActionDialog` now reliably appears when tapping inventory items on touch devices, providing Use, Equip, Drop, and Cancel buttons in a large, touch-friendly modal.

### Notes
- The `ItemActionDialog` component was already fully implemented and wired up — the bug was purely in device detection, not in the dialog itself.
- The ActionManager's device priority (`touch > gamepad > keyboard`) ensures that even if synthetic mouse events fire alongside real touches, touch wins as long as the provider is marked active.

---

## 2026-03-11 — Add Owlbear as Selectable Player Character

### Prompt
> "Can we make the owlbear 3d asset model an option to change the player character to, just like the owl model?"

### Plan
1. Add `'owlbear'` to the `CharacterModelId` type union and `MODEL_PATHS` in `CharacterModelLoader.ts`.
2. Add owlbear to the character cycling array in `SettingsUI.ts` and add a display label.
3. Update the Asset Library pedestal status from "Coming soon" to "Available".
4. Update player guide and changelog.

### Outcome
Owlbear is now selectable in Settings → Character alongside Simple and Owl. The `.vox` source file already existed; the conversion pipeline generates the `.glb` at build time. The Asset Library now shows "Available" for the owlbear pedestal.

### Notes
- The owlbear `.vox` file, display mesh, and asset health report entry already existed from previous sessions — only the selection wiring was missing.
- No new assets or conversion pipeline changes needed.

---

## 2026-03-12 — Fix Player Models in Asset Library

### Prompt
> "There are some odd player models in the library and they don't look anything like the 3d asset models that are converted into glb files. The simple player model also doesn't look the same."

### Plan
1. Identify that the Asset Library used hand-built procedural display meshes (`buildOwlDisplayMesh`, `buildOwlbearDisplayMesh`) instead of the actual `.glb` models from the conversion pipeline.
2. Replace the procedural meshes with async-loaded `.glb` models via `CharacterModelLoader`, using the same scaling logic as `Player.setCharacterModel`.
3. Remove the ~190 lines of unused procedural mesh builder code.
4. Keep the simple box model as-is (it IS the canonical simple model).
5. Fall back to the simple box if `.glb` loading fails (pipeline not run).

### Outcome
The Asset Library now loads and displays the actual `.glb` voxel models for Owl and Owlbear on their pedestals. The pedestals show fallback meshes immediately while the `.glb` files load asynchronously, then swap in the real models once loaded. Removed `buildOwlDisplayMesh()` and `buildOwlbearDisplayMesh()` (~190 lines of procedural geometry).

### Notes
- The root cause was that the library was built with geometric approximations before the `.glb` pipeline was fully in place, and they were never replaced once the pipeline started working.
- The async swap pattern (place fallback → load `.glb` → swap on pedestal) avoids blocking the library construction and gracefully handles missing `.glb` files.

## 2026-03-12 — Fix Library Exit Position

### Prompt
> "When I exit the library I don't enter the hub where I exited it to go into the library, it puts me directly in the middle of the hub. I would like to see exiting one room to connect to the entrance of the other and vice versa."

### Plan
1. Add optional spawn position parameters to `enterHub()` so callers can specify where the player should appear.
2. Update `exitLibrary()` to pass the library door coordinates (offset slightly inward) so the player appears near the library entrance on the hub's east wall.
3. Update the dungeon exit to pass the portal coordinates so the player appears near the portal after ascending.
4. Default to center (0, 0) for other cases (death respawn, win screen, menu load).

### Outcome
`enterHub()` now accepts optional `spawnX`/`spawnZ` parameters. Exiting the library places the player at `(libraryDoor.x - 1.5, libraryDoor.z)` — just west of the library door, facing back into the hub. Returning from a dungeon places the player at `(portal.x, portal.z + 1.5)` — just south of the portal. All other hub entries (death, win, menu) still default to center.

### Notes
- The fix was minimal: one signature change and two call-site updates. No new systems or abstractions needed.
- The offset values (-1.5 for library, +1.5 for portal) were intended to keep the player outside the auto-enter proximity threshold, but the library door trigger radius is 2.5 and 1.5 < 2.5, causing an immediate re-entry loop. Fixed in a follow-up by increasing the library exit offset to 3.0.

## 2026-03-12 — Fix Library Exit Re-entry Loop

### Prompt
> "Now that we tried to get some improvements to entering and exiting the library from the hub it seems that there is a bit of an issue with moving between them where if I try to exit the library it just pushes me back into the library."

### Plan
1. Identify why exiting the library immediately re-triggers entry.
2. The exit teleports the player to `libraryDoor.x - 1.5 = 7.0`, but the entry trigger checks `isNear(libraryDoor.x, libraryDoor.z, 2.5)` — distance 1.5 < 2.5, so it fires immediately.
3. Increase the exit offset from 1.5 to 3.0 so the player spawns at 5.5, which is 3.0 units from the door (safely beyond the 2.5 trigger radius).

### Outcome
Changed the library exit spawn offset from `-1.5` to `-3.0` in `exitLibrary()`. Player now appears at `x = 5.5` after exiting the library, which is outside the 2.5-unit auto-enter trigger radius. Still well within hub bounds (`[-7.5, 7.5]`).

### Notes
- Root cause was a math oversight in the previous session: the exit offset (1.5) was smaller than the entry trigger radius (2.5).
- Single-line fix in `Game.ts`.

---

## 2026-03-12 — GitHub Actions Node.js 24 Migration

### Prompt
> "I noticed a warning on the GitHub Action deploy to GitHub Pages job build: Node.js 20 actions are deprecated. The following actions are running on Node.js 20 and may not work as expected: actions/cache@v4, actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02."

### Plan
1. Update `actions/cache@v4` → `@v5` (runs on Node.js 24 natively) in deploy.yml and convert-models.yml.
2. For `upload-pages-artifact@v4` (no v5 available yet), add `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` env var.
3. Update `node-version` from 20 to 22 (current LTS) across all workflows since Node 20 EOL is April 2026.

### Outcome
Updated all 5 workflow files. `actions/cache` upgraded to v5 in 2 workflows. Node.js build version updated from 20 to 22 in all workflows. Added Node 24 force flag for upload-pages-artifact.

### Notes
- `actions/upload-pages-artifact` has no v5 yet — it's a composite action that internally pins `actions/upload-artifact` to a Node 20 SHA. The `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` env var is the recommended workaround until upstream releases an update.
- `actions/upload-artifact@v7` (used in quality.yml) and `actions/github-script@v8` were already on recent versions and didn't need changes.

---

## 2026-03-12 — Fix CI Test Results Artifact Upload Warning

### Prompt
> "I noticed a warning on the GitHub Action quality job E2E Tests (Functional): No files were found with the provided path: test-results/. No artifacts will be uploaded. Is this an issue that should be addressed?"

### Plan
1. Diagnose why `test-results/` doesn't exist — Playwright only creates it when there are artifacts (screenshots on failure, traces on retry).
2. Change `if: always()` to `if: failure()` for the functional E2E upload step, since artifacts only matter when tests fail.
3. Change `if: always()` to `if: steps.visual.outcome == 'failure'` for the visual regression upload step, matching the condition already used for the PR comment step.

### Outcome
Updated both artifact upload conditions in `quality.yml`. The warning will no longer appear on passing test runs.

### Notes
- This was a cosmetic issue — the warning didn't cause job failures — but it added noise to CI logs and could mask real upload issues.

---

## 2026-03-13 — Fix Remaining Node.js 20 Deprecation Warnings in Deploy Workflow

### Prompt
> "I'm seeing a couple other warnings from GitHub Actions... Node.js 20 actions are deprecated: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 [in build job] and actions/deploy-pages@v4 [in deploy job]."

### Plan
1. The previous fix added `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` at the step level for `upload-pages-artifact`, but it didn't propagate to its internal `upload-artifact` composite dependency.
2. Move the env var from step-level to job-level for both `build` and `deploy` jobs, ensuring all actions (including transitive dependencies) run on Node.js 24.

### Outcome
Set `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` at the job level for `build` and `deploy` jobs in `deploy.yml`. Removed the redundant step-level env from `upload-pages-artifact`.

### Notes
- Root cause: step-level `env` doesn't propagate to composite action internals. Job-level `env` does.
- Both `upload-pages-artifact@v4` and `deploy-pages@v4` are at their latest major versions — no v5 exists yet for either.

---

## 2026-03-13 — Fix Asset Library Enemy/Boss Model Sizing

### Prompt
> "The enemy models in the library do not appear to match the size of the enemy characters on the floor levels. The floor level models look good, and I would like to see the models presented in the library to look the same as the ones on the floor levels. For some reason when switching to the GLB models in the library the boss characters seem especially tiny."

### Plan
1. Compare model scaling logic between `AssetLibrary._loadVoxelDisplayMesh()` and `Enemy.setModelStyle()` / `Boss.setModelStyle()`.
2. Identify that the library omits the `MODEL_SCALE_DEFAULT` multiplier applied in dungeon combat.
3. Add the missing multiplier to match in-game appearance.

### Outcome
Added `* MODEL_SCALE_DEFAULT` to the scale calculation in `AssetLibrary._loadVoxelDisplayMesh()` (line 718), matching the scaling formula used by `Enemy.ts` and `Boss.ts` in dungeon floors.

### Notes
- Root cause: The library normalized voxel models to entity dimensions (`targetDim / maxDim`) but omitted the `MODEL_SCALE_DEFAULT` (2.0x) multiplier that both `Enemy.setModelStyle` and `Boss.setModelStyle` apply. This made all library voxel models half their in-game size.
- Boss models appeared especially tiny because they had an additional `1/config.scale` normalization factor applied on top of the already-too-small base scale.

---

## 2026-03-14 — Fix undici Security Vulnerability (Issue #118)

### Prompt
> "When merging in the previous session's PR and GitHub Actions ran it hit another error on Security #118 [...undici 7.0.0 - 7.23.0, Severity: high...] Why wasn't this caught during checks at the PR... I don't like it passing checks before the merge, and then breaking AFTER it merged."

### Plan
1. Explain the root cause: `npm audit` queries a live advisory database — new CVEs published between the PR check and the merge run cause this discrepancy.
2. Run `npm audit fix` to update undici from 7.22.0 to a patched version.
3. Verify all quality gates pass.

### Outcome
Updated undici from 7.22.0 to 7.24.1 via `npm audit fix`, resolving all 6 high-severity advisories. All quality gates (lint, typecheck, build, tests) pass.

### Notes
- Root cause of the CI discrepancy: `npm audit` is non-deterministic across time — it queries npm's live advisory database. The undici CVEs were published after the PR's CI run passed but before the post-merge run on main.
- This is inherent to how `npm audit` works and cannot be fully prevented. The weekly scheduled security scan in `security.yml` provides a safety net for vulnerabilities disclosed between PRs.

---

## Session – 2026-03-14 (Boss Enemy Size Fix in Asset Library)

### Prompt
> "In the library I'm still seeing issues with the boss enemy characters being rendered very small and tiny in comparison to the other enemy characters. The boss enemy characters are intended to be the largest of enemy characters so this representation of the boss characters in the library not being the actual size they appear in the floor levels is an issue and bug I would like corrected."

### Plan
1. Investigate `buildBossDisplayMesh()` in `Boss.ts` — found line 647 normalizes boss scale to unit size with `group.scale.setScalar(1.0 / size)`.
2. Remove the normalization so bosses display at their actual dungeon scale (2.2–3.0), which is significantly larger than regular enemies (ENEMY_SIZE=0.5).

### Outcome
Removed the `group.scale.setScalar(1.0 / size)` normalization from `buildBossDisplayMesh()`. Boss enemies in the Asset Library now render at their full dungeon scale, correctly appearing as the largest enemy type.

### Notes
- The normalization was originally added to make all bosses "display at a consistent size" but this defeated the purpose — bosses should visually dominate regular enemies.
- A previous session (2026-03-13) partially addressed this by adding `MODEL_SCALE_DEFAULT` to GLB models, but the procedural geometry normalization remained.

---

## Session – 2026-03-14 (Auto-PR and Auto-Merge Workflow)

### Prompt
> "Is it possible to have a claude code session open a PR automatically when work in a session is done so that I don't have to initiate it myself and then wait for the CI operations on GitHub to run through before being able to again initiate a merge once checks have passed. I would like to be able to review both the description of what was done in a claude code session and know that all checks have passed correctly all at the same time."

### Plan
1. Add a "Session Completion" section to CLAUDE.md with standing instructions for every session to create a PR and enable auto-merge.
2. Document the required PR format, auto-merge command (`gh pr merge --auto --squash`), and rules.

### Outcome
Added a comprehensive "Session Completion" section to CLAUDE.md between "Git Workflow" and "CI/CD". The section includes step-by-step instructions, a standard PR body template, and rules ensuring every session ends with a PR and auto-merge armed.

### Notes
- The user's core pain point was a two-step review process: (1) discover PR exists, (2) wait for CI, (3) come back to merge. Auto-merge eliminates step 3.
- This is a process/instruction change only — no code changes required. The enforcement is via CLAUDE.md standing instructions, not a hook or automation script.
- GitHub repo settings must have "Allow auto-merge" enabled for the `gh pr merge --auto` command to work. This is a one-time admin setting.

---

## Session – 2026-03-14 (Switch Voxel Art Default)

### Prompt
> "I would like to switch to using the voxel art by default now in the game instead of the simple models."

### Plan
1. Change the default `characterModel` from `'simple'` to `'owl'` and `enemyModelStyle` from `'simple'` to `'custom'` in all three places where defaults are defined: `Game.ts`, `SettingsUI.ts`, and `CombatSystem.ts`.
2. Add startup initialization in the Game constructor to apply the voxel model settings immediately, since `applySettings()` was previously only called when the user changed settings via the UI.

### Outcome
Changed defaults in three files (`Game.ts`, `SettingsUI.ts`, `CombatSystem.ts`) and added two initialization calls in the Game constructor (`player.setCharacterModel()` and `combatSystem.setEnemyModelStyle()`) so the voxel art models load from the first frame. Players can still switch back to simple models via the Settings menu.

### Notes
- The `applySettings()` method was only triggered by the Settings UI callback, meaning the game would start with simple models regardless of the default values in `gameSettings`. Adding explicit init calls in `enterHub()` ensures the defaults are applied when gameplay starts.
- Model init was placed in `enterHub()` rather than the constructor to avoid triggering console errors during the menu screen, which would fail the E2E "no console errors during load" test.
- The CI quality workflow's E2E jobs were missing the `.vox` → `.glb` conversion pipeline step (present in deploy.yml but not quality.yml), causing missing model files in the test environment.
- The owl model was chosen as the default player character since it's the first voxel option in the character model cycle.

---

## Session – 2026-03-14 (Web Session Environment Guidance)

### Prompt
> "I am noticing repeating issues in claude code sessions and would like a plan for what to improve to prevent a claude code session from wasting effort trying to repeatedly perform actions across multiple sessions that are known not to work."
>
> User provided examples of sessions: (1) trying to use `gh` CLI, failing, attempting to install it, failing to authenticate, trying curl workarounds; (2) running build/lint before `npm install` and getting hundreds of "Cannot find module" errors; (3) attempting E2E tests without a browser.
>
> "Would it help future sessions to know that claude code is running in a web session and provide preemptive guidance for things that are not possible from the limitations of the web sessions?"

### Plan
Add a "Claude Code Web Session Environment" section to CLAUDE.md documenting hard constraints, and update three existing sections (Session Completion, Quality Gates, E2E Testing) to account for web session limitations. See [plans/session-planning-improvements.md](plans/session-planning-improvements.md).

### Outcome
1. Added new "Claude Code Web Session Environment" section after Development Setup — documents what doesn't work (`gh`, missing deps, E2E, interactive terminal), what does work, and a session startup checklist.
2. Updated Session Completion to gracefully handle missing `gh` CLI — push branch and report to user instead of attempting workarounds.
3. Added `npm install` as step 0 in the Quality Gates pre-commit checklist.
4. Rewrote E2E test guidance to lead with "cannot run in web sessions" instead of burying it.

### Notes
- The root cause was that CLAUDE.md was written assuming a fully-equipped local dev environment. All development actually happens in Claude Code web sessions with specific constraints.
- Three distinct failure patterns were identified from session logs: `gh` CLI loops, missing `node_modules` diagnosis, and E2E test attempts.
- The fix is preemptive documentation rather than code changes — giving the AI agent the right context upfront prevents wasted effort.

## 2026-03-14 — Skip CI checks for docs-only PRs

### Prompt
> "I'm noticing that on PRs where only Markdown files were changed, the PR is running through a bunch of checks for code file linting, type checks, code quality, unit tests, end to end, and visual regression checks... Can this be improved so that we aren't running tests for things that haven't changed."

### Plan
Add `paths-ignore` filters to the Quality and Security CI workflows so they don't trigger on changes to Markdown files, `docs/`, or `LICENSE`.

### Outcome
1. Added `paths-ignore` for `*.md`, `docs/**`, and `LICENSE` to both `push` and `pull_request` triggers in `.github/workflows/quality.yml`.
2. Added the same `paths-ignore` filters to `.github/workflows/security.yml` (schedule trigger unaffected — weekly audit still runs regardless).
3. Deploy workflow was already scoped to `push` on `main` only, so no changes needed there.

### Notes
- PRs that change both code and docs will still run all checks — `paths-ignore` only skips when *all* changed files match the ignored patterns.
- If branch protection requires specific check names to pass, those checks may need to be configured as "Required when present" rather than always required, so docs-only PRs aren't blocked by missing checks.

---

## Session: 2026-03-14 — Fix Asset Library room overlaps

### Prompt
> "I am seeing some issues in the library where the rooms are overlapping with other ones, specifically the room with all the enemy characters. There should not be any overlap of rooms, and likely should be a small margin between rooms. There should also be some amount of margin around the edge of rooms in the library so that all models on display in each room can be easily seen and not obscured by the walls."

### Plan
Analyze the `ROOM_BRANCHES` layout in `AssetLibrary.ts` to calculate actual room extents (X ranges) for rooms on the same side of the corridor. Fix overlaps by adding `roomCX` offsets to shift large rooms away from their connectors, extend the main corridor to accommodate shifted rooms, and increase room depth where assets were too close to walls.

### Outcome
1. Identified overlaps on the north side: Enemy room (26 wide, cx=31) overlapped NPC room (10 wide, cx=16.5) by 3.5 units, and overlapped Structure room (20 wide, cx=51) by 3 units. South side had Training room only 0.5 units from Player Characters room.
2. Added `roomCX` offsets: Enemies shifted to cx=37, Structures to cx=62, Training to cx=33. Asset placement automatically follows via `_getRoomCenter()`.
3. Extended main corridor from X=63 to X=74 to cover the shifted Structure room.
4. Increased Enemy room depth from 22 to 26 so the boss rows near the entry wall have 3+ units of clearance instead of 1.
5. All rooms now have at least 2 units gap between adjacent same-side rooms.

### Notes
- The `roomCX` field was already supported by the `RoomBranch` interface but unused — this was the intended mechanism for offset rooms.
- No asset placement code needed changes since `_getRoomCenter()` already uses `roomCX ?? connectorCX`.

---

## Session: 2026-03-14 — Fix enemy voxel model facing direction

### Prompt
> "When switching to the Voxel Art for enemy models I am noticing on the floor levels that enemy characters are actually facing the opposite direction when coming towards the player character."

### Plan
Investigate the enemy facing rotation formula and how it interacts with GLB voxel models vs. procedural box geometry. Fix the model orientation so voxel enemies face the player correctly.

### Outcome
1. Root cause: procedural enemy models have their front at -Z (eyes at `z = -size/2`), and the facing formula `Math.atan2(-dx, -dz)` is correct for that convention. GLB voxel models exported from MagicaVoxel have their front at +Z, causing them to face 180° away from the player.
2. Fixed by adding `group.rotation.y = Math.PI` to the loaded GLB model group in both `Enemy.ts` and `Boss.ts`, aligning the voxel model's +Z front with the procedural model's -Z front.
3. No changes to the facing-angle formula itself — the fix is isolated to model loading.

### Notes
- The player model doesn't have this issue because `Player.ts` uses a different rotation formula (`Math.PI / 2 - facingAngle`) that already accounts for the model orientation.
- The fix applies to the loaded model group (child of `this.mesh`), not to `this.mesh` itself, so it doesn't interfere with the per-frame rotation updates.
- A concurrent session (Asset Library room overlaps) was active at the same time, causing a merge conflict in SESSION_LOG.md. Resolved by rebasing and keeping both entries. Added a "Concurrent Sessions and Rebase Before Push" section to CLAUDE.md to prevent this in future sessions.

---

## 2026-03-14 — Move Controls & Objective to Menu Tab

### Prompt
> "Can we move the Controls and Objective information dialog to the main menu in its own tab, and replace it with a button in the upper right corner. The new button should contain the text 'menu' along with a hamburger menu icon of three stacked horizontal lines."

### Plan
1. Add `'controls'` to the `MenuTab` type and tab bar arrays.
2. Create a `ControlsUI` panel that displays the same controls list and objective content inside the menu panel style.
3. Replace `InstructionsPanel` (previously the always-visible controls/objective panel) with a compact hamburger menu button that opens the menu tab system.
4. Wire the new tab and button into `Game.ts` state management.

### Outcome
1. Created `src/ui/ControlsUI.ts` — new menu panel showing controls and objective info, device-aware.
2. Rewrote `src/ui/InstructionsPanel.ts` — now renders a "Menu" button with a three-line hamburger icon in the top-right. Clicking it opens/closes the menu tab system.
3. Updated `MenuTabBar.ts` — added `'controls'` tab between Map and Settings.
4. Updated `Game.ts` — added `controlsOpen` state, `controlsUI` instance, wired into `openMenuTab`, `closeAllMenuTabs`, `routeUIActions`, `handleUIToggle`, and all movement-blocking conditions.

### Notes
- The `InstructionsPanel` class name was retained to minimize import churn across the codebase, even though its role changed from information panel to menu button.

---

## 2026-03-14 — Boss Challenge Mode

### Prompt
> "I would like a new option presented on the level menu from the hub. For levels that have been completed I would like an option to retry fighting the boss character for a level without having to navigate through the entire level just to fight the boss again. I would like an option to enter the level at the exit point where the boss is as an optional entry point for a level that has already been cleared."

### Plan
1. Modify `FloorSelectUI` to detect completed floors (floor < maxUnlockedFloor) and show a sub-menu with "Full Floor" vs "Boss Challenge" entry options.
2. Add `bossOnly` parameter to `Game.enterDungeon()` — when true, spawn the player at the boss room edge instead of the entrance.
3. Add `bossOnly` parameter to `CombatSystem.spawnEnemiesForDungeon()` — when true, skip spawning regular enemies and only spawn the boss.
4. Mark completed floors with ★ in the floor list to hint at boss challenge availability.

### Outcome
1. `FloorSelectUI` — Added `FloorSelectResult` interface with `{ floor, bossOnly }`. Completed floors show ★ and trigger a sub-menu with "Full Floor" and "Boss Challenge" options. Full keyboard/gamepad/mouse support for the sub-menu. Frontier (current highest) floors skip the sub-menu.
2. `Game.enterDungeon()` — Accepts `bossOnly` flag. When true, computes spawn at boss room edge (corner of exit room) instead of entrance center.
3. `CombatSystem.spawnEnemiesForDungeon()` — Accepts `bossOnly` flag. When true, skips the regular enemy spawn loop while still spawning the boss.
4. Updated CHANGELOG, Player Guide (hub section + new Boss Challenge section), and this session log.

---

## 2026-03-15 — Fix blocked entrance to Dungeon Structures room

### Prompt
> "I noticed in the library that it is not possible to enter the room for all the structure models because the entrance is now blocked by the expanded enemy room (that claude code performed recently). I would like this corrected and some thought put into why this happened in the first place and how to prevent this issue from occurring again (by claude code) in the future."

### Plan
1. Trace the geometry of the ENEMIES room wall and STRUCTURES connector corridor to identify exactly how the entrance is blocked.
2. Fix the root cause by realigning the STRUCTURES connector with its room center.
3. Add a validation function that catches connector/room misalignment and wall/connector overlap at startup.

### Root Cause Analysis
The previous session (d02c2ee "Fix Asset Library room overlaps") added `roomCX` offsets to shift room centers away from connector positions, preventing room-to-room overlaps. However, it did **not** move the `connectorCX` for the Structures room along with its `roomCX`. This created two problems:
1. **Enemy room wall blocked the connector** — The Enemy room (x=[24, 50]) has its east wall at x≈50.5. The Structures connector (centered at x=51, width 3) runs through x=[49.5, 52.5], directly colliding with that wall.
2. **Connector gap misaligned with room entrance** — The Structures room (centered at x=62, width 20) spans x=[52, 72], but the connector gap was at x=[49.5, 52.5]. Only 0.5 units of the gap overlapped the room, leaving the entrance wall nearly solid.

**Why it wasn't caught**: No validation existed to verify that connector gaps fell within room bounds or that room walls didn't overlap connector corridors. The overlap fix was tested visually for room-to-room overlap but not for entrance accessibility.

**Prevention**: Added `validateRoomBranches()` which runs at module load and logs console errors for (1) connector gaps outside room bounds and (2) room walls overlapping adjacent connector corridors. Future changes to room sizes or positions will trigger immediate warnings.

### Outcome
1. Moved STRUCTURES `connectorCX` from 51 to 62 to match the room center — connector is now fully inside the room and well clear of the Enemy room wall (12 units of separation).
2. Added `validateRoomBranches()` validation that catches both classes of layout errors at startup.
3. Updated CHANGELOG and this session log.

---

## 2026-03-16 — Add occlusion outlines for voxel art models

### Prompt
> "When on a floor level I am not seeing any kind of outline from characters that are hidden behind a wall when switching over to Voxel Art for enemy characters. I also noticed the player character also does not have an outline or something to represent where the player character is when hidden or obstructed by some structural aspect of the level."

### Plan
1. Identify why the existing `OcclusionOutline` system doesn't work with GLB models.
2. Fix all three character types (player, enemy, boss) to create new silhouettes when switching to GLB models.

### Root Cause Analysis
The `createOcclusionSilhouette()` system already works correctly for the simple (box) model style. However, when switching to custom (GLB/voxel art) models:
- **Enemy/Boss**: All `simpleChildren` are hidden (`child.visible = false`), which includes the silhouette mesh since it was added in the constructor and snapshotted into `simpleChildren`. No replacement silhouette was created for the GLB model.
- **Player**: `this.simpleSilhouette.visible = false` is explicitly set when switching to a GLB model, and again no replacement was created.

### Outcome
1. Added `loadedModelSilhouette` field to Player, Enemy, and Boss classes to track silhouettes created for GLB models.
2. After loading a GLB model, a new silhouette is computed from the model's bounding box using `createOcclusionSilhouette()` with the correct color (cyan for player, orange for enemies, red for bosses).
3. When switching back to simple models, the GLB silhouette is removed and the original simple silhouette is restored.
4. Updated CHANGELOG and this session log.

---

## 2026-03-17 — Shape-matching occlusion silhouettes for GLB models

### Prompt
> "The occlusions have been added but I'm seeing the simple model as the occlusion for the glb voxel models. Is there a way that we can produce an occlusion outline of the glb models that match the shape of the player and other characters so that it makes a bit more sense when displaying the occlusions."

### Plan
1. Create a new `createOcclusionSilhouetteFromModel()` function that builds the silhouette from the actual GLB model geometry instead of a bounding box.
2. Update Player, Enemy, and Boss to use the shape-matching function, with fallback to the box approach if merging fails.

### Outcome
1. Added `createOcclusionSilhouetteFromModel()` to `OcclusionOutline.ts` — traverses the GLB group's meshes, clones and merges their geometries (applying world transforms), scales slightly outward for the outline effect, and applies the same GreaterDepth occlusion material.
2. Updated Player.ts, Enemy.ts, and Boss.ts to prefer the shape-matching silhouette with a bounding-box fallback.
3. All quality gates pass (lint, format, typecheck, build, 476 unit tests).
4. Updated CHANGELOG and this session log.

---

## Session – 2026-03-17 (Resting Health Regeneration)

### Prompt
> "I would like to have a passive health regeneration to activate when the player character is resting, meaning they have not been moving for 15 seconds, and have been out of combat for 15 seconds. I would like this passive (resting health regen) rate to be about 4/health/second."

### Plan
1. Add constants: `RESTING_IDLE_TIME` (15s), `RESTING_COMBAT_COOLDOWN` (15s), `RESTING_REGEN_RATE` (4 HP/s).
2. Track idle time and out-of-combat time in `Player.ts` — reset idle timer on movement input, reset combat timer on damage taken or attack performed.
3. When both timers exceed their thresholds, apply resting regen at 4 HP/s using an accumulator (same pattern as the existing `hpRegen`).
4. Emit `playerRestingChanged` event for UI feedback; show "Resting" label above health bar.
5. Add unit tests with Three.js mocking.

### Outcome
1. Added three constants to `constants.ts` and corresponding logic in `Player.ts` — `idleTimer`, `outOfCombatTimer`, `restingRegenAccumulator`, and `_isResting` state with a public getter.
2. `takeDamage()` and attack input both reset `outOfCombatTimer`; movement input resets `idleTimer`; `resetHealth()` clears all resting state.
3. Added "Resting" label to `HealthBar.ts` that fades in/out via the `playerRestingChanged` event.
4. Created `tests/game/PlayerRestingRegen.test.ts` with 10 tests covering: constants, initial state, entering resting, movement interruption, damage interruption, regen rate, max HP cap, event emission, reset, and dead player.
5. All quality gates pass (lint, format, typecheck, build, 486 unit tests).
6. Updated CHANGELOG, player guide, and this session log.

## Session – 2026-03-17 (Fix GLB Occlusion Outline Sizing)

### Prompt
> User reported that GLB occlusion outlines are rendering many times larger than the actual character models, creating huge blue (player) and red (enemy) shapes that dominate the screen. Provided a screenshot showing the issue on Floor 6 - Toxic Sewers.

### Plan
1. Investigate `createOcclusionSilhouetteFromModel()` in `OcclusionOutline.ts` and how it's used in Player/Enemy/Boss.
2. Identify the coordinate space mismatch causing oversized silhouettes.
3. Fix the transform math so silhouettes match the rendered model size.

### Outcome
1. Root cause: `createOcclusionSilhouetteFromModel()` was inverting the model group's world matrix, transforming merged geometry into the group's local space (raw model coordinates). But the silhouette mesh was added to the parent container (`this.mesh`), which doesn't apply the model group's scale/position/rotation. Since GLB models have large raw coordinates that get scaled down by the group transform, the silhouette appeared massively oversized.
2. Fix: Changed the inverse transform to use `modelGroup.parent.matrixWorld` instead of `modelGroup.matrixWorld`. This preserves the group's local transforms (scale, position, rotation) in the baked geometry, so the silhouette correctly matches the rendered model size.
3. One-line change in `src/rendering/OcclusionOutline.ts` — all quality gates pass (lint, format, typecheck, build, 486 unit tests).
4. Updated CHANGELOG and this session log.

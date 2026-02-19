# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

- **Centralized floor count constant** — Introduced a `TOTAL_FLOORS` constant derived from the floor config array so that all UI displays (HUD, save slots, floor select, win screen) automatically reflect the correct number of floors. Fixed the HUD and menu save-slot displays which still showed "/5" instead of "/10".

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

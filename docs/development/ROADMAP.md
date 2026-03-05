# Development Roadmap

This document tracks what has been built, what is ready to be built next, and what ideas need further planning before they can be broken into actionable work.

For architecture details see [ARCHITECTURE.md](ARCHITECTURE.md). For detailed plans on specific features see the [plans/](plans/) directory.

---

## Completed

Everything below has been implemented, tested, and is live on the deployed game.

### Core Game (Milestones 1-6)

- **Hub & Movement** — Vite + TypeScript + Three.js scaffolding, hub scene with voxel geometry, player cube with WASD movement, isometric camera, portal interaction, game state machine (Menu / Hub / Dungeon).
- **Dungeon Generation** — Procedural room and corridor generation via Prim's MST, InstancedMesh voxel rendering, tile-based collision, fog-of-war minimap, floor selection UI, exit tiles.
- **Combat** — Real-time melee attacks with hit detection, enemy AI (patrol/chase/attack), health system with death/respawn, damage numbers, EventBus-driven combat events, invincibility frames.
- **RPG Systems** — XP/leveling, 3-branch skill tree (Warrior/Guardian/Scout) with multi-rank nodes, randomized loot drops with rarity tiers, inventory with 3 equipment slots + 24-slot bag, consumable potions with timed buffs, stat modifiers from equipment and skills.
- **Persistence & Polish** — localStorage save/load with 4 save slots, auto-save on hub return + every 30s, 10 floor themes with unique colors/lighting/fog, boss encounters on every floor with 5 special abilities, boss health bars, floor name HUD display, gamepad support.
- **Final Boss & Release** — Shadow Lord with invisibility ability, game completion tracking, win screen, 5 enemy types (grunt/brute/archer/mage/assassin) with captain variants, knockback system, configurable grid sizes (80-120 tiles), wider corridors, boss rooms, GitHub Pages deployment.

### Combat & Level Polish (Issues 6.1-6.5)

- **Bigger levels** — 4x dungeon area, wider corridors (3-4 tiles), larger rooms with pillars, dedicated boss rooms (16-24 tiles), occlusion silhouettes for player/enemies behind walls.
- **Combat improvements** — Auto-face enemies, solid enemy collision, hold-to-attack, boss difficulty overhaul (4x HP/damage, faster abilities, earlier enrage at 50% HP), 5 enemy types with captain variants.
- **Control support** — Full gamepad navigation for all UI screens (title, floor select, inventory, skill tree, death screen), keyboard accessibility for all menus, device-adaptive hint text, gamepad connection indicator.
- **Multiple save slots** — 4 save slots with selection UI, delete with confirmation, arrow key and D-pad navigation.
- **Inventory improvements** — Touch-friendly action dialogs, shift-click/right-click to drop with confirmation, device-adaptive hint text, item stats tooltip panel.

### Input System Overhaul

- **Action-based abstraction** — ActionManager replaced InputManager with semantic actions (attack, interact, toggleInventory, etc.) instead of raw key codes. Provider-based architecture (Keyboard, Mouse, Gamepad, Touch).
- **Touch support** — Virtual joystick for movement, on-screen action buttons, auto-detection, haptic feedback, responsive sizing.
- **UI migration** — All 6 UI overlays migrated from independent keydown listeners to action-based input routing via Game.ts.
- **Device detection** — Primary device tracking, device-adaptive HUD prompts, active device indicator, context-sensitive instructions panel.
- Detailed plan: [plans/input-abstraction.md](plans/input-abstraction.md)

### Quality Infrastructure (Phases 1-6)

- **Linting & Formatting** — ESLint v9 + Prettier, pre-commit hooks via Husky + lint-staged.
- **Unit Testing** — Vitest with 451 tests, 98% coverage, coverage thresholds enforced (80% lines, 80% functions, 70% branches).
- **E2E Testing** — Playwright with 23 tests, functional tests block merge, visual regression tests are non-blocking with diff artifact uploads.
- **Security** — Dependabot weekly updates, CodeQL analysis, npm audit, error overlays, localStorage hardening, gamepad graceful degradation.
- **CI/CD** — Consolidated quality workflow with job dependency graph, bundle size gate (5 MB), GitHub Pages deployment.
- Detailed plan: [plans/quality-roadmap.md](plans/quality-roadmap.md)

### Other Polish

- **Asset Library** — Hub room for inspecting all game assets on display pedestals with collision, item selection, and inspect dialogs.
- **Occlusion outlines** — Silhouettes for player/enemies behind walls using GreaterDepth rendering pass.
- **Build version display** — Version indicator on title screen.
- **Item Storage Vault** — 48-slot vault chest in the Hub for long-term item storage. Two-column UI for transferring items between bag and vault with full keyboard, gamepad, and touch support. Vault contents persist across saves.

### Settings Menu & Menu Button Support

- **Settings menu** — Settings panel accessible via Start (gamepad) or Escape (keyboard) with camera mode toggle (third-person/first-person), controller detection toggle (auto/keyboard/gamepad), and diagnostics overlay toggle (FPS + draw calls).
- **Menu button support** — Start button opens the pause/settings menu. LB/RB bumpers cycle between menu tabs (inventory, skill tree, settings) when any menu overlay is open. New `toggleMenu`, `tabLeft`, and `tabRight` input actions with keyboard and gamepad mappings.

### Diagnostics Info Tab

- **Diagnostics info tab** — Menu tab showing OS, browser, screen/viewport info, GPU name, live FPS/draw calls, active input device, and connected gamepad details. Accessible via LB/RB tab cycling (4th tab after Settings).

---

## Ready to Build

These items are well-defined enough to be picked up in a development session. They have clear scope and can be implemented without significant design decisions.

### Full Map Tab in Menu

An expanded map view accessible from the pause menu:
- Zoom in/out support.
- Percentage of map discovered.
- Key indicators: start position, exit, boss room, discovered collectables.

---

## Needs Planning

These are broader ideas that need further design discussion, breakdown into smaller tasks, or decisions on approach before they can be implemented. Each should eventually result in a detailed plan document in `plans/`.

### Narrative & Story

The game currently has no narrative. Design decisions needed:
- Theme and story arc for the 10 floors.
- Any NPC dialog or lore pickups.
- How story integrates with the existing Hub → Dungeon → Hub loop.
- Whether narrative affects gameplay or is purely atmospheric.

### Quest/Objective System

A quest board in the Hub with tasks and rewards:
- Quest types: defeat X enemies of type Y, defeat boss with specific equipment, collect specific items.
- Reward structure: XP, items, currency, skill points?
- UI for tracking active quests.
- How quests persist across sessions (save data integration).

This needs a design document covering quest data format, UI mockups, and how it interacts with existing event/save systems.

### Advanced Loot & Items

Several ideas need consolidation:
- **Level modifier collectables** — Items that make enemies harder or easier.
- **Minimap enemy indicators** — Collectable that shows colored dots for remaining enemies.
- **Hidden items per floor** — A randomly selected, hidden loot item on each generated floor.
- **Rare random drops** — Very low chance drops from any enemy.
- **More weapon variety** — Different attack animations/effects per weapon type, area-of-effect attacks, attack speed variation, lingering effects (poison, debuffs).
- **More potion types** — Timed buffs and bonus effect modifiers.
- **More inventory slots** — Purchasable with skill points as a separate upgrade.

Need to decide which of these to prioritize and design the mechanics for each.

### Hub Expansion

- **NPC vendors** — Merchant for buying/selling items. Currency system needed.
- **Upgrade stations** — Weapon/armor enhancement.
- **Cosmetic unlocks** — Visual customization for the player character.

Each of these needs its own design pass — what does the UI look like, what's the economy, how do prices scale?

### VR / WebXR Support

Support for Meta Quest 2 via WebVR/WebXR and VR controllers. This is a significant architectural change:
- Camera system rework for VR perspective.
- VR controller input provider (fits the existing ActionManager architecture).
- UI rendering in 3D space instead of DOM overlays.
- Performance implications on standalone VR hardware.

Needs a dedicated plan document with feasibility analysis.

### Sound & Music

No audio system exists yet. Decisions needed:
- Sound effects for combat, UI, environment.
- Background music per floor theme.
- Asset source: generated, licensed, or created.
- Audio engine: Web Audio API directly or a library.

### Fixed Room Objects

Rooms could contain non-hazard obstacles like furniture to navigate around. Need to define:
- Object types and visual styles per floor theme.
- Placement rules to ensure rooms remain navigable.
- Interaction model: purely decorative obstacles, or breakable/interactive?

### Multiplayer

Deferred for now. If pursued later, needs extensive design for:
- Networking architecture (WebRTC, WebSocket).
- Shared dungeon generation (seeded).
- Combat synchronization.
- Hub as shared space vs. instanced.

---

## Plan Documents

Detailed design documents for completed and in-progress features live in the `plans/` directory:

| Document | Status | Description |
|----------|--------|-------------|
| [input-abstraction.md](plans/input-abstraction.md) | Completed | Action-based input system with provider architecture |
| [quality-roadmap.md](plans/quality-roadmap.md) | Completed | 6-phase testing and quality infrastructure plan |

When a "Needs Planning" item above is ready for design, create a new plan document in `plans/` and link it here.

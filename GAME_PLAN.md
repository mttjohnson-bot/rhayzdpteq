# Game Plan

This document captures all design decisions and serves as the reference for building the game.

## Concept Summary

A browser-based 3D dungeon crawler RPG with a voxel art style. The player navigates procedurally generated dungeon floors from a top-down isometric perspective, fighting enemies in real-time action combat. Instead of descending into a dungeon, the player **ascends** — climbing upward floor by floor, defeating a boss on each level to unlock the exit to the next.

The game is built to run on modest hardware (Chromebooks) via modern browsers and will be hosted on GitHub Pages.

## Tech Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | TypeScript | Type safety, IDE support, excellent Three.js typings |
| 3D Engine | Three.js | Most popular browser 3D lib, huge community, lightweight |
| Bundler | Vite | Fast HMR, simple config, easy GitHub Pages deploy |
| Art Style | Voxel-based | Performant, procedurally friendly, distinctive look |
| Hosting | GitHub Pages | Free, integrates with repo, static site friendly |
| License | MIT | Open source |

## Core Design Decisions

### Camera & Perspective
- **Top-down isometric** (3rd person)
- Fixed-angle camera looking down at the player and surrounding dungeon
- Camera follows the player, keeping them centered

### Combat System
- **Real-time action combat**
- Direct control: move, attack, dodge/roll, block
- Responsive and snappy — prioritize game feel
- Enemies have telegraphed attacks with readable patterns

### Level Design
- **Procedural generation**
- Each floor is algorithmically generated with rooms, corridors, traps, and enemy placements
- Each floor ends with a boss room that gates progression to the next floor
- Floors should feel distinct as the player ascends (vary room density, enemy types, environmental elements)

### RPG Progression
- **Skill tree + loot system**
- **XP & Leveling:** Enemies and exploration grant XP. Level-ups grant skill points
- **Skill Tree:** Spend points on abilities and passive perks (e.g., stronger attacks, dash distance, health regen)
- **Loot:** Weapons, armor, and consumables found in chests and dropped by enemies
- Equipment has stats that affect gameplay (damage, defense, speed, etc.)

### Persistence
- **Persistent save** (not roguelike)
- Player saves progress between sessions
- Save data stored in browser `localStorage` (with potential IndexedDB upgrade later)
- Save includes: current floor, character stats, inventory, skill tree state, explored map data

### Input
- **Keyboard + mouse** (primary)
- **Gamepad** support (secondary)
- WASD movement, mouse for camera/aim, click to attack
- Gamepad: left stick move, right stick aim, buttons for actions

### MVP Scope
- **5 procedurally generated floors + final boss**
- Story/narrative to be determined later — focus on mechanics first
- Each floor introduces at least one new enemy type or mechanic

## Architecture Overview

### Planned Project Structure

```
/
├── index.html              # Entry point
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
├── CLAUDE.md               # AI assistant guidance
├── GAME_PLAN.md            # This file
├── LICENSE                 # MIT License
├── src/
│   ├── main.ts             # App entry — init engine, load scene
│   ├── game/
│   │   ├── Game.ts         # Core game loop and state machine
│   │   ├── Player.ts       # Player entity, stats, inventory
│   │   ├── Camera.ts       # Isometric camera controller
│   │   ├── InputManager.ts # Keyboard, mouse, and gamepad input
│   │   └── SaveManager.ts  # Save/load to localStorage
│   ├── combat/
│   │   ├── CombatSystem.ts # Hit detection, damage calculation
│   │   ├── Enemy.ts        # Base enemy class
│   │   └── Boss.ts         # Boss enemy with special mechanics
│   ├── dungeon/
│   │   ├── DungeonGenerator.ts  # Procedural floor generation
│   │   ├── Room.ts              # Room templates and logic
│   │   ├── Floor.ts             # Floor state and management
│   │   └── Tileset.ts           # Voxel tile definitions
│   ├── rpg/
│   │   ├── SkillTree.ts    # Skill tree data and logic
│   │   ├── Inventory.ts    # Item management
│   │   ├── LootTable.ts    # Drop rates and loot generation
│   │   └── Stats.ts        # Character stat calculations
│   ├── ui/
│   │   ├── HUD.ts          # Health bar, minimap, floor indicator
│   │   ├── MenuSystem.ts   # Pause menu, inventory screen, skill tree UI
│   │   └── DamageNumbers.ts # Floating damage text
│   ├── rendering/
│   │   ├── VoxelRenderer.ts # Voxel mesh generation and rendering
│   │   ├── SceneManager.ts  # Three.js scene setup and management
│   │   └── Lighting.ts      # Floor lighting and ambiance
│   └── utils/
│       ├── math.ts          # Vector math, random helpers
│       └── constants.ts     # Game-wide constants and config
├── public/
│   └── assets/              # Static assets (textures, sounds, models)
└── tests/                   # Test files (mirroring src/ structure)
```

### Key Architectural Patterns

- **Entity-Component pattern** for game objects (player, enemies, items)
- **Game loop** with fixed-timestep update and variable-rate rendering
- **State machine** for game states (menu, playing, paused, inventory, cutscene)
- **Event system** for decoupled communication between systems (e.g., enemy dies → drop loot → grant XP)

## Milestones

These are ordered to deliver playable increments as early as possible.

### Milestone 1: Walking Around
- Project scaffolding (Vite + TypeScript + Three.js)
- Render a simple voxel floor
- Player character (placeholder cube) with WASD movement
- Isometric camera following the player
- Basic lighting

### Milestone 2: Dungeon Generation
- Procedural room and corridor generation
- Walls, floors, doors between rooms
- Minimap showing explored areas
- Stairs/exit tile to represent floor transitions

### Milestone 3: Combat
- Basic melee attack with hit detection
- Simple enemy AI (patrol, chase, attack)
- Health system for player and enemies
- Death and respawn
- Damage numbers

### Milestone 4: RPG Systems
- XP and leveling
- Skill tree (basic version with a few nodes)
- Loot drops and equipment
- Inventory screen
- Stat effects from equipment

### Milestone 5: Persistence & Polish
- Save/load system (localStorage)
- 5 distinct floor configurations with increasing difficulty
- Boss encounters on each floor
- HUD polish (health, XP bar, floor indicator)
- Gamepad support

### Milestone 6: Final Boss & Release
- Final boss with unique mechanics
- Win condition and ending screen
- GitHub Pages deployment pipeline
- Performance optimization for Chromebook targets
- README with screenshots and play link

## Performance Targets

Since the game must run on Chromebooks:
- Target **60 FPS** on mid-range hardware, **30 FPS minimum** on low-end Chromebooks
- Keep draw calls low — batch voxel geometry aggressively
- Use simple shaders and minimal post-processing
- Budget: aim for < 5MB total download size for initial load

## Open Questions

These should be resolved as development progresses:

- [ ] Narrative/story theme (deferred for now)
- [ ] Specific enemy types and behaviors for each floor
- [ ] Skill tree node design and balance
- [ ] Sound effects and music (what tools/assets to use)
- [ ] Specific voxel palette and visual theme per floor
- [ ] How to handle player death (respawn at floor start? lose items?)
- [ ] Multiplayer potential (future scope?)

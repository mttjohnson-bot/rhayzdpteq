# Game Plan

This document captures all design decisions and serves as the reference for building the game.

For organized documentation by audience, see the `docs/` directory:
- **Player guide:** `docs/player/PLAYER_GUIDE.md`
- **Architecture overview:** `docs/development/ARCHITECTURE.md`
- **Development roadmap:** `docs/development/ROADMAP.md`
- **AI session log:** `docs/development/SESSION_LOG.md`
- **Detailed plans:** `docs/development/plans/`

## Concept Summary

A browser-based 3D dungeon crawler RPG with a voxel art style. The player begins in a fixed **hub area** (a small camp, base, or temple) that serves as a safe starting point between runs. From the hub, the player selects a dungeon floor to enter. Dungeon floors are procedurally generated and played from a top-down isometric perspective with real-time action combat. Instead of descending into a dungeon, the player **ascends** — climbing upward floor by floor, defeating a boss on each level to unlock the next.

After completing (or dying on) a floor, the player returns to the hub where they can manage inventory, spend skill points, and select the next floor to attempt.

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

### Hub Area
- **Fixed, hand-built scene** — a small camp/base/temple that serves as the safe zone between dungeon runs
- Player spawns here on game start and returns here after completing or dying on a floor
- Contains interactive elements for:
  - **Floor selection:** portal, staircase, or similar mechanism to choose which unlocked floor to enter
  - **Inventory management:** access equipment, sort loot
  - **Skill tree access:** spend skill points earned from dungeon runs
  - **Save point:** explicit save interaction (or auto-save on return)
- Hub is always the same layout — no procedural generation
- Can be expanded later with NPCs, shops, or upgrade stations

### Level Design
- **Procedural generation** for dungeon floors (hub is hand-built)
- Each floor is algorithmically generated with rooms, corridors, traps, and enemy placements
- Each floor ends with a boss room that gates progression to the next floor
- Floors should feel distinct as the player ascends (vary room density, enemy types, environmental elements)
- Defeating a floor's boss **unlocks the next floor** in the hub's floor selection

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
- Save includes: highest unlocked floor, character stats, inventory, skill tree state

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
│   │   ├── ActionManager.ts # Action-based input abstraction layer
│   │   ├── InputAction.ts  # Input action types and default mappings
│   │   ├── providers/      # Input device providers (Keyboard, Mouse, Gamepad, Touch)
│   │   ├── SaveManager.ts  # Save/load to localStorage
│   │   └── Hub.ts          # Hub scene setup, floor selection, NPC interactions
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
- **State machine** for game states: `Menu → Hub → Dungeon → Hub → ...` (plus paused, inventory, skill tree overlays)
- **Scene management** must handle two scene types: the persistent hub scene (hand-built, always in memory) and disposable dungeon scenes (procedurally generated, loaded/unloaded per run)
- **Event system** for decoupled communication between systems (e.g., enemy dies → drop loot → grant XP, boss defeated → unlock next floor)

## Milestones

These are ordered to deliver playable increments as early as possible.

### Milestone 1: Hub & Movement
- Project scaffolding (Vite + TypeScript + Three.js)
- Build the fixed hub scene (small voxel room/area with floor, walls, lighting)
- Player character (placeholder cube) with WASD movement
- Isometric camera following the player
- Basic game state machine: Menu → Hub
- A portal/door in the hub that transitions to a dungeon floor (placeholder)

### Milestone 2: Dungeon Generation & Transitions
- Procedural room and corridor generation
- Walls, floors, doors between rooms
- Minimap showing explored areas
- Exit tile that returns the player to the hub
- Scene loading/unloading: hub scene persists, dungeon scenes are created and destroyed per run
- Floor selection UI or interaction in the hub

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

#### Issue 6.1 Much Bigger Levels
- The halls between rooms on the levels are a bit narrow make halls wider and longer
- Make rooms bigger with different shapes, variations, and obstructions
- Make it easier to see player and enemies so they are not hidden by wall
  - maybe some outline of enemy or player when covered by wall
  - make walls slant more from angle of viewer so there is less that a character could hide behind
    - maybe this could be done by increasing margin on the side that would hide them from the viewers perspective so chatracters would not be completely hidden by walls
- Make total map size much bigger, which might mean scrolling the mini map

#### Issue 6.2 Combat Improvements
- Auto face enemy in reach of attack
  - If already facing enemy in reach of attack don't auto change
- do not allow enemy to enter space of player character or go through player
- More enemies per level
- two tiers for enemies with captiain for each mob
- 5 enemy types with different characteristics, shapes, and colors
- make boss harder and bigger
- make boss room much larger than most rooms
- sometimes allow some knock back of character when hit

#### Issue 6.3: Control Support Improvements
- allow gamepad support on home page to highlight and select continue or start new game
- Allow level selection using gamepad
- allow item equip/use with gamepad
- allow selecting skill tree with gamepad
- allow keyboard to highlight and select level from menu
- when a menu appears provide instructions for interacting with menu
- detect if gamepad is in use
  - if in use add hud overlay along some edge to indicate gamepad is active
  - if in use change help panels to display gamepad button instead of keyboard key

#### Issue 6.4 Multiple Save Slots
- Allow four save slots on game start page
  - Allow selecting a slot and then be able to select and activate continue or start new game

#### Issue 6.5 Inventory Item Improvements
- Allow highlight of an item and then once select option to equip/use or drop the item
  - if drop item is choosen another prompt must make you confirm you want to drop
- more inventory slots as a separate upgrade using skill points
- Larger variety of weapons, armor, and rings
  - different weapons types introduce different visual annimation or effects during attack
  - Area affect 
  - Attack speed changes for weapons
  - lingering effects of weapon attack (poison, debuff)
- Several other use potion types
  - timed buffs
  - timed bonus effects / modifiers

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
- [ ] How to handle player death (return to hub? lose items? lose XP? retry same floor?)
- [ ] Hub features: NPC vendors, upgrade stations, cosmetic unlocks?
- [ ] Multiplayer potential (future scope?)
- [ ] randomly introduce dager obstacles in rooms
  - [ ] obstacle types
    - [ ] fixed room objects to move around like furniture
    - [ ] water weakens player/enemy on contact
    - [ ] mud slows player/enemy on contact
    - [ ] fire burns player/enemy on contact
    - [ ] trap that explodes on contact
- [ ] additional collectable loot items
  - [ ] collectable item types
    - [ ] level modifier (harder/easier enemies)
    - [ ] show colored dots on mini map where enemies remain on level
  - [ ] a randomly selected and hidden loot item on each level map
  - [ ] random dropable item (low chance of dropping)
- [ ] item storage vault in hub and inventory transfer dialog (with keyboard and gamepad support)
- [ ] Quests/Tasks/Objectives board with rewards
  - [ ] defeat x number of type y enemies
  - [ ] defeat boss y with x type of specific item equiped
  - [ ] collect x type of collectable item
- [ ] use menu button on controller to open menu dialog and tab between sections with bumpers
- [ ] Support for Meta Quest2 WebVR/WebXR and VR Controllers
- [ ] Settings section in menu
  - [ ] toggle between first person and third person view
  - [ ] toggle to automatically enable all controller options or select a single controller
    - [ ] selection of controller options (keyboard, gamepad)
  - [ ] Diagnostics overlay
    - [ ] frame rate
    - [ ] active draw calls - number of objects actively tracking and being rendered
- [ ] diagnostics info tab in menu
    - [ ] os and browser detection and display
    - [ ] controller detected
      - [ ] type of controller detected
- [ ] full map tab in menu
  - [ ] zoom in/out support
  - [ ] display percentage of map discovered
  - [ ] key indicators on map
    - [ ] start
    - [ ] exit
    - [ ] boss room
    - [ ] location of discovered collectable item
- [ ] software robustness
  - [ ] verification suite
    - [ ] Unit & Integration Testing
    - [ ] End-to-End (E2E) & Visual Testing
    - [ ] Development & Build Tools 
  - [ ] security scanning
    - [ ] dependency update checking
    - [ ] vulnerability scanning
    - [ ] error handling
  - [ ] linting code base
- [ ] library for viewing all visual game assets
  - [ ] additional door from hub to library
  - [ ] organize library rooms on floor by asset type
    - [ ] enemies
      - [ ] mob / captain
      - [ ] boss
    - [ ] npc characters
      - [ ] merchant vendor
    - [ ] inventory items
      - [ ] weapons
      - [ ] armor
      - [ ] rings
      - [ ] potions
    - [ ] structure components
      - [ ] floor
      - [ ] wall
      - [ ] room objects
      - [ ] show all variations and themes available for structure components
  - [ ] each asset is in a fixed position over a short pedistal and slowly rotates
  - [ ] asset interactions
    - [ ] highlight the asset the player is most facing
    - [ ] when asset is highlighted option to interact is made available
    - [ ] when player initiates interaction with asset a dialog appears with asset stats and details

# CLAUDE.md

This file provides guidance for AI assistants working with this repository.

## Project Overview

A browser-based 3D dungeon crawler RPG with voxel art style, built with Three.js and TypeScript. The player ascends through procedurally generated dungeon floors using real-time action combat, with RPG progression via a skill tree and loot system. Designed to run on Chromebooks and hosted on GitHub Pages.

See `GAME_PLAN.md` for the full game design document including milestones, architecture, and open questions.

## Tech Stack

- **Language:** TypeScript
- **3D Engine:** Three.js
- **Bundler:** Vite
- **Hosting:** GitHub Pages
- **License:** MIT

## Repository Structure

```
/
├── LICENSE          # MIT License (2026)
├── CLAUDE.md        # AI assistant guidance (this file)
├── GAME_PLAN.md     # Game design document and project plan
├── package.json     # Dependencies and scripts (once scaffolded)
├── vite.config.ts   # Vite configuration (once scaffolded)
├── tsconfig.json    # TypeScript configuration (once scaffolded)
├── index.html       # Entry point (once scaffolded)
├── src/             # Source code
│   ├── main.ts      # App entry point
│   ├── game/        # Core game loop, player, camera, input, saves
│   ├── combat/      # Combat system, enemies, bosses
│   ├── dungeon/     # Procedural generation, rooms, floors, tiles
│   ├── rpg/         # Skill tree, inventory, loot, stats
│   ├── ui/          # HUD, menus, damage numbers
│   ├── rendering/   # Voxel renderer, scene management, lighting
│   └── utils/       # Math helpers, constants
├── public/assets/   # Static assets (textures, sounds)
└── tests/           # Test files (mirrors src/ structure)
```

## Development Setup

Once the project is scaffolded:

- **Package manager:** npm
- **Install dependencies:** `npm install`
- **Dev server:** `npm run dev`
- **Build for production:** `npm run build`
- **Preview production build:** `npm run preview`

## Common Commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Preview build | `npm run preview` |
| Run tests | `npm test` |
| Lint | `npm run lint` |
| Type check | `npx tsc --noEmit` |

## Key Design Decisions

- **Hub:** Fixed hand-built safe zone (camp/temple); player starts here and returns after each dungeon run
- **Game flow:** Menu → Hub → Dungeon Floor → Hub (loop); hub persists, dungeon scenes are disposable
- **Camera:** Top-down isometric, follows player
- **Combat:** Real-time action (attack, dodge, block)
- **Levels:** Procedurally generated, player ascends upward; floor selection from hub
- **Progression:** XP/leveling with skill tree + loot drops
- **Saves:** Persistent via localStorage
- **Input:** Keyboard + mouse (primary), gamepad (secondary)
- **MVP:** 5 floors + final boss

## Code Style and Conventions

- TypeScript strict mode
- Use ES modules (`import`/`export`)
- Follow Three.js community conventions for scene/renderer setup
- Entity-Component pattern for game objects
- Fixed-timestep game loop with variable-rate rendering
- State machine for game states (menu, playing, paused, inventory)
- Event system for decoupled communication between systems
- Keep classes focused — one primary responsibility per file
- Prefer composition over inheritance for game entities

## Performance Guidelines

Target: Chromebook-playable (60 FPS mid-range, 30 FPS minimum low-end)

- Batch voxel geometry to minimize draw calls
- Use simple shaders, avoid heavy post-processing
- Keep initial download under 5MB
- Profile regularly on low-end hardware/throttled Chrome DevTools

## Changelog Maintenance

**IMPORTANT: The changelog MUST be updated as part of every development session.** Do not wait to be asked — this is a standing requirement.

### Rules

1. **Update `CHANGELOG.md` before creating a commit or pull request.** Every session that modifies code, configuration, or assets must include a corresponding changelog update in the same commit(s).
2. **Add entries under the `[Unreleased]` section** at the top of the file. When a PR is merged or a release is cut, unreleased entries get moved under a dated heading.
3. **Match entries to actual changes.** Each changelog bullet should reflect a real change made during the session. Do not add speculative or planned items — only document what was actually implemented, fixed, or changed.
4. **Use the existing format.** Follow the style already in `CHANGELOG.md`:
   - A short summary line under the date/section heading describing the theme of the changes.
   - Bulleted entries with **bold lead text** followed by an em dash and description.
   - Group related changes logically (features, fixes, infrastructure, etc.).
5. **Keep it user-facing.** Write entries from the perspective of someone playing or developing the game. Focus on *what changed and why*, not implementation minutiae.
6. **Verify accuracy before committing.** Review the changelog entries against the actual diff to confirm they accurately reflect the work done. If a PR is being created, the changelog should cover all commits in the branch, not just the last one.

### What to include

- New features or gameplay changes
- Bug fixes
- Configuration or build changes
- Refactors that affect behavior or architecture
- Asset additions or modifications

### What to skip

- Trivial whitespace or formatting-only changes
- Changes that are immediately reverted in the same session

## Git Workflow

- Default branch: `main`
- Write clear, descriptive commit messages
- Keep commits atomic and focused on a single change
- Feature branches for major milestones

## CI/CD

GitHub Pages deployment from the production build output. Pipeline to be configured once the project is scaffolded.

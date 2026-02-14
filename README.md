# Voxel Dungeon Crawler

A browser-based 3D dungeon crawler RPG with a voxel art style, built with [Three.js](https://threejs.org/) and TypeScript.

## About the Game

Ascend through procedurally generated dungeon floors using real-time action combat. Start each run from your hub — a safe camp where you manage inventory, spend skill points, and choose your next challenge. Each floor is unique, filled with enemies, traps, and loot. Defeat the boss on each level to unlock the next, and climb your way to the top.

### Features

- **Voxel art style** — distinctive, performant, and procedurally friendly
- **Real-time action combat** — attack, dodge, block, and outmaneuver enemies with telegraphed attack patterns
- **Procedurally generated floors** — every run is different
- **Hub area** — a persistent safe zone for managing gear, skills, and selecting floors
- **RPG progression** — level up, earn skill points, and collect loot
- **Skill tree** — customize your playstyle with branching upgrades
- **Boss fights** — each floor culminates in a unique boss encounter
- **Runs in a browser** — designed to play well even on Chromebooks

## Play the Game

Play now at: **[https://mttjohnson-bot.github.io/rhayzdpteq/](https://mttjohnson-bot.github.io/rhayzdpteq/)**

## Getting Started (Development)

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/mttjohnson-bot/rhayzdpteq.git
cd rhayzdpteq

# Install dependencies
npm install

# Start the dev server
npm run dev
```

### Commands

| Task | Command |
|------|---------|
| Install dependencies | `npm install` |
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Preview build | `npm run preview` |
| Run tests | `npm test` |
| Lint | `npm run lint` |
| Type check | `npx tsc --noEmit` |

## Controls

- **WASD / Arrow Keys** — Move
- **Mouse** — Aim / Look
- **Left Click** — Attack
- **Right Click / Shift** — Block
- **Space** — Dodge / Roll
- **E** — Interact
- **I** — Inventory
- **Tab** — Skill Tree
- **Esc** — Pause Menu

*Gamepad support is also available.*

## Tech Stack

- **TypeScript** — type-safe game logic
- **Three.js** — 3D rendering in the browser
- **Vite** — fast builds and hot module replacement
- **GitHub Pages** — free static hosting

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Credits

Created by **Matt Johnson** and **Nathaniel Johnson**, with the help of [Claude Code](https://claude.ai/code).

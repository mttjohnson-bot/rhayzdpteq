# Player Guide

Welcome to **Rhayzd Pteq**, a browser-based 3D dungeon crawler RPG with a voxel art style. This guide covers everything you need to know to play the game.

**Play now:** [https://mttjohnson-bot.github.io/rhayzdpteq/](https://mttjohnson-bot.github.io/rhayzdpteq/)

---

## Getting Started

### Starting a New Game

1. Open the game in your browser (Chrome recommended; works on Chromebooks).
2. The title screen shows **4 save slots**. Select an empty slot by clicking it or using arrow keys / D-pad.
3. Click **New Game** (or press Enter / A button) to begin.
4. You spawn in the **Hub** — a safe camp area.

### Loading a Save

1. On the title screen, select a save slot that shows existing progress.
2. Click **Continue** to resume where you left off.
3. Your character level, inventory, skill tree, and highest unlocked floor are all preserved.

### Deleting a Save

1. Select a save slot with existing data.
2. Click the delete option and confirm when prompted.

---

## The Hub

The Hub is your home base between dungeon runs. It is a fixed, hand-built area where you can:

- **Manage inventory** — Open your inventory (I key / X button) to equip, use, or drop items.
- **Spend skill points** — Open the skill tree (K key / Y button) to allocate points earned from leveling up.
- **Select a dungeon floor** — Walk to the glowing purple portal and interact (E key / B button) to choose which floor to enter.
- **Visit the Asset Library** — Walk through the side door to inspect all game assets on display pedestals.

The Hub persists — your position resets to the spawn point each time you return, but your character data carries over.

---

## Controls

### Keyboard & Mouse

| Action | Key |
|--------|-----|
| Move | WASD or Arrow Keys |
| Attack | Left Click or Space (hold for continuous) |
| Interact | E |
| Inventory | I |
| Skill Tree | K |
| Drop Item | X (with item selected) |
| Respawn (on death) | R, Enter, or Space |
| Close Overlay / Cancel | Escape |
| Settings / Pause Menu | Escape (when no overlay is open) |

### Gamepad

| Action | Button |
|--------|--------|
| Move | Left Stick |
| Attack | A / RT |
| Interact | B |
| Inventory | X |
| Skill Tree | Y |
| Drop Item | R1 |
| UI Navigate | D-pad |
| Confirm | A |
| Cancel / Back | B or Select |
| Settings / Pause Menu | Start |
| Cycle Menu Tabs | LB / RB (when a menu is open) |

### Touch Screen

| Action | Gesture |
|--------|---------|
| Move | Virtual joystick (left side of screen) |
| Attack | ATK button (right side, large) |
| Interact / Confirm | E button (right side) |
| Inventory | I button (right side) |
| Skill Tree | K button (right side) |

Touch controls appear automatically when a touch event is detected and hide when keyboard or mouse input is used.

---

## Dungeon Floors

### How Floors Work

- Each floor is **procedurally generated** — the layout is different every time.
- Floors contain **rooms** connected by **corridors**, with enemies, obstacles, and loot scattered throughout.
- The **minimap** (top-right corner) reveals areas as you explore them.
- Each floor has an **exit tile** (green glow) that returns you to the Hub, but only after you defeat the floor's boss.

### Floor Progression

There are **10 dungeon floors** with increasing difficulty:

| Floor | Theme | Key Challenge |
|-------|-------|---------------|
| 1 | Stone Crypt | Basic grunts, learning the ropes |
| 2 | Mossy Caverns | More enemies, tighter corridors |
| 3 | Lava Forge | Fire obstacles, tougher enemies |
| 4 | Frozen Depths | Water and ice hazards |
| 5 | Shadow Sanctum | **Final boss: Shadow Lord** |
| 6–10 | Escalating variants | Higher enemy counts, captains, harder bosses |

Defeating a floor's boss **unlocks the next floor** in the Hub's floor selection portal.

### Environmental Obstacles

Dungeon rooms may contain hazards:

- **Mud** — Slows your movement speed on contact.
- **Water** — Reduces your damage output while standing in it.
- **Fire** — Burns you (and enemies) on contact, dealing damage over time.
- **Traps** — Explode on first contact for one-time burst damage.

These obstacles affect enemies too — use them to your advantage.

---

## Combat

### Basics

- **Attack** by clicking or pressing Space. Hold to attack continuously when the cooldown expires.
- Enemies have **telegraphed attacks** — watch their patterns to dodge.
- You have brief **invincibility frames** after being hit.
- Movement speed is reduced while attacking, so position yourself before committing.
- Enemies have **solid collision** — you cannot walk through them.

### Enemy Types

| Type | Behavior |
|------|----------|
| **Grunt** | Basic melee attacker |
| **Brute** | Slow, high damage, high HP |
| **Archer** | Ranged attacks from a distance |
| **Mage** | Magical attacks with area effects |
| **Assassin** | Fast, low HP, high damage |

Each enemy type also has a **Captain** variant (marked with a gold crown) that is stronger and tougher.

### Boss Fights

Each floor ends with a boss room. Bosses are larger, have dedicated health bars, and use special abilities:

- **Charge** — Rushes toward you at high speed.
- **Slam** — Area-of-effect ground pound.
- **Summon** — Spawns additional minions.
- **Teleport** — Blinks to a new position.
- **Enrage** — At 50% HP, the boss becomes faster and hits harder.

The Floor 5 boss (Shadow Lord) has an additional **Invisibility** ability — it fades to near-transparency and can only be tracked by faint red eye embers.

---

## RPG Systems

### Leveling

- Defeating enemies grants **XP** scaled to the floor's difficulty.
- Leveling up grants **skill points** to spend in the skill tree.
- Your level, XP, and stats are shown on the HUD.

### Skill Tree

Open with **K** (keyboard) or **Y** (gamepad). Three branches:

| Branch | Focus |
|--------|-------|
| **Warrior** | Offensive power — damage, crit chance, attack speed |
| **Guardian** | Defensive durability — HP, defense, damage reduction |
| **Scout** | Mobility and utility — movement speed, dodge distance |

Nodes have multiple ranks. Spend points to unlock and upgrade. Points can be reallocated by resetting the tree.

### Inventory

Open with **I** (keyboard) or **X** (gamepad).

- **3 equipment slots** — Weapon, Armor, Ring.
- **24-slot bag** — Carries unequipped items and consumables.

#### Equipment

Items have **rarity tiers**: Common, Uncommon, Rare, Epic. Higher rarity means better stats.

**Weapon categories:** Sword, Axe, Mace, Dagger, Spear — each with different attack animations and speeds.

**Armor** increases defense. **Rings** provide various stat bonuses.

#### Consumables

**Potions** can be used from your bag:

| Potion | Effect |
|--------|--------|
| Health Potion | Restores HP |
| Strength Potion | Temporary damage boost |
| Speed Potion | Temporary movement speed boost |
| Shield Potion | Temporary defense boost |

#### Managing Items

- **Keyboard/Mouse:** Click to equip/use, Shift+Click or Right-Click to drop.
- **Gamepad:** D-pad to navigate, A to equip/use, R1 to drop.
- **Touch:** Tap an item to open an action menu (Equip/Use, Drop, Cancel).
- Dropping items requires a **confirmation prompt** to prevent accidents.

### Storage Vault

The Hub contains a **storage vault** (the chest on the west wall). Walk near it and press **E** (keyboard) or **A** (gamepad) to open it.

- **48 storage slots** for long-term item storage.
- **Two-column layout** — your bag is on the left, the vault on the right.
- **Click or press confirm** to transfer an item to the other side.
- **Keyboard/Gamepad:** Arrow keys or D-pad to navigate, Left/Right to switch columns, Space/A to transfer, Esc/B to close.
- **Touch:** Tap an item to transfer it.
- Vault contents **save automatically** when the vault is closed and persist across sessions.

Use the vault to store equipment and consumables you want to keep but don't need in the dungeon.

### Loot

Enemies and chests drop randomized loot. Drop quality scales with floor difficulty. Each floor has a chance for rare hidden items.

---

## Saving

- The game **auto-saves** when you return to the Hub and every 30 seconds while playing.
- There are **4 save slots** — you can have multiple characters.
- Save data is stored in your browser's localStorage. Clearing browser data will erase saves.
- Each save tracks: character level, XP, skill tree allocations, inventory, highest unlocked floor, and game completion status.

---

## Tips

- **Explore fully** before heading to the boss room — collect loot and XP from all rooms.
- **Use obstacles** — lure enemies into fire or traps.
- **Watch boss patterns** — bosses telegraph their attacks, giving you time to move.
- **Upgrade your gear** — equipping even common items is better than fighting bare-handed.
- **Invest skill points early** — even small stat boosts compound over multiple floors.
- **Check the minimap** — it reveals room layouts as you explore, helping you navigate back to unexplored areas.

---

## Settings Menu

Open the Settings menu by pressing **Escape** (keyboard) or **Start** (gamepad) when no other overlay is active. The settings panel includes:

| Setting | Options | Description |
|---------|---------|-------------|
| Camera | Third-Person / First-Person | Switch between the default isometric view and a first-person perspective at eye level |
| Controller | Auto-Detect / Keyboard / Gamepad | Choose automatic input detection or lock to a specific device |
| Diagnostics | OFF / ON | Show a real-time FPS counter and draw call count in the top-right corner |

Use **Up/Down** (or D-pad) to navigate between options, **Left/Right** to change values, and **Escape / B** to close.

When any menu overlay is open (Inventory, Skill Tree, Settings, or Diagnostics), press **LB / RB** on a gamepad to cycle between them without closing and reopening.

### Diagnostics Tab

The Diagnostics tab provides system and performance information. Access it by cycling to the 4th tab with **LB / RB** from any open menu overlay. It shows:

- **System** — Operating system, browser (with version), screen resolution, device pixel ratio, viewport size.
- **Renderer** — GPU name, live FPS counter, draw call count.
- **Controller** — Active input device (keyboard/mouse, gamepad, or touch) and connected gamepad name/ID.

Use **Up/Down** to scroll (or D-pad on gamepad), and **Escape / B** to close.

---

## HUD Elements

| Element | Location | Purpose |
|---------|----------|---------|
| Health bar | Top-left | Current HP |
| XP bar | Below health | Progress to next level |
| Floor indicator | Top-center | Current floor name and number |
| Minimap | Top-right | Explored dungeon layout |
| Boss health bar | Top-center (in boss room) | Boss remaining HP |
| Instructions panel | Top-right | Context-sensitive control hints |
| Active device indicator | Bottom-right | Shows current input device (fades after 3s) |

---

## Troubleshooting

### Game doesn't load
- Use a modern browser (Chrome, Edge, Firefox). Chrome is recommended.
- Ensure JavaScript is enabled.
- Try clearing your browser cache and reloading.

### Performance issues
- The game targets 60 FPS on mid-range hardware and 30 FPS on low-end Chromebooks.
- Close other browser tabs to free up GPU resources.
- The game disables anti-aliasing and caps pixel ratio at 1.5 for performance.

### Lost save data
- Save data is in browser localStorage. It will be lost if you clear browsing data.
- Private/incognito browsing mode may not persist saves between sessions.

### Controls not working
- Click on the game canvas to ensure it has focus.
- For gamepad: the game auto-detects connected controllers. A "Gamepad Connected" indicator appears when detected.
- For touch: controls appear automatically on first touch event.

---

## What's Coming Next

See the [Development Roadmap](../development/ROADMAP.md) for planned features including:
- Quest/objective board with rewards
- Additional enemy types and floor themes
- Settings menu with view toggle and diagnostics
- VR/WebXR support (Meta Quest 2)

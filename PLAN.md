# Plan: Input Abstraction Layer & Touch Controls

## Problem Statement

The current input system in `InputManager.ts` handles keyboard, mouse, and gamepad input but has several architectural issues:

1. **No separation between input devices and game actions.** Consumers (Player.ts, Game.ts, UI components) directly check for specific key codes like `wasPressed('KeyE')` or `isDown('Space')`. Adding a new input device (touch) means updating every consumption site.

2. **Gamepad works via synthetic keyboard events.** The gamepad implementation injects synthetic `KeyboardEvent` dispatches and maps buttons to key codes, making the gamepad a second-class citizen that piggybacks on keyboard infrastructure. This creates subtle bugs (e.g., the `mouseDown` state being set by gamepad buttons for attack).

3. **UI components register their own `keydown` listeners.** Six UI components (MenuScreen, FloorSelectUI, InventoryUI, SkillTreeUI, ConfirmDialog, LibraryAssetDialog) each independently listen for keyboard events, bypassing InputManager entirely. This means every new input device needs its own synthetic event dispatch strategy.

4. **No concept of "actions."** The code checks `wasPressed('KeyI')` rather than `wasPressed('toggleInventory')`. This means key bindings are scattered across ~10 files and there's no single place to see or change what inputs map to what behaviors.

5. **Mixed input sources are fragile.** Keyboard and mouse are treated as separate but used together. Gamepad overrides `mouseDown` for attack. Adding touch would compound this coupling.

## Design Goals

- **Action-based abstraction**: Game code queries named actions (`move`, `attack`, `interact`, `toggleInventory`, etc.) instead of specific keys or buttons.
- **Multiple simultaneous providers**: Keyboard, mouse, gamepad, and touch can all be active at once. Any provider can satisfy any action it's mapped to.
- **Single source of truth for mappings**: One configuration object defines which physical inputs map to which actions, per device type.
- **UI components use the same system**: Eliminate the separate `keydown` listener pattern in UI components; route all input through the action system.
- **Touch-friendly**: Virtual joystick for movement, on-screen buttons for actions, tap-to-interact.
- **Extensible**: Future devices (motion sensors, VR controllers) slot in as new providers without changing consumers.

## Architecture

### Conceptual Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Game / UI Code                        │
│  (queries actions: "move", "attack", "interact", etc.)  │
└─────────────────────┬───────────────────────────────────┘
                      │ reads
┌─────────────────────▼───────────────────────────────────┐
│                   ActionManager                          │
│  - Maintains per-frame action state (pressed/held/axis)  │
│  - Merges input from all active providers                │
│  - Single endFrame() resets per-frame state              │
└─────────┬───────────┬───────────┬───────────┬───────────┘
          │           │           │           │
   ┌──────▼──┐  ┌─────▼───┐  ┌───▼─────┐  ┌─▼────────┐
   │Keyboard │  │  Mouse   │  │ Gamepad │  │  Touch   │
   │Provider │  │ Provider │  │Provider │  │ Provider │
   └─────────┘  └─────────┘  └─────────┘  └──────────┘
   Each provider:
   - Listens to its own raw events
   - Reports which actions are active via a standard interface
   - Has its own mapping config
```

### Key Types and Interfaces

```typescript
// All game actions as a string union or enum
type InputAction =
  // Movement (analog/axis)
  | 'moveX'          // -1 (left) to +1 (right)
  | 'moveZ'          // -1 (up) to +1 (down)
  // Combat
  | 'attack'         // melee attack
  // Interaction
  | 'interact'       // E key / A button / tap on interactable
  // UI navigation
  | 'uiUp'
  | 'uiDown'
  | 'uiLeft'
  | 'uiRight'
  | 'uiConfirm'      // Enter/Space/A button
  | 'uiCancel'        // Escape/B button
  // Game UI toggles
  | 'toggleInventory'
  | 'toggleSkillTree'
  | 'dropItem'
  | 'respawn'
  // Menu-specific
  | 'selectSlot1' | 'selectSlot2' | 'selectSlot3' | 'selectSlot4'
  | 'selectFloor0' | 'selectFloor1' | ... | 'selectFloor9';

// What a provider reports each frame
interface InputProviderState {
  // Digital actions: true if active this frame
  pressed: Set<InputAction>;   // first frame only
  held: Set<InputAction>;      // continuous
  // Analog axes: -1 to +1
  axes: Map<InputAction, number>;  // moveX, moveZ, aimX, aimY
}

// Interface all providers implement
interface InputProvider {
  readonly name: string;       // 'keyboard' | 'mouse' | 'gamepad' | 'touch'
  readonly active: boolean;    // whether this device is currently in use
  poll(): InputProviderState;  // called each frame
  endFrame(): void;            // reset per-frame state
  destroy(): void;             // cleanup listeners
}
```

### ActionManager (replaces InputManager)

The `ActionManager` is the single entry point for all game code to query input:

```typescript
class ActionManager {
  private providers: InputProvider[] = [];

  // Merged state across all providers
  wasActionPressed(action: InputAction): boolean;   // first frame
  isActionHeld(action: InputAction): boolean;        // continuous
  getAxis(action: InputAction): number;              // analog value
  getMovement(): { x: number; z: number };           // convenience: moveX + moveZ

  // Active device detection (for HUD hints, instructions)
  getActiveDevices(): Set<string>;

  // Per-frame lifecycle
  endFrame(): void;  // polls all providers, merges state, resets per-frame flags
}
```

### Provider Details

#### KeyboardProvider
- Listens to `keydown`/`keyup` on window
- Mapping config: `{ 'KeyW': 'moveZ:-1', 'KeyS': 'moveZ:+1', 'KeyA': 'moveX:-1', 'KeyD': 'moveX:+1', 'Space': 'attack', 'KeyE': 'interact', 'KeyI': 'toggleInventory', ... }`
- Digital keys mapped to axes produce -1 or +1 when held
- Reports `active: true` when any key is pressed

#### MouseProvider
- Listens to `mousedown`/`mouseup`/`mousemove` on window
- Mapping: left click → `attack`, position tracking for aim/cursor
- Exposes normalized mouse position (mouseX, mouseY) as a separate query (not an action) since it's continuous positional data used for raycasting, not a game action
- Reports `active: true` when mouse moves or clicks

#### GamepadProvider
- Polls `navigator.getGamepads()` each frame
- Mapping config: `{ 0: 'attack', 1: 'interact', 2: 'toggleInventory', 3: 'toggleSkillTree', ... }`
- Left stick → moveX/moveZ axes (with deadzone)
- D-pad → uiUp/uiDown/uiLeft/uiRight (digital)
- No more synthetic keyboard events; UI components read actions directly
- Reports `active: true` when any button/stick input detected

#### TouchProvider (new)
- Creates a virtual joystick overlay (left side of screen) for movement
- Creates on-screen action buttons (right side) for attack, interact
- Tap detection for UI interactions
- Swipe gestures for menu navigation (uiLeft/uiRight)
- Touch joystick → moveX/moveZ axes
- Button taps → digital actions (attack, interact, toggleInventory, etc.)
- Auto-shows when touch events detected, auto-hides when other input used
- Reports `active: true` when touch events fire

### Migration of UI Components

Currently 6 UI components have independent `keydown` listeners. The refactoring approach:

1. **UI components receive ActionManager reference** instead of (or in addition to) registering their own listeners.
2. **Game.ts routes UI actions to the active overlay.** When InventoryUI is open, Game.ts checks `wasActionPressed('uiUp')`, `wasActionPressed('uiConfirm')`, etc., and calls methods on InventoryUI.
3. **Mouse/click events on DOM elements remain.** These are standard DOM interactions and don't need to go through the action system. Touch taps on DOM elements will naturally work via the browser's touch-to-click emulation.
4. **Phased approach:** Initially, UI components can keep their keydown listeners but also respond to action queries. The keydown listeners can be removed in a follow-up phase once everything is stable.

### Touch UI Layout

```
┌─────────────────────────────────────────────────────────┐
│                      Game View                           │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│                                                          │
│  ┌───────────┐                         ┌───┐            │
│  │  Virtual   │                         │ I │ ┌───┐     │
│  │  Joystick  │                         └───┘ │ K │     │
│  │    (L)     │                    ┌───┐ └───┘     │
│  └───────────┘                     │ E │   ┌─────┐ │
│                                    └───┘   │ ATK │ │
│                                            └─────┘ │
└─────────────────────────────────────────────────────────┘
 Left thumb: movement        Right thumb: actions
```

- Virtual joystick appears where the left thumb touches (not fixed position)
- Action buttons are semi-transparent, positioned along the right edge
- Buttons contextually show/hide based on game state (e.g., interact button only when near interactable)
- Buttons scale based on screen size for tablet vs phone

## Implementation Phases

### Phase 1: Define Actions and ActionManager Shell

**Files to create:**
- `src/game/InputAction.ts` — Action type definitions and default mapping configs
- `src/game/ActionManager.ts` — ActionManager class (replaces InputManager as the consumer-facing API)
- `src/game/providers/InputProvider.ts` — Provider interface

**Files to create (providers):**
- `src/game/providers/KeyboardProvider.ts`
- `src/game/providers/MouseProvider.ts`
- `src/game/providers/GamepadProvider.ts`

**What this phase produces:**
- ActionManager that wraps the existing InputManager's raw state
- All four providers implemented (keyboard, mouse, gamepad) with the provider interface
- The existing InputManager code is split into these providers
- ActionManager merges their state and exposes the action-based API
- Default input mapping configuration for all three device types

**No consumers changed yet** — InputManager continues to exist and be used. ActionManager is wired up and tested in parallel.

### Phase 2: Migrate Game Code to Actions

**Files to modify:**
- `src/game/Game.ts` — Replace `this.input.wasPressed('KeyE')` with `this.actions.wasActionPressed('interact')`, etc.
- `src/game/Player.ts` — Replace `input.getMovement()` with `actions.getMovement()`, replace `input.wasPressed('Space')` / `input.isMouseDown()` with `actions.wasActionPressed('attack')` / `actions.isActionHeld('attack')`
- `src/main.ts` — Wire up ActionManager instead of / alongside InputManager

**What this phase produces:**
- Player movement and combat use the action system
- Game state transitions (interact, UI toggles, respawn) use the action system
- InputManager can be deprecated (kept temporarily for UI components that still use keydown listeners)

### Phase 3: Migrate UI Components to Actions

**Files to modify:**
- `src/ui/MenuScreen.ts`
- `src/ui/FloorSelectUI.ts`
- `src/ui/InventoryUI.ts`
- `src/ui/SkillTreeUI.ts`
- `src/ui/ConfirmDialog.ts`
- `src/ui/LibraryAssetDialog.ts`

**Approach:**
- Each UI component gets an `update(actions: ActionManager)` method that Game.ts calls when the overlay is active
- The `update` method checks for `uiUp`, `uiDown`, `uiConfirm`, `uiCancel`, etc.
- Mouse/click DOM event listeners remain unchanged (they're standard DOM behavior)
- Remove the `window.addEventListener('keydown', ...)` listeners from each component
- Remove the synthetic keyboard event dispatch from GamepadProvider (no longer needed)

**What this phase produces:**
- All UI components respond to actions, not key codes
- Gamepad works natively through the action system without synthetic events
- Adding a new input device automatically works with all UI

### Phase 4: Touch Provider and Virtual Controls

**Files to create:**
- `src/game/providers/TouchProvider.ts` — Touch event handling, virtual joystick, button state
- `src/ui/TouchControls.ts` — DOM overlay for virtual joystick and action buttons

**What this phase produces:**
- Virtual joystick for movement (left thumb area)
- On-screen buttons for attack, interact, inventory, skill tree
- Touch provider feeds into ActionManager like any other provider
- Auto-detection: touch controls appear when touch events fire, hide when keyboard/mouse/gamepad used
- All existing game functionality works via touch

### Phase 5: Polish and Device Detection

**Files to modify:**
- `src/ui/HUD.ts` — Show active input device indicator, adapt button hints
- `src/ui/InstructionsPanel.ts` — Context-sensitive control hints based on active device
- `src/ui/TouchControls.ts` — Responsive sizing, haptic feedback (if available), visual polish

**What this phase produces:**
- HUD shows context-appropriate button hints ("Tap" vs "Press E" vs "A button")
- Instructions panel adapts to active device
- Touch controls are visually polished and responsive
- Device auto-switching is smooth (no flicker)

### Phase 6: Cleanup and Remove Legacy Code

**Files to remove/modify:**
- Remove `src/game/InputManager.ts` (fully replaced by ActionManager + providers)
- Update any remaining references
- Remove synthetic keyboard event dispatch code
- Update tests

**What this phase produces:**
- Clean codebase with no legacy input code
- Single consistent input path for all devices
- All tests updated

## Action Catalog

Complete list of actions the system needs to support, with mappings per device:

| Action | Keyboard | Mouse | Gamepad | Touch |
|--------|----------|-------|---------|-------|
| moveX | A/D or Left/Right (digital ±1) | — | Left stick X | Virtual joystick X |
| moveZ | W/S or Up/Down (digital ±1) | — | Left stick Y | Virtual joystick Y |
| attack | Space (press & hold) | Left click (press & hold) | A button / RT | Attack button |
| interact | E | — | B button | Interact button (contextual) |
| toggleInventory | I | — | X button | Inventory button |
| toggleSkillTree | K | — | Y button | Skill tree button |
| dropItem | X | — | R1 | Long-press item (in inventory UI) |
| respawn | R, Enter, Space | — | A button | Tap to respawn (full screen) |
| uiUp | ArrowUp, W | — | D-pad Up | Swipe up / tap |
| uiDown | ArrowDown, S | — | D-pad Down | Swipe down / tap |
| uiLeft | ArrowLeft, A | — | D-pad Left | Swipe left / tap |
| uiRight | ArrowRight, D | — | D-pad Right | Swipe right / tap |
| uiConfirm | Enter, Space | Click | A button | Tap |
| uiCancel | Escape | — | B button, Start, Select | Back button / swipe |
| selectSlot1-4 | 1-4 | Click | — | Tap slot |
| selectFloor0-9 | 0-9 | Click | — | Tap floor button |

## Migration Risk Assessment

**Low risk:**
- Phase 1 (new files, no existing code changes)
- Phase 5 (UI polish, non-breaking)
- Phase 6 (cleanup after everything works)

**Medium risk:**
- Phase 2 (Game.ts and Player.ts are core files, but changes are mechanical find-and-replace of method calls)
- Phase 4 (new touch system, but isolated as a new provider)

**Higher risk:**
- Phase 3 (UI components have complex keyboard handling with edge cases around focus, event propagation, and the interplay between DOM click handlers and keyboard navigation; need careful testing of each overlay)

## Testing Strategy

- Each provider should have unit tests verifying that raw events produce correct action state
- ActionManager should have tests verifying merge behavior (multiple providers active)
- Integration tests for each UI component verifying that action-based navigation works identically to the current keyboard-based navigation
- Manual testing on touch devices (or Chrome DevTools device emulation) for the touch provider
- Regression testing: existing keyboard and gamepad functionality must work identically after migration

## Open Questions

1. **Should we support rebindable controls?** The action system makes this straightforward — the mapping config can be loaded from localStorage. Not needed for MVP but the architecture supports it.
2. **Mouse position for aim/cursor** — This doesn't map cleanly to an "action." Keep it as a separate query on ActionManager (`getMousePosition()`) or on the MouseProvider directly?
3. **Touch attack: tap vs button?** Tapping in the game world could mean "move here" in some games, but with a virtual joystick for movement, a dedicated attack button is cleaner. However, tapping on an enemy could be an alternative attack input.
4. **Menu-specific actions (selectSlot1-4, selectFloor0-9):** These are only relevant in specific UI contexts. Should they be actions, or should the UI components handle number key / tap input directly since they're so context-specific?
5. **Haptic feedback on touch?** The Vibration API is available on most mobile browsers. Worth adding tactile feedback for attacks and taking damage?

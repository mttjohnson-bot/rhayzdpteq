# Meta Quest 2 WebXR Support Plan

**Status:** Planning
**Created:** 2026-03-07
**Depends on:** Input abstraction (completed), Camera system (completed)

---

## Problem Statement

The game currently runs in the Meta Quest 2's browser but presents two issues:

1. **No immersive VR mode** — The game renders as a flat 2D browser panel. The player looks at the 3D world through a viewport rather than being inside it. To feel immersive, the game needs to enter a WebXR `immersive-vr` session where the 3D scene fills the player's field of view and head tracking controls the camera.

2. **Controller input not detected as gamepad** — Quest Touch controllers are not recognized by the standard Gamepad API in the Quest browser context. Instead, the browser treats controller interactions as touch/pointer events on the page. The controllers only expose proper gamepad state through the WebXR Gamepads Module (`XRInputSource.gamepad`), which requires an active XR session.

---

## How WebXR Solves These Problems

### Panel → Immersive VR

The [WebXR Device API](https://immersiveweb.dev/) lets a web page request an `immersive-vr` session from the browser. When granted:

- The browser hands control of the headset's display to the page.
- Three.js renders stereoscopic frames (one per eye) via its built-in `WebXRManager`.
- The headset's orientation/position sensors drive the camera automatically.
- The player is *inside* the 3D scene — looking around physically looks around in-game.

Three.js has first-class support for this. The key changes are:

1. Set `renderer.xr.enabled = true` on the `WebGLRenderer`.
2. Replace `requestAnimationFrame(loop)` with `renderer.setAnimationLoop(loop)` — this delegates frame scheduling to the XR session at the headset's native refresh rate (72 Hz on Quest 2).
3. Add a [VRButton](https://threejs.org/docs/pages/VRButton.html) to the DOM — clicking "Enter VR" requests the immersive session.
4. The camera is managed by the XR session; manual camera positioning yields to headset tracking.

### Touch Events → XR Controller Input

Inside an active XR session, Quest Touch controllers are exposed as `XRInputSource` objects (accessed via `xrSession.inputSources`). Each `XRInputSource` has a `.gamepad` property conforming to the [WebXR Gamepads Module](https://www.w3.org/TR/webxr-gamepads-module-1/) spec. This gamepad object has the familiar `buttons[]` and `axes[]` arrays, but they only exist within an XR session — they are *not* the same as `navigator.getGamepads()`.

The `xr-standard` mapping for Quest Touch controllers:

| Index | Button | Notes |
|-------|--------|-------|
| 0 | Trigger | Analog (0.0–1.0) |
| 1 | Grip/Squeeze | Analog (0.0–1.0) |
| 3 | Thumbstick press | Digital |
| 4 | A / X | Digital |
| 5 | B / Y | Digital |

| Axis | Control |
|------|---------|
| 0 | Thumbstick X (-1 left, +1 right) |
| 1 | Thumbstick Y (-1 forward, +1 back) |

Each hand has its own `XRInputSource` with its own gamepad — so the player has two thumbsticks and two sets of buttons available.

---

## Architecture Fit

The existing codebase is well-suited for VR integration:

| System | Current State | VR Adaptation |
|--------|--------------|---------------|
| **Input** | ActionManager with pluggable providers (Keyboard, Mouse, Gamepad, Touch) | Add `XRControllerProvider` — same interface, reads from `XRInputSource.gamepad` |
| **Camera** | `GameCamera` with `third-person` and `first-person` modes | Add `vr` mode — camera position/rotation driven by XR session pose |
| **Renderer** | `SceneManager` wraps `WebGLRenderer` | Enable `renderer.xr.enabled`, switch to `setAnimationLoop` |
| **Game loop** | `requestAnimationFrame` in `Game.ts` | `renderer.setAnimationLoop` (works for both XR and non-XR) |
| **UI overlays** | DOM-based (`<div>` elements over the canvas) | Phase 4 concern — DOM overlays invisible in VR, need 3D UI or XR DOM Overlay API |
| **Game logic** | All device-agnostic, reads semantic actions | No changes needed |

---

## Phased Implementation Plan

### Phase 1: WebXR Session & Immersive Rendering

**Goal:** Player can click "Enter VR" on Quest 2 and see the 3D dungeon world around them with head tracking.

**Changes:**

1. **SceneManager: Enable XR rendering**
   - Set `renderer.xr.enabled = true`.
   - Switch from `requestAnimationFrame` to `renderer.setAnimationLoop(callback)` in `Game.ts`. This works for both XR and non-XR — in flat mode it behaves identically to `requestAnimationFrame`, and in XR mode it syncs to the headset's refresh rate.
   - No changes needed to scene, lighting, or geometry — they render the same in stereo.

2. **VR entry button**
   - Import `VRButton` from `three/addons/webxr/VRButton.js`.
   - Add "Enter VR" button to the DOM (only visible when `navigator.xr.isSessionSupported('immersive-vr')` resolves true).
   - The button calls `navigator.xr.requestSession('immersive-vr')` which Three.js handles internally.

3. **Camera: Add VR mode**
   - Add a `'vr'` case to `CameraViewMode`.
   - In VR mode, the `GameCamera.follow()` method positions a "camera rig" `THREE.Group` at the player's world position but does *not* call `camera.lookAt()` — the XR session controls orientation.
   - The Three.js camera is added as a child of the rig group. This means the player's physical head movements are relative to the rig's position (the player character's location in the world).
   - On XR session start → switch to `'vr'` mode. On session end → revert to previous mode.

4. **XR session lifecycle**
   - Listen for `renderer.xr` session events (`sessionstart`, `sessionend`).
   - On session start: switch camera to VR mode, hide DOM UI.
   - On session end: restore previous camera mode, show DOM UI.

5. **Performance adjustments for Quest 2**
   - Cap pixel ratio to 1.0 during XR (Quest 2 already renders at native resolution per eye).
   - Consider reducing shadow map size to 512x512 in VR.
   - Extend fog near distance to avoid clipping artifacts in first-person perspective.
   - Quest 2 target: 72 FPS (the headset's native refresh rate). The game already targets 60 FPS on Chromebooks with instanced voxel rendering, so this should be achievable.

**Estimated scope:** ~200 lines of new/modified code across 3-4 files.

**Validation:** Open the game in Quest 2 browser → "Enter VR" button appears → clicking it enters immersive mode → head tracking looks around the dungeon scene → exiting VR returns to flat panel mode.

---

### Phase 2: XR Controller Input Provider

**Goal:** Quest Touch controllers work as a game input device — move, attack, interact, open menus.

**Changes:**

1. **New provider: `XRControllerProvider`**
   - Implements the existing `InputProvider` interface (`poll()`, `endFrame()`, `destroy()`).
   - Reads button/axis state from `XRInputSource.gamepad` objects (accessed via `renderer.xr.getSession().inputSources`).
   - Maps Quest Touch controls to game actions:

   | Controller | Input | Game Action |
   |------------|-------|-------------|
   | Right hand | Thumbstick | `moveX` / `moveZ` (movement) |
   | Right hand | Trigger (index 0) | `attack` |
   | Right hand | A button (index 4) | `interact`, `uiConfirm`, `respawn` |
   | Right hand | B button (index 5) | `toggleInventory`, `uiCancel` |
   | Left hand | Thumbstick | `lookX` / `lookZ` (camera/turn — new actions for VR) |
   | Left hand | Trigger (index 0) | `block` (future) |
   | Left hand | X button (index 4) | `toggleSkillTree` |
   | Left hand | Y button (index 5) | `toggleMenu` |
   | Either | Grip (index 1) | `dodge` (future) |

   - Deadzone filtering on thumbstick axes (reuse existing `GAMEPAD_DEADZONE` constant).
   - The provider reports `active: true` only during an active XR session.

2. **ActionManager integration**
   - Register `XRControllerProvider` alongside existing providers.
   - The ActionManager already merges all providers — no changes to the merge logic.
   - Add `'xr'` as a primary device type for device-adaptive UI hints.

3. **New input actions (if needed)**
   - `lookX` / `lookZ` — smooth turning via left thumbstick (for seated play or comfort mode). In VR, head tracking handles look direction, but snap/smooth turning is a standard VR comfort option.
   - These actions can be added to the `InputAction` type without affecting existing code.

4. **Smooth/snap turning**
   - Left thumbstick X axis rotates the camera rig (not the camera itself — the XR session controls the camera).
   - Support both snap turning (45° or 90° increments) and smooth turning, configurable in settings.
   - This is a VR comfort feature that reduces motion sickness.

**Estimated scope:** ~150-200 lines for the provider, ~50 lines for ActionManager integration, ~50 lines for turning logic.

**Validation:** Enter VR → right thumbstick moves the player → trigger attacks → A button interacts → left thumbstick turns → all menu buttons work.

---

### Phase 3: VR Comfort & Player Experience

**Goal:** Make the VR experience comfortable and intuitive beyond basic functionality.

**Changes:**

1. **Comfort options in Settings menu**
   - Snap turn vs. smooth turn toggle.
   - Turn speed slider (for smooth turn).
   - Snap angle selector (30° / 45° / 90°).
   - Vignette on movement (reduces peripheral vision during locomotion to prevent motion sickness).

2. **Teleport movement (optional alternative)**
   - Thumbstick-forward shows an arc/target on the floor.
   - Release to teleport to that position.
   - Alternative to continuous thumbstick movement for players who get motion sick.
   - This is a "nice to have" — continuous movement already works via the action system.

3. **Player body visibility**
   - In VR, the player is "inside" their character cube. The player mesh should be hidden or replaced with:
     - Nothing (disembodied, simplest approach).
     - Visible hands matching controller positions (uses `renderer.xr.getControllerGrip()`).
     - A translucent body below the viewpoint.

4. **Scale calibration**
   - Ensure the voxel world scale feels right in VR. The current tile size is 1 unit = 1 meter (Three.js default). If tiles feel too large or small, adjust the camera rig scale or tile constants.
   - Player eye height (`FP_EYE_HEIGHT = 1.4`) should match the VR user's real-world height (use XR reference space floor level).

5. **Recenter button**
   - Allow the player to reset their position/orientation if they drift. Map to a controller combo (e.g., hold both grips + press a thumbstick).

**Estimated scope:** ~300-400 lines across settings UI, comfort systems, and player rendering.

---

### Phase 4: VR UI — Menus & HUD in 3D Space

**Goal:** All game UI (HUD, inventory, skill tree, menus) is usable in VR.

This is the most complex phase because all current UI is DOM-based (`<div>` elements positioned over the canvas). In an immersive VR session, DOM elements are invisible.

**Approach options (pick one or combine):**

#### Option A: WebXR DOM Overlay API (Simplest)

The [DOM Overlay API](https://immersive-web.github.io/dom-overlays/) allows a single DOM element to be displayed as a transparent overlay in XR. Meta Quest browser supports this.

- Request the session with `domOverlay: { root: document.getElementById('ui-overlay') }`.
- The existing `#ui-overlay` div and all its children render on a transparent layer in front of the VR scene.
- Controller raycasting hits the DOM elements for interaction.

**Pros:** Reuses 100% of existing UI code. No 3D UI development needed.
**Cons:** UI feels "flat" and floats in space. Limited to one root element. Not all browsers support it. May feel less immersive.

#### Option B: Three.js World-Space UI (Most Immersive)

Render UI elements as 3D meshes in the scene (e.g., using `CSS3DRenderer`, `HTMLMesh`, or custom sprite-based UI).

- HUD elements (health bar, XP, floor indicator) rendered as billboarded sprites near the player.
- Menus (inventory, skill tree, settings) rendered on floating panels in 3D space.
- Controller laser pointer for interaction (raycasting from controller to UI panels).

**Pros:** Fully immersive, feels native to VR.
**Cons:** Major rewrite of all 15+ UI components. Significant development effort.

#### Option C: Hybrid (Recommended)

- Use DOM Overlay for complex menus (inventory, skill tree, settings) — these are already built, tested, and accessible.
- Replace the HUD with lightweight 3D elements (health orb near left wrist, minimap on right wrist, damage numbers already in 3D space).
- This balances effort vs. immersion.

**Estimated scope:**
- Option A: ~50-100 lines (session options + pointer events).
- Option B: ~2000+ lines (full UI rewrite).
- Option C: ~300-500 lines (DOM overlay setup + 3D HUD elements).

---

### Phase 5: VR-Specific Gameplay Enhancements

**Goal:** Take advantage of VR capabilities for gameplay features that wouldn't work on a flat screen.

These are stretch goals — the game is fully playable after Phases 1-3 with basic UI from Phase 4.

1. **Motion-controlled combat**
   - Swing controller to attack (use controller velocity from XR pose data).
   - Shield on left hand (raise to block).
   - This would replace the button-press attack with physical gestures.

2. **Hand tracking** (Quest 2 supports this)
   - Play without controllers using hand tracking API.
   - Pinch to interact, open palm to block, punch to attack.
   - Experimental — hand tracking latency may not be suitable for action combat.

3. **Spatial audio**
   - Position audio sources in 3D space (enemy footsteps behind you, ambient dungeon sounds).
   - Web Audio API `PannerNode` + Three.js `PositionalAudio`.
   - Depends on the Sound & Music system being built first.

4. **Room-scale movement**
   - Allow physical walking within the play space to move in-game (in addition to thumbstick).
   - Use XR reference space position delta to move the player entity.

---

## VR Detection Strategy

To detect whether the player is using a VR headset and offer the VR entry point:

```typescript
async function checkVRSupport(): Promise<boolean> {
  if (!('xr' in navigator)) return false;
  try {
    return await navigator.xr!.isSessionSupported('immersive-vr');
  } catch {
    return false;
  }
}
```

- If `true`: show "Enter VR" button on the title screen and/or HUD.
- If `false`: no VR UI shown, game runs normally.
- The game remains fully functional in flat mode — VR is additive, not required.

---

## Why Quest Controllers Don't Work as Standard Gamepads

When viewing a regular web page (non-XR), the Quest browser translates controller inputs into touch/pointer events because:

1. The standard Gamepad API (`navigator.getGamepads()`) is designed for gamepads connected to the *system*, not XR controllers attached to the *headset*.
2. XR controllers have spatial tracking (6DOF position + orientation) that the Gamepad API cannot represent.
3. The WebXR spec deliberately separates XR input from the Gamepad API — XR controllers expose their button/axis state through `XRInputSource.gamepad` only during an active XR session.
4. In non-immersive browsing, Quest browser treats controller clicks as pointer events to enable web navigation.

**Bottom line:** To get proper gamepad-like input from Quest controllers, the game *must* enter an XR session. There is no workaround within the standard Gamepad API. This is by design in the WebXR specification.

---

## Technical Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Quest 2 GPU can't sustain 72 FPS | Judder, nausea | Already using instanced rendering, simple shaders. Can disable shadows, reduce fog, lower geometry in VR mode. Profile early in Phase 1. |
| DOM Overlay API not supported in all browsers | UI invisible in VR | Feature-detect `domOverlay` support. Fallback: minimal 3D HUD with pause-to-menu flow. |
| Motion sickness from continuous movement | Poor player experience | Provide snap turn, vignette, and teleport options (Phase 3). Default to comfort settings. |
| XR session conflicts with game loop timing | Frame drops, input lag | `renderer.setAnimationLoop` handles this — Three.js manages frame timing for both XR and non-XR. |
| Existing unit tests break with XR code paths | CI failures | Guard all XR code behind feature detection (`navigator.xr` checks). Mock XR APIs in tests. |

---

## Phase Priorities & Dependencies

```
Phase 1 (Immersive Rendering)
    ↓
Phase 2 (XR Controller Input)
    ↓
Phase 3 (VR Comfort)
    ↓
Phase 4 (VR UI)
    ↓
Phase 5 (VR Gameplay — stretch)
```

Phases 1 and 2 together deliver a playable VR experience. Phase 3 makes it comfortable. Phase 4 makes the UI usable without leaving VR. Phase 5 is optional enhancement.

**Minimum viable VR:** Phases 1 + 2 + Option A from Phase 4 (DOM Overlay). This gets the player into the game world with working controllers and visible UI with the least development effort.

---

## References

- [Three.js WebXRManager Docs](https://threejs.org/docs/api/en/renderers/webxr/WebXRManager.html)
- [Three.js VRButton](https://threejs.org/docs/pages/VRButton.html)
- [WebXR Device API](https://immersiveweb.dev/)
- [WebXR Gamepads Module (W3C)](https://www.w3.org/TR/webxr-gamepads-module-1/)
- [Meta Quest Controller Docs](https://developers.meta.com/horizon/documentation/web/webxr-pro-controller/)
- [Immersive Web Emulator (Chrome Extension)](https://chromewebstore.google.com/detail/immersive-web-emulator/cgffilbpcibhmcfbgggfhfolhkfbhmik)
- [Meta WebXR Mixed Reality Docs](https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/)

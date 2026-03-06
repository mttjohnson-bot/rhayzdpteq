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

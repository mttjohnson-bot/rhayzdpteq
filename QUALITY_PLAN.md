# Testing & Quality Improvement Roadmap

This document is the canonical reference for planned testing, tooling, and security improvements.
Each phase is self-contained and can be requested as a discrete unit of work in a future session.

To begin work on a specific phase, reference this file in a new Claude Code session with a prompt
like: *"Please implement Phase N from QUALITY_PLAN.md."*

---

## Current State Baseline

Captured 2026-02-20. Update this section as phases are completed.

| Area | Status |
|------|--------|
| **Build** | `tsc && vite build` succeeds; 122 KB gzipped production bundle |
| **TypeScript** | Strict mode enabled; `npx tsc --noEmit` passes |
| **Linting** | ESLint v9 + Prettier installed; `npm run lint` and `npm run format:check` both pass |
| **Testing** | Vitest with 335 tests across 13 files; 98% statement, 94% branch, 100% function coverage on pure-logic modules |
| **Pre-commit hooks** | None |
| **CI** | `.github/workflows/deploy.yml` deploys to GitHub Pages on push to main; `.github/workflows/quality.yml` runs lint, format check, and typecheck on PRs and pushes to main |
| **Security** | No Dependabot, no CodeQL, no npm audit integration |
| **Dependencies** | `three` (runtime); `typescript`, `vite`, `@types/three`, `eslint`, `@eslint/js`, `typescript-eslint`, `prettier`, `eslint-config-prettier` (dev) |

### Testability Map

The codebase has good separation of concerns. Pure-logic modules (no Three.js/DOM dependency)
that are immediately testable:

| Directory | Pure-Logic Modules | Needs Three.js/DOM |
|-----------|-------------------|--------------------|
| `src/utils/` | `math.ts`, `EventBus.ts`, `constants.ts` | — |
| `src/rpg/` | `Stats.ts`, `Leveling.ts`, `LootTable.ts`, `SkillTree.ts`, `Inventory.ts` | `LootDrop.ts` |
| `src/dungeon/` | `types.ts`, `FloorConfig.ts`, `DungeonGenerator.ts`, `ObstacleSystem.ts` | `FloorRenderer.ts` |
| `src/game/` | `SaveManager.ts`, `InputAction.ts` | `Game.ts`, `Player.ts`, `Camera.ts`, `Hub.ts`, `AssetLibrary.ts`, `ActionManager.ts` (DOM events via providers) |
| `src/combat/` | — | `CombatSystem.ts`, `Enemy.ts`, `Boss.ts`, `TestDummy.ts` |
| `src/rendering/` | — | All files |
| `src/ui/` | — | All files |

---

## Phase Summary

| Phase | Focus | Key Tools | Status |
|-------|-------|-----------|--------|
| 1 | Linting & Formatting | ESLint v9, Prettier | [x] |
| 2 | Unit & Integration Testing | Vitest, @vitest/coverage-v8 | [x] |
| 3 | Build & Developer Experience | Husky, lint-staged, bundle analysis | [x] |
| 4 | E2E & Visual Testing | Playwright | [ ] |
| 5 | Security Scanning | Dependabot, CodeQL, npm audit | [ ] |
| 6 | Continuous Quality Consolidation | Coverage thresholds, PR status checks | [ ] |

Update the Status column as phases are completed.

---

## Phase 1: Linting & Formatting

**Goal:** Make the existing `npm run lint` script actually work, enforce consistent code style,
and catch type-unsafe patterns before they are committed.

### Why this first

Linting has the lowest setup cost and highest immediate value. The `lint` script already exists in
`package.json` but ESLint is not installed, so it fails immediately. Fixing this unblocks all
future CI quality checks.

### Packages to Install

```sh
npm install -D eslint @eslint/js typescript-eslint
npm install -D prettier eslint-config-prettier
```

> **Note:** Use the unified `typescript-eslint` package (v8+), not the older separate
> `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` packages. The unified
> package provides a `tseslint.config()` helper designed for ESLint v9 flat config.

### Files to Create or Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `eslint.config.js` | ESLint v9 flat config with TypeScript rules |
| Create | `.prettierrc` | Prettier formatting options |
| Create | `.prettierignore` | Exclude dist/, node_modules/, *.md |
| Modify | `package.json` | Fix lint script; add `format` and `format:check` scripts |
| Create | `.github/workflows/quality.yml` | Run lint + typecheck on every PR and push to main |

### ESLint Configuration Notes

- Use ESLint v9 flat config (`eslint.config.js`, not `.eslintrc`)
- Import `tseslint` from `typescript-eslint` and use `tseslint.config()` helper
- Extend `tseslint.configs.recommended` (replaces the old `@typescript-eslint/recommended` plugin ruleset)
- Enable `@typescript-eslint/no-explicit-any` as a warning
- Enable `@typescript-eslint/no-unused-vars` as an error
- Disable `@typescript-eslint/no-empty-function` if needed for Three.js lifecycle patterns
- Add `eslint-config-prettier` last to turn off rules that conflict with Prettier

Example skeleton:

```js
// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
  { ignores: ['dist/'] },
);
```

### Updated package.json Scripts

```json
"lint":         "eslint src/ --max-warnings 0",
"lint:fix":     "eslint src/ --fix",
"format":       "prettier --write \"src/**/*.ts\"",
"format:check": "prettier --check \"src/**/*.ts\""
```

### Success Criteria

- `npm run lint` exits 0 with no errors against the existing codebase
- `npm run format:check` exits 0 (or a single `npm run format` pass is applied first)
- `.github/workflows/quality.yml` runs lint on every PR; merge is blocked on failure
- TypeScript type check (`npx tsc --noEmit`) is also run in the quality workflow

---

## Phase 2: Unit & Integration Testing

**Goal:** Cover the pure-logic portions of the codebase with automated tests. These are the
modules that do not depend on the browser DOM or Three.js WebGL renderer.

### Why this second

Unit tests provide the safety net that makes all future refactoring safe. The modules in
`src/utils/`, `src/rpg/`, and `src/dungeon/` contain pure algorithms that are straightforward
to test without any browser context.

### Packages to Install

```sh
npm install -D vitest @vitest/coverage-v8 jsdom
```

Vitest is the correct choice for this stack — it is native to Vite, reuses the same config and
transforms, and is TypeScript-first with no additional setup.

### Files to Create or Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `vitest.config.ts` | Vitest config (environment, coverage, path aliases) |
| Modify | `tsconfig.json` | Add `"tests"` to the `include` array |
| Create | `tests/` directory | Root test directory mirroring `src/` structure |
| Modify | `package.json` | Replace placeholder test script; add test:watch and test:coverage |
| Modify | `.github/workflows/quality.yml` | Add test job with coverage artifact upload |

### Test Files to Create

Tests are grouped by priority. **Core** tests cover the most critical and most testable modules.
**Extended** tests round out coverage for remaining pure-logic files.

#### Core Tests

| Test File | Modules Under Test | What to Verify |
|-----------|-------------------|----------------|
| `tests/utils/math.test.ts` | `src/utils/math.ts` | clamp, lerp, lerpVector3; edge cases (NaN, Infinity, zero, negative) |
| `tests/utils/EventBus.test.ts` | `src/utils/EventBus.ts` | subscribe/emit/unsubscribe; listener ordering; no duplicate calls; cleanup; emitting unknown event is safe |
| `tests/utils/constants.test.ts` | `src/utils/constants.ts` | Key constants are defined, numeric, and within valid ranges; enemy type IDs are unique |
| `tests/rpg/Stats.test.ts` | `src/rpg/Stats.ts` | Derived stat formulas; bonus stacking; clamping to min/max; modifier application |
| `tests/rpg/Leveling.test.ts` | `src/rpg/Leveling.ts` | XP thresholds; level-up logic; max level boundary; XP overflow; skill point grants |
| `tests/rpg/LootTable.test.ts` | `src/rpg/LootTable.ts` | Drop generation; rarity distribution; no undefined items; all item slots represented; weapon subtypes assigned |
| `tests/dungeon/DungeonGenerator.test.ts` | `src/dungeon/DungeonGenerator.ts` | Room count in range; rooms do not overlap; all rooms connected via corridors; valid tile types; boss room present; exit tile reachable |
| `tests/dungeon/FloorConfig.test.ts` | `src/dungeon/FloorConfig.ts` | All 10 floors have required fields; colors are valid hex numbers; boss defined for each floor; enemy types reference valid IDs |
| `tests/game/SaveManager.test.ts` | `src/game/SaveManager.ts` | Save/load round-trip; slot isolation; corrupt data handled gracefully; migration of old save formats (mock localStorage) |

#### Extended Tests

| Test File | Modules Under Test | What to Verify |
|-----------|-------------------|----------------|
| `tests/rpg/SkillTree.test.ts` | `src/rpg/SkillTree.ts` | All nodes defined with valid branches/tiers; prerequisite chains are valid; allocating points applies modifiers correctly; cannot exceed maxRank; resetting tree restores all points |
| `tests/rpg/Inventory.test.ts` | `src/rpg/Inventory.ts` | Equip/unequip swaps correctly; bag capacity enforced; dropping items removes them; weapon migration backfills subtype; stat modifiers from equipment are collected; full bag rejects new items |
| `tests/dungeon/ObstacleSystem.test.ts` | `src/dungeon/ObstacleSystem.ts` | Mud applies speed reduction; water applies damage reduction; fire applies burn DPS; trap deals one-time explosion damage; no effects on normal tiles; effects reset each frame |
| `tests/dungeon/types.test.ts` | `src/dungeon/types.ts` | TileType and ObstacleType enums have expected members; no duplicate values |

### What NOT to Unit Test

Do not attempt to unit test the following — they require a WebGL context or DOM and belong in
E2E tests (Phase 4):

- `src/game/Game.ts`, `src/game/Player.ts`, `src/game/Camera.ts`, `src/game/Hub.ts`, `src/game/AssetLibrary.ts`
- `src/game/ActionManager.ts` and `src/game/providers/*.ts` (bind to `window` events; test via jsdom or E2E)
- `src/rpg/LootDrop.ts` (creates Three.js meshes for world drops)
- `src/dungeon/FloorRenderer.ts` (renders dungeon with InstancedMesh)
- All files in `src/combat/` (enemies, bosses, and combat system depend on Three.js objects)
- All files in `src/ui/`
- All files in `src/rendering/`

If any module mixes pure logic with Three.js calls (e.g., `CombatSystem.ts` has damage
calculation interleaved with mesh updates), extract the pure logic into a separate helper
file and test that helper in isolation.

### Updated package.json Scripts

```json
"test":          "vitest run",
"test:watch":    "vitest",
"test:coverage": "vitest run --coverage"
```

### Success Criteria

- `npm test` runs all unit tests and exits 0
- `npm run test:coverage` generates a coverage report in `coverage/`
- Test coverage ≥ 80% lines and functions for `src/utils/`, `src/rpg/`, `src/dungeon/`
- GitHub Actions uploads the coverage report as a workflow artifact on every run

---

## Phase 3: Build & Developer Experience

**Goal:** Add pre-commit quality gates so issues are caught locally before they reach CI, and
add bundle analysis tooling to monitor asset size over time.

### Why this third

Pre-commit hooks depend on having a working linter (Phase 1). Once lint and tests exist, it makes
sense to enforce them at commit time so CI failures become rarer and faster to fix.

### Packages to Install

```sh
npm install -D husky lint-staged rollup-plugin-visualizer
```

### Files to Create or Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `.husky/pre-commit` | Run lint-staged on every commit |
| Modify | `package.json` | Add lint-staged config; add `prepare` script for Husky |
| Modify | `vite.config.ts` | Add rollup-plugin-visualizer (gated behind `ANALYZE=true` env var) |
| Add script | `package.json` | `"analyze": "ANALYZE=true vite build"` |

### lint-staged Configuration (in package.json)

```json
"lint-staged": {
  "src/**/*.ts": [
    "eslint --fix --max-warnings 0",
    "prettier --write"
  ]
}
```

### Husky Setup

After installing Husky, initialize it:
```sh
npx husky init
```
Then write the pre-commit hook:
```sh
echo "npx lint-staged" > .husky/pre-commit
```

### Bundle Analysis Notes

- Use `rollup-plugin-visualizer` with `gzipSize: true` to see the real download footprint
- Performance target from CLAUDE.md: keep initial download under 5MB
- `npm run analyze` opens `dist/stats.html` with an interactive treemap of all modules
- Check Three.js chunk size (expected to be the dominant dependency at ~600 KB minified+gzip)

### Success Criteria

- `git commit` automatically lints and formats staged TypeScript files
- Commits are blocked if ESLint errors exist after auto-fix
- `npm run analyze` generates a bundle visualization at `dist/stats.html`
- Total gzipped bundle size remains under 5 MB

---

## Phase 4: E2E & Visual Testing

**Goal:** Test the actual game running in a real browser to verify the full stack works end-to-end:
loading, title screen rendering, starting a new game, and entering the hub.

### Why this fourth

E2E tests require a working production build. By Phase 4, the build is already validated by lint,
type-check, and unit tests. Playwright is the correct choice over Cypress because it is better
suited for headless CI (no GUI requirement), natively supports multiple browsers, and integrates
cleanly with GitHub Actions.

### Packages to Install

```sh
npm install -D @playwright/test
npx playwright install --with-deps chromium
```

### Files to Create or Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `playwright.config.ts` | Playwright config: base URL, headless Chromium, screenshot on failure, snapshot directory |
| Create | `tests/e2e/` directory | E2E test files (separate from unit tests) |
| Create | `tests/e2e/game-load.test.ts` | Game loads without JS errors, canvas element appears |
| Create | `tests/e2e/menu.test.ts` | Title screen renders, new game button is visible, save slots shown |
| Create | `tests/e2e/new-game.test.ts` | Can start a new game and the hub scene loads |
| Create | `tests/e2e/hub-navigation.test.ts` | Player can move in the hub; portal is interactive |
| Modify | `package.json` | Add `"test:e2e"` and `"test:e2e:update-snapshots"` scripts |
| Modify | `.github/workflows/quality.yml` | Add E2E job: build, start preview server, run Playwright |

### E2E Test Strategy

- Start tests against `npm run preview` (production build served locally, not dev server)
- Use `page.waitForSelector` for DOM assertions — do not rely on timing-based waits
- Do NOT test gameplay mechanics (combat, loot, etc.) in E2E — those belong in unit tests
- Capture screenshots on every failure; upload to CI as artifacts for debugging
- Keep E2E test suite small and focused on critical render paths only
- Listen for `console.error` events on the page and fail the test if any uncaught errors occur

### Visual Regression Testing

The title "Visual Testing" in this phase refers to screenshot-based regression testing using
Playwright's built-in snapshot comparison. This catches unintended visual changes to the title
screen, HUD, and menus without manual inspection.

- Use `expect(page).toHaveScreenshot()` for key screens (title, hub, inventory overlay)
- Store baseline screenshots in `tests/e2e/__snapshots__/` and commit them to the repo
- Configure a pixel-difference threshold (e.g., `maxDiffPixelRatio: 0.01`) to allow minor
  antialiasing differences across CI environments
- Use `npm run test:e2e:update-snapshots` to regenerate baselines after intentional UI changes
- CI uploads diff images as artifacts when a visual comparison fails

> **Limitation:** Three.js canvas rendering may produce minor pixel differences across GPU
> drivers. If this causes flaky CI results, restrict visual regression tests to the DOM-rendered
> UI elements (menus, HUD overlays) rather than the 3D canvas, or increase the threshold.

### Updated package.json Scripts

```json
"test:e2e":                  "playwright test",
"test:e2e:update-snapshots": "playwright test --update-snapshots"
```

### Success Criteria

- `npm run test:e2e` passes against a production build
- GitHub Actions runs E2E tests on every PR targeting `main`
- Screenshots on failure are uploaded as CI artifacts
- Game canvas renders and the title screen appears within 5 seconds on headless Chromium
- Visual regression baselines exist for the title screen and hub HUD
- A deliberate UI change fails the visual test until snapshots are updated

---

## Phase 5: Security Scanning

**Goal:** Automate dependency vulnerability detection, enable static analysis via CodeQL, and
audit error handling in critical files.

### Why this fifth

Security scanning is largely configuration work (GitHub-side) and is independent of the testing
infrastructure. It is placed fifth because having a stable CI baseline (Phases 1–4) makes
interpreting security workflow results easier.

### Files to Create or Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `.github/dependabot.yml` | Weekly automated dependency update PRs |
| Create | `.github/workflows/security.yml` | npm audit + CodeQL on schedule and on PR |
| Modify | `package.json` | Add `"audit"` script for local manual checks |

### Dependabot Configuration

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    target-branch: main
    labels: ["dependencies"]
  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
    labels: ["dependencies", "github-actions"]
```

### Security Workflow

```yaml
# .github/workflows/security.yml
# Triggers: push to main, PRs, weekly cron
# Jobs:
#   audit:  npm audit --audit-level=high
#   codeql: GitHub CodeQL analysis (javascript/typescript language pack)
```

### Error Handling Audit

Review these files for missing error handling and add defensive code where needed:

| File | Risk | Recommended Fix |
|------|------|----------------|
| `src/main.ts` | Uncaught `Game.start()` error crashes with no UI feedback | Add top-level try/catch with a user-visible error overlay (e.g., a red `<div>` with the error message) |
| `src/game/SaveManager.ts` | `localStorage` can throw in private browsing or when storage is full | Wrap all `localStorage.getItem`/`setItem`/`removeItem` calls in try/catch; return safe defaults on read failure |
| `src/dungeon/DungeonGenerator.ts` | Room placement loop could theoretically run forever if rooms cannot be placed | Add iteration cap (already has `attempts` parameter — verify it is enforced); add fallback to a minimal valid floor layout on failure |
| `src/game/providers/GamepadProvider.ts` | `navigator.getGamepads()` can throw in restrictive browser contexts | Wrap gamepad polling in try/catch; degrade gracefully to keyboard-only |
| `src/rpg/Inventory.ts` | Old save format migration could fail on deeply corrupt data | Add validation before `migrateItem`; skip items that cannot be recovered |
| **Global** | Unhandled promise rejections go silent in production | Add `window.addEventListener('unhandledrejection', ...)` in `main.ts` to log and surface errors |

### Updated package.json Scripts

```json
"audit": "npm audit --audit-level=high"
```

### Success Criteria

- `npm audit` reports zero high or critical vulnerabilities in production dependencies
- Dependabot creates automated PRs for outdated packages each week
- CodeQL finds no high-severity issues in the initial baseline scan
- All error handling gaps above are addressed with defensive code
- Unhandled promise rejections are caught and surfaced in the UI

---

## Phase 6: Continuous Quality Consolidation

**Goal:** Enforce coverage minimums as a CI gate, consolidate all checks into a coherent workflow
with clear job dependencies, and add visible quality badges to the README.

### Why this last

Consolidation only makes sense once all the underlying checks exist. This phase tightens
enforcement and makes quality visible to contributors.

### Files to Create or Modify

| Action | File | Purpose |
|--------|------|---------|
| Modify | `vitest.config.ts` | Add coverage thresholds that fail CI if coverage drops |
| Modify | `.github/workflows/quality.yml` | Define job dependency graph; add tsc check as separate job |
| Modify | `README.md` | Add CI status badge and coverage badge |

### Coverage Thresholds (in vitest.config.ts)

```ts
coverage: {
  provider: 'v8',
  include: ['src/utils/**', 'src/rpg/**', 'src/dungeon/**'],
  exclude: ['src/ui/**', 'src/rendering/**', 'src/game/**'],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 70,
  },
},
```

### Consolidated CI Workflow Job Graph

```
lint ──────┐
           ├──► unit-test ──► e2e-test
typecheck ─┘

security (independent, on schedule + PR)
```

All jobs must pass before a PR can be merged into `main`.

### Bundle Size Monitoring

Add a CI step that records the gzipped production bundle size and fails if it exceeds the
5 MB budget from CLAUDE.md. Approach:

1. After `vite build`, run a script that sums the gzipped sizes of all files in `dist/assets/`
2. Print the total to the CI log and compare against the threshold
3. Fail the job if the budget is exceeded
4. Optionally post a PR comment with the current bundle size vs. the main branch baseline

This can be done with a simple shell script or the `bundlesize` npm package. The
`rollup-plugin-visualizer` from Phase 3 provides detailed analysis; this step just enforces
the budget as a CI gate.

### README Badges

Add badges at the top of `README.md` for:
- CI/quality workflow status
- Deployment status (GitHub Pages)
- License (MIT)

### Success Criteria

- `npm run test:coverage` fails if coverage drops below thresholds
- Bundle size check fails CI if gzipped output exceeds 5 MB
- All quality jobs (lint, typecheck, unit-test, e2e-test) are required status checks on `main`
- README shows live build/test status badges
- A new contributor can run `npm install && npm test && npm run lint` and get a clean result

---

## Implementation Notes

### Key File Inventory

| Area | Files Added or Modified |
|------|------------------------|
| ESLint | `eslint.config.js`, `.prettierrc`, `.prettierignore` |
| Testing | `vitest.config.ts`, `tests/` (all subdirs), `playwright.config.ts`, `tests/e2e/` |
| Pre-commit | `.husky/pre-commit`, lint-staged config in `package.json` |
| Security | `.github/dependabot.yml`, `.github/workflows/security.yml` |
| CI | `.github/workflows/quality.yml` (new), `.github/workflows/deploy.yml` (existing, unchanged) |
| Config | `tsconfig.json` (add tests/ to include), `vite.config.ts` (add visualizer), `package.json` (new scripts) |

### Three.js Testing Boundary

Three.js requires a WebGL context that is not available in Node.js (the Vitest default
environment). The split is:

- **Unit test (Vitest/Node):** `src/utils/`, `src/rpg/` (except `LootDrop.ts`), `src/dungeon/` (except `FloorRenderer.ts`), `src/game/SaveManager.ts`
- **E2E test (Playwright/Chromium):** `src/game/` (most files), `src/combat/`, `src/ui/`, `src/rendering/`, `src/rpg/LootDrop.ts`, `src/dungeon/FloorRenderer.ts`

If a module mixes pure logic with Three.js calls, extract the pure logic into a separate helper
file and test that helper in isolation. Do not try to mock Three.js constructors in unit tests —
the mocks are fragile and the real behavior is better tested in E2E.

### Working on a Phase

When starting a phase in a new Claude Code session, use a prompt like:

> *"Please implement Phase N from QUALITY_PLAN.md. Read the phase section for the full
> specification, including packages to install, files to create/modify, and success criteria."*

The implementation agent should:

1. Read this file and locate the relevant phase section
2. Read the "Files to Create or Modify" table for that phase
3. Install listed packages
4. Create/modify listed files following the specifications
5. Run the relevant `npm run` commands to verify the phase works locally
6. Fix any issues until all success criteria pass
7. Update the Status column in the Phase Summary table at the top of this document
8. Update `CHANGELOG.md` with the changes made
9. Commit all changes and push to the feature branch

### Dependency Between Phases

Phases are designed to be implemented in order. Each phase builds on the previous:

- **Phase 1** has no prerequisites
- **Phase 2** requires Phase 1 (ESLint must work for CI to pass)
- **Phase 3** requires Phase 1 (lint-staged needs ESLint) and Phase 2 (pre-commit can run tests)
- **Phase 4** requires Phase 2 (Vitest config must exist) and a working `npm run build`
- **Phase 5** is largely independent but benefits from stable CI (Phases 1–4)
- **Phase 6** requires all previous phases (consolidates all checks into a coherent CI pipeline)

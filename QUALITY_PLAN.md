# Testing & Quality Improvement Roadmap

This document is the canonical reference for planned testing, tooling, and security improvements.
Each phase is self-contained and can be requested as a discrete unit of work in a future session.

---

## Phase Summary

| Phase | Focus | Key Tools | Status |
|-------|-------|-----------|--------|
| 1 | Linting & Formatting | ESLint v9, Prettier | [ ] |
| 2 | Unit & Integration Testing | Vitest, @vitest/coverage-v8 | [ ] |
| 3 | Build & Developer Experience | Husky, lint-staged, bundle analysis | [ ] |
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
npm install -D eslint @eslint/js @typescript-eslint/eslint-plugin @typescript-eslint/parser
npm install -D prettier eslint-config-prettier
```

### Files to Create or Modify

| Action | File | Purpose |
|--------|------|---------|
| Create | `eslint.config.js` | ESLint v9 flat config with TypeScript rules |
| Create | `.prettierrc` | Prettier formatting options |
| Create | `.prettierignore` | Exclude dist/, node_modules/, *.md |
| Modify | `package.json` | Fix lint script; add `format` and `format:check` scripts |
| Create | `.github/workflows/quality.yml` | Run lint on every PR and push to main |

### ESLint Configuration Notes

- Use ESLint v9 flat config (`eslint.config.js`, not `.eslintrc`)
- Base ruleset: `@typescript-eslint/recommended`
- Enable `@typescript-eslint/no-explicit-any` as a warning
- Enable `@typescript-eslint/no-unused-vars` as an error
- Disable `@typescript-eslint/no-empty-function` if needed for Three.js lifecycle patterns
- Add `eslint-config-prettier` last to turn off rules that conflict with Prettier

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

| Test File | Modules Under Test | What to Verify |
|-----------|-------------------|----------------|
| `tests/utils/math.test.ts` | `src/utils/math.ts` | clamp, lerp, distance, angle helpers; edge cases (NaN, Infinity, zero) |
| `tests/utils/EventBus.test.ts` | `src/utils/EventBus.ts` | subscribe/emit/unsubscribe; listener ordering; no duplicate calls; cleanup |
| `tests/utils/constants.test.ts` | `src/utils/constants.ts` | Key constants are defined, numeric, and within valid ranges |
| `tests/rpg/Stats.test.ts` | `src/rpg/Stats.ts` | Derived stat formulas; bonus stacking; clamping to min/max |
| `tests/rpg/Leveling.test.ts` | `src/rpg/Leveling.ts` | XP thresholds; level-up logic; max level boundary; XP overflow |
| `tests/rpg/LootTable.test.ts` | `src/rpg/LootTable.ts` | Drop generation; rarity distribution; no undefined items; seeded randomness |
| `tests/dungeon/DungeonGenerator.test.ts` | `src/dungeon/DungeonGenerator.ts` | Room count in range; rooms do not overlap; all rooms connected; valid tile types |
| `tests/dungeon/FloorConfig.test.ts` | `src/dungeon/FloorConfig.ts` | All 10 floors have required fields; colors are valid hex/CSS values |
| `tests/game/SaveManager.test.ts` | `src/game/SaveManager.ts` | Save/load round-trip; slot isolation; corrupt data handled gracefully (mock localStorage) |

### What NOT to Unit Test

Do not attempt to unit test the following — they require a WebGL context and belong in E2E tests:

- `src/game/Game.ts`, `src/game/Player.ts`, `src/game/Camera.ts`
- All files in `src/ui/`
- All files in `src/rendering/`

If `src/combat/CombatSystem.ts` has pure damage/hit calculation functions mixed with Three.js
objects, extract those calculations into a pure helper function before writing tests.

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
| Create | `playwright.config.ts` | Playwright config: base URL, headless Chromium, screenshot on failure |
| Create | `tests/e2e/` directory | E2E test files (separate from unit tests) |
| Create | `tests/e2e/game-load.test.ts` | Game loads without JS errors, canvas element appears |
| Create | `tests/e2e/menu.test.ts` | Title screen renders, new game button is visible |
| Create | `tests/e2e/new-game.test.ts` | Can start a new game and the hub scene loads |
| Modify | `package.json` | Add `"test:e2e"` script |
| Modify | `.github/workflows/quality.yml` | Add E2E job: build, start preview server, run Playwright |

### E2E Test Strategy

- Start tests against `npm run preview` (production build served locally, not dev server)
- Use `page.waitForSelector` for DOM assertions — do not rely on timing-based waits
- Do NOT test gameplay mechanics (combat, loot, etc.) in E2E — those belong in unit tests
- Capture screenshots on every failure; upload to CI as artifacts for debugging
- Keep E2E test suite small and focused on critical render paths only

### Updated package.json Scripts

```json
"test:e2e": "playwright test"
```

### Success Criteria

- `npm run test:e2e` passes against a production build
- GitHub Actions runs E2E tests on every PR targeting `main`
- Screenshots on failure are uploaded as CI artifacts
- Game canvas renders and the title screen appears within 5 seconds on headless Chromium

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

Review these files for missing error handling and add try/catch where needed:

| File | Risk | Recommended Fix |
|------|------|----------------|
| `src/game/SaveManager.ts` | localStorage can throw in private browsing | Wrap all `localStorage` calls in try/catch |
| `src/main.ts` | Uncaught Game.start() error crashes with no UI | Add top-level try/catch with user-visible error message |
| `src/dungeon/DungeonGenerator.ts` | Generation could theoretically loop forever | Add iteration limits and a fallback floor layout |

### Updated package.json Scripts

```json
"audit": "npm audit --audit-level=high"
```

### Success Criteria

- `npm audit` reports zero high or critical vulnerabilities in production dependencies
- Dependabot creates automated PRs for outdated packages each week
- CodeQL finds no high-severity issues in the initial baseline scan
- The three error handling gaps above are addressed with defensive code

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

### README Badges

Add badges at the top of `README.md` for:
- CI/quality workflow status
- Deployment status (GitHub Pages)
- License (MIT)

### Success Criteria

- `npm run test:coverage` fails if coverage drops below thresholds
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

- **Unit test (Vitest/Node):** `src/utils/`, `src/rpg/`, `src/dungeon/`, `src/game/SaveManager.ts`
- **E2E test (Playwright/Chromium):** `src/game/`, `src/combat/`, `src/ui/`, `src/rendering/`

If a module mixes pure logic with Three.js calls, extract the pure logic into a separate helper
file and test that helper in isolation.

### Working on a Phase

When starting a phase, reference this file and the relevant section above. The implementation
agent should:

1. Read the "Files to Create or Modify" table for that phase
2. Install listed packages
3. Create/modify listed files
4. Run the relevant `npm run` commands to verify the phase works locally
5. Commit all changes (including this file if Status column was updated)
6. Push to the feature branch and open a PR

Mark the phase complete in the Status column of the summary table at the top of this document.

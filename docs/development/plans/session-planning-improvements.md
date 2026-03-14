# Plan: Improve Session Planning for Claude Code Web Sessions

**Status:** Ready to implement
**Date:** 2026-03-14

## Problem

Claude Code sessions running in the web environment repeatedly waste effort on actions that are known to fail:

1. **`gh` CLI unavailable** — Sessions try `gh pr create`, fail, attempt to install it, fail to authenticate, try curl workarounds, and eventually give up. This burns significant context and time every session.
2. **Dependencies not installed** — Sessions run `npm run build` or `npx tsc --noEmit` before running `npm install`, get walls of "Cannot find module" errors, then spend time diagnosing what are actually just missing `node_modules`.
3. **E2E tests impossible** — Sessions attempt Playwright tests that can't run without a browser, wasting effort.

The root cause: CLAUDE.md assumes a fully-equipped local dev environment and gives no guidance for the constraints of Claude Code web sessions.

## Solution

Add a **"Claude Code Web Session Environment"** section to CLAUDE.md that preemptively documents what works and what doesn't, plus adjust existing sections that assume `gh` availability.

## Changes

### 1. Add new section to CLAUDE.md: "Claude Code Web Session Environment"

Add after the "Development Setup" section (before "Common Commands"). This section will cover:

- **`gh` CLI is not available.** Do not attempt to install or use it. Git operations (push, fetch, pull) work via the configured proxy remote, but GitHub API operations (creating PRs, viewing checks, commenting on issues) cannot be done from web sessions.
- **Always run `npm install` first.** Web sessions start with a clean environment. Before running any quality gates (lint, format, typecheck, build, test), run `npm install` to populate `node_modules/`. Without this, you'll get hundreds of "Cannot find module" errors for `three`, `vitest`, `@playwright/test`, etc. — these are not real issues, just missing dependencies.
- **E2E tests cannot run.** Playwright requires a browser binary. Web sessions don't have Chrome/Chromium available and Playwright's CDN download is blocked. Skip E2E tests entirely — they are a CI concern. Unit tests (`npm test`) do work after `npm install`.
- **No interactive terminal.** Commands requiring interactive input (e.g., `gh auth login`, `git rebase -i`) will hang or fail.

### 2. Update "Session Completion" section

Change the PR creation workflow to acknowledge the environment limitation:

- Keep the requirement to push the branch.
- Add: "If `gh` CLI is not available (as in Claude Code web sessions), report to the user that the branch has been pushed and provide the branch name so they can create the PR manually. Do not attempt to install `gh` or use curl workarounds — these do not work in web sessions."
- Keep the PR body format as a template the user can use.

### 3. Update "Quality Gates" section

Add a note at the top: "Ensure `npm install` has been run before executing any quality gates. In web sessions, dependencies are not pre-installed."

### 4. Update "E2E & Visual Regression Testing" section

Strengthen the existing note about web sessions: "In Claude Code web sessions, E2E tests cannot run at all — skip them entirely. They will be validated by CI after the branch is pushed."

## What NOT to change

- The overall structure and standing requirements (changelog, docs, session log) — these work fine.
- The git workflow — pushing works, it's only `gh` that's broken.
- The quality gate list itself — just add the `npm install` prerequisite.
- Unit tests — these work after `npm install`.

## Implementation

Single commit updating CLAUDE.md with the four changes above. No code changes needed.

#!/bin/bash
# SessionStart hook for Claude Code on the web: install dependencies so the
# quality gates (lint, format, tsc, build, unit tests) work immediately, and
# point Playwright at the pre-installed Chromium so E2E tests can run.
set -euo pipefail

# Web sessions only; a local checkout manages its own environment.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}"

# `npm ci`, not `npm install`: the container's npm (10.x) rewrites the npm 11
# lockfile on install, stripping `libc` fields from optional platform packages,
# which would leave package-lock.json modified at the start of every session.
# `npm ci` never writes the lockfile. Skip it when node_modules already matches
# the lockfile (npm's hidden lockfile is newer), e.g. on resume or compact.
if [ -f node_modules/.package-lock.json ] && [ node_modules/.package-lock.json -nt package-lock.json ]; then
  echo "session-start: node_modules is current, skipping npm ci" >&2
else
  echo "session-start: running npm ci" >&2
  npm ci --no-audit --no-fund >&2
fi

# @playwright/test expects a newer Chromium build than the one pre-installed at
# /opt/pw-browsers, so a bare `npm run test:e2e` fails with "Executable doesn't
# exist". playwright.config.ts honours PLAYWRIGHT_CHROMIUM_PATH; export it for
# the session when the pre-installed browser is present.
line='export PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium'
if [ -n "${CLAUDE_ENV_FILE:-}" ] && [ -x /opt/pw-browsers/chromium ] \
  && ! grep -qxF "$line" "$CLAUDE_ENV_FILE" 2>/dev/null; then
  echo "$line" >> "$CLAUDE_ENV_FILE"
fi

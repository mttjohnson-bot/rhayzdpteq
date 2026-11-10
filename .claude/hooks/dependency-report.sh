#!/bin/bash
# Dependency health report, run by session-start.sh. What a SessionStart hook
# prints to stdout is added to the agent's context, so this is how an agent
# starting work learns that the dependencies need a refresh first. The CI
# gates only fail on shipped dependencies, or on critical advisories in the
# build and test tooling, and Dependabot only runs monthly. After a quiet
# period the tooling can be behind, or carry known advisories that CI lets
# through.
#
# Read-only and best-effort: it audits the lockfile without installing
# anything, and it never fails the session. Any error just skips the report.
#
# Usage: dependency-report.sh [project-dir]

set -uo pipefail
cd "${1:-.}" || exit 0
[ -f package-lock.json ] || exit 0

# Matches Dependabot's monthly cadence, with slack for a skipped month.
STALE_DAYS=45

audit_json=$(timeout 60 npx -y npm@11 audit --json --package-lock-only 2>/dev/null) || true
counts=$(printf '%s' "$audit_json" | node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    try {
      const v = JSON.parse(s).metadata.vulnerabilities;
      console.log(`${v.critical} ${v.high} ${v.total}`);
    } catch {
      console.log("? ? ?");
    }
  });
' 2>/dev/null) || counts="? ? ?"
read -r critical high total <<< "$counts"

last_change=$(git log -1 --format=%cs -- package-lock.json 2>/dev/null)
age_days="?"
if [ -n "$last_change" ]; then
  age_days=$(( ( $(date +%s) - $(date -d "$last_change" +%s) ) / 86400 ))
fi

reasons=()
if [ "$critical" = "?" ]; then
  # A network blip is no reason to refresh, but an unchecked tree is no
  # reason to assume it is fine either.
  echo "Dependency check: npm audit could not run. Before development work, run"
  echo "\`npx -y npm@11 audit\` yourself; if it reports high or critical advisories,"
  echo "follow \"Dependency refresh before development\" in CLAUDE.md."
elif [ $((critical + high)) -gt 0 ]; then
  reasons+=("npm audit reports ${critical} critical and ${high} high advisories across the full tree")
fi
if [ "$age_days" != "?" ] && [ "$age_days" -gt "$STALE_DAYS" ]; then
  reasons+=("package-lock.json last changed ${age_days} days ago (${last_change})")
fi

if [ ${#reasons[@]} -eq 0 ]; then
  [ "$critical" = "?" ] && exit 0
  echo "Dependency check: OK. ${total} advisories, none high or critical; lockfile last changed ${age_days} days ago."
  exit 0
fi

echo "DEPENDENCY REFRESH NEEDED before starting development work:"
for r in "${reasons[@]}"; do
  echo "  - ${r}"
done
echo "Follow \"Dependency refresh before development\" in CLAUDE.md: refresh in its"
echo "own PR, merged before any feature PR. If the user only asked a question or"
echo "for a docs change, mention this to them instead of doing the refresh."
exit 0

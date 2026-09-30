#!/usr/bin/env bash
# Runs one CI lane inside its budget (implementation-plan.md 6.5) and exits with
# the lane's own status, so a failing test and a blown budget both fail the job.
#
#   within-budget.sh <seconds> <lane name> <command...>
#
# Until 30 September 2026 each lane did `if ! timeout …; then code=$?`, which
# reads the status of the negation, always 0, so no lane could fail
# (progress.md D177). Keep the `|| code=$?` form.
#
# Each `> palier@… <script>` header the command prints is stamped into the step
# summary with its offset, so a lane over budget says which phase took the time.
set -uo pipefail

budget=$1
lane=$2
shift 2

summary=${GITHUB_STEP_SUMMARY:-/dev/null}
start=$SECONDS
code=0

timeout --kill-after=30s "${budget}s" "$@" 2>&1 | while IFS= read -r line; do
  printf '%s\n' "$line"
  case $line in
    "> palier@"*) echo "- ${lane}, $((SECONDS - start))s: \`${line#> }\`" >> "$summary" ;;
  esac
done || code=$?

if [ "$code" -eq 124 ] || [ "$code" -eq 137 ]; then
  echo "::error::${lane} exceeded its ${budget} second budget (implementation-plan.md 6.5). Make the suite faster rather than raising the number."
fi
echo "**${lane}: $((SECONDS - start))s of the ${budget}s budget, exit ${code}.**" >> "$summary"
exit "$code"

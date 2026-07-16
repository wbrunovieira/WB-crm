#!/usr/bin/env bash
# Baseline/progress metric for the frontend senior-refactor plan.
# Counts .tsx files in src/components + src/app by line-count band.
# Usage: bash scripts/count-large-components.sh
set -euo pipefail
cd "$(dirname "$0")/.."

find src/components src/app -name '*.tsx' -exec wc -l {} \; | awk '
  { total++ }
  $1 > 200  { over200++ }
  $1 > 500  { over500++ }
  $1 > 1000 { over1000++ }
  END {
    printf "Frontend .tsx (src/components + src/app)\n"
    printf "  total files : %d\n", total
    printf "  > 200 lines : %d   (target < 40)\n", over200
    printf "  > 500 lines : %d   (target 0)\n", over500
    printf "  > 1000 lines: %d   (target 0)\n", over1000
  }'

echo ""
echo "Top 15 largest:"
find src/components src/app -name '*.tsx' -exec wc -l {} \; | sort -rn | head -15

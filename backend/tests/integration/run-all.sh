#!/usr/bin/env bash
# Phase 13 — run all integration tests sequentially.
# Usage: ./run-all.sh
# The backend must be running before executing this script.

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$DIR/.env" ]; then
  echo ""
  echo "  Error: .env file not found."
  echo "  Copy the example and fill in your values:"
  echo "    cp $DIR/.env.example $DIR/.env"
  echo ""
  exit 1
fi

# Confirm backend is reachable before spending time on test setup
API_BASE=$(grep API_BASE "$DIR/.env" | cut -d= -f2 | tr -d ' ')
API_BASE="${API_BASE:-http://localhost:5000/api/v1}"

echo ""
echo "  Checking backend at $API_BASE …"
if ! curl -sf "${API_BASE%/api/v1}/health" > /dev/null 2>&1; then
  echo "  Error: backend not responding at $API_BASE"
  echo "  Start it with: cd ~/elite-hub/backend && npm run dev"
  echo ""
  exit 1
fi
echo "  Backend online."

PASS=0
FAIL=0

run_test() {
  local name="$1"
  local file="$2"
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "  $name"
  echo "════════════════════════════════════════════════════════════"
  if node "$DIR/tests/$file"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
}

run_test "1/5  Wallet Concurrency"    "wallet-concurrency.js"
run_test "2/5  Webhook Replay"        "webhook-replay.js"
run_test "3/5  Token Revocation"      "token-revocation.js"
run_test "4/5  Provider Failover"     "provider-failover.js"
run_test "5/5  Rate Limiting"         "rate-limit.js"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "════════════════════════════════════════════════════════════"
echo ""

[ "$FAIL" -eq 0 ] && exit 0 || exit 1

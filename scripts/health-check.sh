#!/usr/bin/env bash
# Elite Hub health check — run manually or schedule every few minutes via cron.
# Checks: backend API, Redis, PM2 processes, Nginx, and disk space.
#
# Optional alerting: set ALERT_WEBHOOK_URL to a Slack/Discord webhook URL
# and any failure will POST a JSON message to it.
#
# Cron example (every 5 minutes):
#   */5 * * * * $HOME/elite-hub/scripts/health-check.sh >> $HOME/elite-hub/logs/health.log 2>&1

set -uo pipefail

API_BASE="${API_BASE:-http://localhost:5000}"
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
DISK_WARN_PERCENT="${DISK_WARN_PERCENT:-85}"

PASS=0
FAIL=0
MESSAGES=()

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
ok()   { log "  ✓  $*"; PASS=$((PASS + 1)); }
err()  { log "  ✗  $*"; FAIL=$((FAIL + 1)); MESSAGES+=("$*"); }

# ── 1. Backend API ────────────────────────────────────────────────────────────
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${API_BASE}/health" 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
  ok "Backend API responding (HTTP $HTTP_STATUS)"
else
  err "Backend API unreachable or unhealthy (HTTP $HTTP_STATUS)"
fi

# ── 2. Redis ──────────────────────────────────────────────────────────────────
if redis-cli ping 2>/dev/null | grep -q "PONG"; then
  ok "Redis responding"
else
  err "Redis not responding to PING"
fi

# ── 3. PM2 processes ──────────────────────────────────────────────────────────
for PROC in "elite-hub-api" "elite-hub-worker"; do
  STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys, json
procs = json.load(sys.stdin)
match = [p for p in procs if p.get('name') == '$PROC']
print(match[0]['pm2_env']['status'] if match else 'not_found')
" 2>/dev/null || echo "pm2_unavailable")

  if [ "$STATUS" = "online" ]; then
    ok "PM2 process '$PROC' online"
  elif [ "$STATUS" = "pm2_unavailable" ]; then
    err "PM2 not available — is it installed and running?"
  else
    err "PM2 process '$PROC' status: $STATUS"
  fi
done

# ── 4. Nginx ──────────────────────────────────────────────────────────────────
if systemctl is-active --quiet nginx 2>/dev/null; then
  ok "Nginx active"
else
  err "Nginx is not running (systemctl status nginx)"
fi

# ── 5. Disk space ─────────────────────────────────────────────────────────────
DISK_USED=$(df / | awk 'NR==2 {gsub(/%/,""); print $5}')
if [ "$DISK_USED" -lt "$DISK_WARN_PERCENT" ]; then
  ok "Disk usage ${DISK_USED}% (threshold ${DISK_WARN_PERCENT}%)"
else
  err "Disk usage ${DISK_USED}% exceeds threshold ${DISK_WARN_PERCENT}%"
fi

# ── 6. PostgreSQL ─────────────────────────────────────────────────────────────
if pg_isready -U elite_hub_user -d elite_hub -q 2>/dev/null; then
  ok "PostgreSQL accepting connections"
else
  err "PostgreSQL not accepting connections"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
log "Health check: $PASS passed, $FAIL failed"

# ── Optional webhook alert ────────────────────────────────────────────────────
if [ "$FAIL" -gt 0 ] && [ -n "$ALERT_WEBHOOK_URL" ]; then
  BODY=$(printf '{"text":"🚨 *Elite Hub health check failed* (%d issue(s)):\n%s"}' \
    "$FAIL" "$(printf '• %s\n' "${MESSAGES[@]}")")

  curl -s -X POST "$ALERT_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$BODY" > /dev/null 2>&1 && log "Alert sent to webhook" || log "Failed to send webhook alert"
fi

[ "$FAIL" -eq 0 ] && exit 0 || exit 1

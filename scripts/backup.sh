#!/usr/bin/env bash
# Nightly pg_dump backup for Elite Hub.
# Keeps the last 30 daily dumps and removes anything older.
#
# Usage:  ~/elite-hub/scripts/backup.sh
# Cron:   see scripts/backup-cron

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
DB_NAME="${DB_NAME:-elite_hub}"
DB_USER="${DB_USER:-elite_hub_user}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/elite-hub/backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
LOG_FILE="${BACKUP_DIR}/backup.log"
# ─────────────────────────────────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/elite_hub_${TIMESTAMP}.sql.gz"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "Starting backup → $FILENAME"

# pg_dump piped directly into gzip — no uncompressed file ever touches disk.
# PGPASSWORD is not set here; relies on .pgpass or local trust authentication
# (the default for same-machine postgres connections on Ubuntu).
if pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" --no-password | gzip > "$FILENAME"; then
  SIZE=$(du -sh "$FILENAME" | cut -f1)
  log "Backup complete. Size: $SIZE"
else
  log "ERROR: pg_dump failed — check PostgreSQL is running and credentials are correct"
  exit 1
fi

# Rotate — remove backups older than KEEP_DAYS
DELETED=$(find "$BACKUP_DIR" -name "elite_hub_*.sql.gz" -mtime "+${KEEP_DAYS}" -print -delete | wc -l)
[ "$DELETED" -gt 0 ] && log "Rotated $DELETED backup(s) older than ${KEEP_DAYS} days"

log "Done."

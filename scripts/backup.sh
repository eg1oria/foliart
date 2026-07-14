#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/foliart}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

compose() {
  docker compose --project-directory "$PROJECT_DIR" \
    -f "$PROJECT_DIR/docker-compose.yml" "$@"
}

if ! [[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
  printf 'RETENTION_DAYS must be a non-negative integer\n' >&2
  exit 2
fi

backend_id="$(compose ps -a -q backend)"
if [[ -z "$backend_id" ]]; then
  printf 'Backend container does not exist; start the application before backing it up.\n' >&2
  exit 1
fi
backend_image="$(docker inspect --format '{{.Image}}' "$backend_id")"
database_url="$(
  docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$backend_id" \
    | sed -n 's/^DATABASE_URL=//p' \
    | tail -n 1
)"
case "$database_url" in
  file:/app/data/*) ;;
  *)
    printf 'Backup supports SQLite under /app/data; got DATABASE_URL=%s\n' \
      "$database_url" >&2
    exit 1
    ;;
esac
database_relative="${database_url#file:/app/data/}"
database_relative="${database_relative%%\?*}"
case "/$database_relative/" in
  // | */../* | */./*)
    printf 'Unsafe SQLite path in DATABASE_URL: %s\n' "$database_url" >&2
    exit 1
    ;;
esac

mkdir -p -- "$BACKUP_DIR"
chmod 0700 -- "$BACKUP_DIR"
umask 077
if [[ "${FOLIART_BACKUP_LOCK_HELD:-0}" != 1 ]]; then
  exec 9>"$BACKUP_DIR/.backup.lock"
  if ! flock -n 9; then
    printf 'Another Foliart backup or restore is already running.\n' >&2
    exit 1
  fi
fi

was_running="$(docker inspect --format '{{.State.Running}}' "$backend_id")"
restart_backend() {
  if [[ "$was_running" == true && "${KEEP_BACKEND_STOPPED:-0}" != 1 ]]; then
    compose start backend >/dev/null
  fi
}
trap restart_backend EXIT

if [[ "$was_running" == true ]]; then
  compose stop -t 30 backend >/dev/null
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$BACKUP_DIR/foliart-$timestamp.tar.gz"
suffix=0
while [[ -e "$archive" ]]; do
  ((suffix += 1))
  archive="$BACKUP_DIR/foliart-$timestamp-$suffix.tar.gz"
done
temporary="$(mktemp "$BACKUP_DIR/.foliart-$timestamp.XXXXXX")"

cleanup_temporary() {
  rm -f -- "$temporary"
}
trap 'cleanup_temporary; restart_backend' EXIT

# The backend is stopped so the SQLite database, WAL and image files are one
# consistent point-in-time snapshot. The one-off container does not start the
# application or run migrations.
# Mount exactly the volumes/binds used by the stopped container. This also
# makes the first backup safe if the checked-out Compose file has just changed.
docker run --rm --network none --read-only --user 0:0 \
  --volumes-from "$backend_id:ro" --entrypoint tar "$backend_image" \
  -czf - -C /app data images >"$temporary"
tar -tzf "$temporary" >/dev/null
tar -tzf "$temporary" "data/$database_relative" >/dev/null
mv -- "$temporary" "$archive"

(
  cd -- "$BACKUP_DIR"
  sha256sum "$(basename -- "$archive")" >"$(basename -- "$archive").sha256"
)

find "$BACKUP_DIR" -maxdepth 1 -type f \
  \( -name 'foliart-*.tar.gz' -o -name 'foliart-*.tar.gz.sha256' \) \
  -mtime "+$RETENTION_DAYS" -delete

printf 'Backup created: %s\n' "$archive"

#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/foliart}"

compose() {
  docker compose --project-directory "$PROJECT_DIR" \
    -f "$PROJECT_DIR/docker-compose.yml" "$@"
}

archive="${1:-}"
if [[ -z "$archive" || ! -f "$archive" ]]; then
  printf 'Usage: %s /path/to/foliart-TIMESTAMP.tar.gz\n' "$0" >&2
  exit 2
fi
archive="$(cd -- "$(dirname -- "$archive")" && pwd)/$(basename -- "$archive")"

if [[ -f "$archive.sha256" ]]; then
  (
    cd -- "$(dirname -- "$archive")"
    sha256sum -c "$(basename -- "$archive.sha256")"
  )
fi

while IFS= read -r entry; do
  case "/$entry/" in
    */../* | */./*)
      printf 'Refusing archive with unsafe path: %s\n' "$entry" >&2
      exit 1
      ;;
  esac
  case "$entry" in
    data | data/ | data/* | images | images/ | images/*) ;;
    *)
      printf 'Refusing archive with unexpected path: %s\n' "$entry" >&2
      exit 1
      ;;
  esac
done < <(tar -tzf "$archive")

mkdir -p -- "$BACKUP_DIR"
chmod 0700 -- "$BACKUP_DIR"
exec 9>"$BACKUP_DIR/.backup.lock"
if ! flock -n 9; then
  printf 'Another Foliart backup or restore is already running.\n' >&2
  exit 1
fi

if [[ "${SKIP_PRE_RESTORE_BACKUP:-0}" != 1 ]]; then
  printf 'Creating a safety backup of the current state...\n'
  FOLIART_BACKUP_LOCK_HELD=1 KEEP_BACKEND_STOPPED=1 \
    "$SCRIPT_DIR/backup.sh"
else
  compose stop -t 30 backend >/dev/null 2>&1 || true
fi

printf 'Restoring database and images from %s...\n' "$archive"
compose run --rm --no-deps -T --user 0:0 --entrypoint sh backend -c '
  set -eu
  rm -rf /app/data/* /app/data/.[!.]* /app/data/..?*
  rm -rf /app/images/* /app/images/.[!.]* /app/images/..?*
  tar -xzf - -C /app
  chown -R 1000:1000 /app/data /app/images
' <"$archive"

compose up -d --wait --wait-timeout 180 backend
printf 'Restore completed; backend is healthy.\n'

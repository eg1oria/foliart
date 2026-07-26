#!/bin/sh
set -eu

# Runtime uploads live on a volume. Add newly bundled seed assets without
# overwriting files that may have been changed through the admin interface.
if [ -d /app/bundled-images ]; then
  cp -R -n /app/bundled-images/. /app/images/
fi

# Prisma 7 with the libSQL adapter expects the SQLite file to exist before
# `prisma migrate deploy`. Create only a missing database inside the dedicated
# persistent volume; existing databases are never truncated or replaced.
database_url="${DATABASE_URL:-}"
case "$database_url" in
  file:/app/data/*)
    database_path="${database_url#file:}"
    database_path="${database_path%%\?*}"
    case "$database_path" in
      */../*|*/..)
        printf 'Unsafe SQLite path in DATABASE_URL: %s\n' "$database_path" >&2
        exit 1
        ;;
    esac
    if [ ! -e "$database_path" ]; then
      : >"$database_path"
    fi
    ;;
esac

exec "$@"

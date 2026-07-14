#!/bin/sh
set -eu

# Runtime uploads live on a volume. Add newly bundled seed assets without
# overwriting files that may have been changed through the admin interface.
if [ -d /app/bundled-images ]; then
  cp -R -n /app/bundled-images/. /app/images/
fi

exec "$@"

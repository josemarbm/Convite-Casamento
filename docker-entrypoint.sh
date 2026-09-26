#!/bin/sh
set -eu

attempt=1
max_attempts=30

until npm run db:setup; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database initialization failed after $max_attempts attempts." >&2
    exit 1
  fi
  echo "Waiting for MySQL before database initialization (attempt $attempt/$max_attempts)..." >&2
  attempt=$((attempt + 1))
  sleep 2
done

exec "$@"
#!/bin/sh

set -eu

NEXT_BIN="./node_modules/next/dist/bin/next"
NODE22_BIN="/opt/homebrew/opt/node@22/bin/node"

if [ ! -f "$NEXT_BIN" ]; then
  echo "Next.js is not installed. Run npm install first." >&2
  exit 1
fi

if [ -x "$NODE22_BIN" ]; then
  exec "$NODE22_BIN" "$NEXT_BIN" "$@"
fi

exec node "$NEXT_BIN" "$@"

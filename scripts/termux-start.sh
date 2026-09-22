#!/data/data/com.termux/files/usr/bin/bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

HOST="${IRENX_HOST:-127.0.0.1}"
PORT="${PORT:-3000}"
export HOST PORT
export CORS_ORIGIN="${CORS_ORIGIN:-http://${HOST}:${PORT}}"
export MARKET_PROVIDER="${MARKET_PROVIDER:-twelvedata}"

fail() {
  printf 'IRENX error: %s\n' "$*" >&2
  exit 1
}

command -v bun >/dev/null 2>&1 || fail "Bun is required. Install it in Termux, then run this command again."
[[ -f package.json ]] || fail "package.json was not found. Run this script from an IRENX checkout."

if [[ ! -d node_modules ]]; then
  printf 'Installing dependencies...\n'
  bun install
fi

printf '\nIRENX is starting on http://%s:%s\n' "$HOST" "$PORT"
printf 'Health: http://%s:%s/api/health\n' "$HOST" "$PORT"
printf 'Press Ctrl+C to stop.\n\n'

exec bun run api/index.ts

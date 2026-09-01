#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PREFIX_DIR="${PREFIX:-/data/data/com.termux/files/usr}"
BIN_DIR="$PREFIX_DIR/bin"

mkdir -p "$BIN_DIR"
chmod +x "$ROOT/termux/irenx" "$ROOT/termux/irenx-local.mjs"
ln -sf "$ROOT/termux/irenx" "$BIN_DIR/irenx"

cat <<EOF
IRENX Termux installed.

Commands:
  irenx help
  irenx start
  irenx health
  irenx signal XAUUSD
  irenx scalping XAUUSD
  irenx ask "question"

Required before starting:
  export OPENAI_API_KEY="YOUR_KEY"

Optional:
  export IRENX_OPENAI_MODEL="MODEL_NAME"
  export IRENX_PORT=8787

This local mode does NOT require ai.irenx.com deployment.
EOF

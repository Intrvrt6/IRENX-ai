#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PREFIX_DIR="${PREFIX:-/data/data/com.termux/files/usr}"
BIN_DIR="$PREFIX_DIR/bin"
APP_DIR="$PREFIX_DIR/opt/irenx"

mkdir -p "$BIN_DIR" "$APP_DIR"

cp "$ROOT/termux/irenx" "$APP_DIR/irenx"
cp "$ROOT/termux/irenx-local.mjs" "$APP_DIR/irenx-local.mjs"
chmod +x "$APP_DIR/irenx" "$APP_DIR/irenx-local.mjs"

cat > "$BIN_DIR/irenx" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
exec "$APP_DIR/irenx" "\$@"
EOF
chmod +x "$BIN_DIR/irenx"

cat <<EOF
IRENX Termux standalone deployment installed.

Runtime:
  $APP_DIR
Command:
  $BIN_DIR/irenx

Commands:
  irenx help
  irenx start
  irenx health
  irenx signal XAUUSD
  irenx scalping XAUUSD
  irenx prime XAUUSD
  irenx ask "question"

Required before starting:
  export OPENAI_API_KEY="YOUR_KEY"

Optional:
  export IRENX_OPENAI_MODEL="gpt-5.6"
  export IRENX_PORT=8787
  export IRENX_MARKET_DATA_URL="https://..."

This Termux runtime is independent from Cloudflare deployment and does not require ai.irenx.com.
EOF

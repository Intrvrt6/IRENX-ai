#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PREFIX_DIR="${PREFIX:-/data/data/com.termux/files/usr}"
BIN_DIR="$PREFIX_DIR/bin"
APP_DIR="$PREFIX_DIR/opt/irenx"

command -v node >/dev/null 2>&1 || { echo "Node.js belum terpasang. Jalankan: pkg install nodejs-lts -y" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl belum terpasang. Jalankan: pkg install curl -y" >&2; exit 1; }

mkdir -p "$BIN_DIR" "$APP_DIR"
cp "$ROOT/termux/irenx" "$APP_DIR/irenx"
cp "$ROOT/termux/irenx-local.mjs" "$APP_DIR/irenx-local.mjs"
chmod +x "$APP_DIR/irenx" "$APP_DIR/irenx-local.mjs"

cat > "$BIN_DIR/irenx" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
exec "$APP_DIR/irenx" "\$@"
EOF
chmod +x "$BIN_DIR/irenx"

cat <<'EOF'

🔥 IRENX TERMUX — STANDALONE

Installed successfully.

Commands:
  irenx help
  irenx start
  irenx health
  irenx market XAUUSD
  irenx signal XAUUSD
  irenx scalping XAUUSD
  irenx prime XAUUSD
  irenx ask "question"

Required:
  export OPENAI_API_KEY='YOUR_OPENAI_KEY'

For live market data:
  export TWELVEDATA_API_KEY='YOUR_TWELVE_DATA_KEY'

Optional:
  export IRENX_OPENAI_MODEL='gpt-5.6'
  export IRENX_MARKET_INTERVAL='1min'
  export IRENX_MARKET_OUTPUTSIZE='100'
  export IRENX_PORT=8787

No Cloudflare/WhatsApp deployment is required.
EOF

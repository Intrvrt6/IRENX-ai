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

🔥 IRENX TERMUX — NO-API LOCAL MODE

Installed successfully.

Commands:
  irenx help
  irenx health
  irenx market XAUUSD
  irenx signal XAUUSD
  irenx scalping XAUUSD
  irenx prime XAUUSD
  irenx ask "IRENX TEST"

NO API KEY IS REQUIRED.

Local market data:
  ~/.irenx/market.json
  export IRENX_MARKET_FILE=/path/to/market.json

The engine is deterministic and local. It does not call OpenAI or Twelve Data.
If local OHLC data is unavailable, IRENX returns WAIT/NO TRADE instead of fabricating prices.

PRIME sequence:
  REGIME -> LIQUIDITY -> REFLEXIVITY -> OROCHI -> VMAP -> EXECUTION -> RISK MANAGEMENT

No Cloudflare/WhatsApp deployment is required for this Termux mode.
EOF

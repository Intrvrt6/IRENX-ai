#!/usr/bin/env bash
set -euo pipefail

# IRENX-ai: configure Claude Code to use OmniRoute without a real Anthropic API key.
# Usage:
#   OMNIROUTE_BASE_URL=http://host:20189 \
#   OMNIROUTE_API_KEY=oma_live_xxx \
#   OMNIROUTE_OPUS_MODEL=provider/model-id \
#   OMNIROUTE_SONNET_MODEL=provider/model-id \
#   OMNIROUTE_HAIKU_MODEL=provider/model-id \
#   ./scripts/setup-claude-omniroute.sh

: "${OMNIROUTE_BASE_URL:?Set OMNIROUTE_BASE_URL, e.g. http://127.0.0.1:20189}"
: "${OMNIROUTE_API_KEY:?Set OMNIROUTE_API_KEY to your OmniRoute access token/API key}"
: "${OMNIROUTE_OPUS_MODEL:=provider/model-id}"
: "${OMNIROUTE_SONNET_MODEL:=provider/model-id}"
: "${OMNIROUTE_HAIKU_MODEL:=provider/model-id}"

CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
CONFIG_FILE="$CONFIG_DIR/settings.json"
mkdir -p "$CONFIG_DIR"

if [[ -f "$CONFIG_FILE" ]]; then
  cp "$CONFIG_FILE" "$CONFIG_FILE.bak.$(date +%Y%m%d%H%M%S)"
fi

cat > "$CONFIG_FILE" <<EOF
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": {
    "ANTHROPIC_API_KEY": "sk-dummy-key-to-bypass-oauth",
    "ANTHROPIC_BASE_URL": "$OMNIROUTE_BASE_URL",
    "ANTHROPIC_AUTH_TOKEN": "$OMNIROUTE_API_KEY",
    "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY": "1",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "$OMNIROUTE_OPUS_MODEL",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "$OMNIROUTE_SONNET_MODEL",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "$OMNIROUTE_HAIKU_MODEL"
  }
}
EOF

chmod 600 "$CONFIG_FILE"
echo "Claude Code OmniRoute settings written to: $CONFIG_FILE"
echo "Restart Claude Code so the environment variables are reloaded."

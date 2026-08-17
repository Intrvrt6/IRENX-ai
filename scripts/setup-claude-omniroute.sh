#!/usr/bin/env bash
set -euo pipefail

# IRENX-ai: configure Claude Code through OmniRoute V2.
#
# V2 goals:
# - one gateway, no provider lock-in
# - live health/model discovery before configuration
# - OmniRoute server-side auto routing + fallback
# - optional per-tier model overrides
# - safe token handling and atomic settings writes
# - optional automatic CLI upgrade
#
# Required:
#   OMNIROUTE_API_KEY=oma_live_xxx
#
# Optional:
#   OMNIROUTE_BASE_URL=http://127.0.0.1:20128
#   OMNIROUTE_OPUS_MODEL=auto
#   OMNIROUTE_SONNET_MODEL=auto
#   OMNIROUTE_HAIKU_MODEL=auto
#   OMNIROUTE_MODEL=auto
#   OMNIROUTE_HEALTH_TIMEOUT=5
#   OMNIROUTE_AUTO_UPGRADE=1
#   OMNIROUTE_SKIP_BACKUP=1
#   CLAUDE_CONFIG_DIR=$HOME/.claude

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'ERROR: required command not found: %s\n' "$1" >&2
    exit 1
  }
}

require_cmd python3
require_cmd curl

: "${OMNIROUTE_API_KEY:?Set OMNIROUTE_API_KEY to your OmniRoute access token/API key}"

if [[ -z "$OMNIROUTE_API_KEY" || "$OMNIROUTE_API_KEY" == "sk-dummy-key-to-bypass-oauth" ]]; then
  printf 'ERROR: OMNIROUTE_API_KEY must be a real OmniRoute credential.\n' >&2
  exit 1
fi

BASE_URL="${OMNIROUTE_BASE_URL:-http://127.0.0.1:20128}"
BASE_URL="${BASE_URL%/}"
HEALTH_TIMEOUT="${OMNIROUTE_HEALTH_TIMEOUT:-5}"
CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
CONFIG_FILE="$CONFIG_DIR/settings.json"

python3 - "$BASE_URL" <<'PY'
import sys
from urllib.parse import urlparse
url = sys.argv[1]
p = urlparse(url)
if p.scheme not in {"http", "https"} or not p.netloc or "\n" in url or "\r" in url:
    raise SystemExit("ERROR: OMNIROUTE_BASE_URL must be a valid http:// or https:// URL")
PY

# Optional maintenance mode: keep the installed gateway current without
# forcing upgrades during every setup. Disabled by default for reproducibility.
if [[ "${OMNIROUTE_AUTO_UPGRADE:-0}" == "1" ]]; then
  require_cmd npm
  printf '%s\n' 'Upgrading OmniRoute CLI...'
  npm install -g omniroute@latest
fi

# Health-check the gateway before changing Claude configuration.
# /v1/models is the most useful readiness probe because it verifies both the
# HTTP gateway and model catalog used by Claude Code discovery.
printf 'Checking OmniRoute: %s\n' "$BASE_URL"
models_json="$(curl -fsS --max-time "$HEALTH_TIMEOUT" \
  -H "Authorization: Bearer $OMNIROUTE_API_KEY" \
  -H 'Accept: application/json' \
  "$BASE_URL/v1/models")" || {
    printf 'ERROR: OmniRoute health/model discovery failed at %s/v1/models\n' "$BASE_URL" >&2
    printf '%s\n' 'Start OmniRoute, verify the API key, or set OMNIROUTE_BASE_URL to the correct gateway root.' >&2
    exit 1
  }

python3 - "$models_json" <<'PY'
import json, sys
try:
    data = json.loads(sys.argv[1])
except json.JSONDecodeError:
    raise SystemExit("ERROR: OmniRoute returned invalid JSON from /v1/models")
models = data.get("data") if isinstance(data, dict) else None
if not isinstance(models, list):
    raise SystemExit("ERROR: OmniRoute /v1/models response has no model catalog")
print(f"OmniRoute healthy: {len(models)} model(s) discovered")
PY

mkdir -p "$CONFIG_DIR"
umask 077

if [[ -f "$CONFIG_FILE" ]]; then
  if [[ "${OMNIROUTE_SKIP_BACKUP:-0}" != "1" ]]; then
    BACKUP_FILE="$CONFIG_FILE.bak.$(date +%Y%m%d%H%M%S)"
    cp -p "$CONFIG_FILE" "$BACKUP_FILE"
    chmod 600 "$BACKUP_FILE"
    printf 'Backup created: %s\n' "$BACKUP_FILE"
  fi
fi

export IRENX_OMNIROUTE_BASE_URL="$BASE_URL"
export IRENX_OMNIROUTE_API_KEY="$OMNIROUTE_API_KEY"
export IRENX_OMNIROUTE_MODEL="${OMNIROUTE_MODEL:-auto}"
export IRENX_OMNIROUTE_OPUS_MODEL="${OMNIROUTE_OPUS_MODEL:-${OMNIROUTE_MODEL:-auto}}"
export IRENX_OMNIROUTE_SONNET_MODEL="${OMNIROUTE_SONNET_MODEL:-${OMNIROUTE_MODEL:-auto}}"
export IRENX_OMNIROUTE_HAIKU_MODEL="${OMNIROUTE_HAIKU_MODEL:-${OMNIROUTE_MODEL:-auto}}"
export IRENX_CLAUDE_CONFIG_FILE="$CONFIG_FILE"

python3 <<'PY'
import json
import os
import tempfile
from pathlib import Path

config_file = Path(os.environ["IRENX_CLAUDE_CONFIG_FILE"])
base_url = os.environ["IRENX_OMNIROUTE_BASE_URL"].strip().rstrip("/")
api_key = os.environ["IRENX_OMNIROUTE_API_KEY"]

if "\n" in base_url or "\r" in base_url or "\n" in api_key or "\r" in api_key:
    raise SystemExit("ERROR: URL/API key contains an invalid newline")

if config_file.exists():
    try:
        data = json.loads(config_file.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"ERROR: existing Claude settings are not valid JSON: {exc}")
    if not isinstance(data, dict):
        raise SystemExit("ERROR: existing Claude settings must contain a JSON object")
else:
    data = {}

env = data.get("env")
if env is None:
    env = {}
    data["env"] = env
elif not isinstance(env, dict):
    raise SystemExit("ERROR: existing Claude settings 'env' must be a JSON object")

data.setdefault("$schema", "https://json.schemastore.org/claude-code-settings.json")

env.update({
    "ANTHROPIC_API_KEY": "sk-dummy-key-to-bypass-oauth",
    "ANTHROPIC_BASE_URL": base_url,
    "ANTHROPIC_AUTH_TOKEN": api_key,
    "CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY": "1",
})

# `auto` is intentional: OmniRoute owns provider/model selection and fallback.
# Explicit tier models remain available for users who want deterministic routing.
env["ANTHROPIC_DEFAULT_OPUS_MODEL"] = os.environ["IRENX_OMNIROUTE_OPUS_MODEL"].strip() or "auto"
env["ANTHROPIC_DEFAULT_SONNET_MODEL"] = os.environ["IRENX_OMNIROUTE_SONNET_MODEL"].strip() or "auto"
env["ANTHROPIC_DEFAULT_HAIKU_MODEL"] = os.environ["IRENX_OMNIROUTE_HAIKU_MODEL"].strip() or "auto"

# Do not persist the raw OmniRoute key anywhere else in the repository.
# Claude Code settings necessarily contain the runtime credential because
# Claude reads it from this file; file permissions are restricted to 0600.
config_file.parent.mkdir(parents=True, exist_ok=True)
fd, tmp_name = tempfile.mkstemp(prefix=f".{config_file.name}.", suffix=".tmp", dir=config_file.parent, text=True)
try:
    os.fchmod(fd, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as tmp:
        json.dump(data, tmp, indent=2, ensure_ascii=False)
        tmp.write("\n")
        tmp.flush()
        os.fsync(tmp.fileno())
    os.replace(tmp_name, config_file)
finally:
    try:
        os.unlink(tmp_name)
    except FileNotFoundError:
        pass

os.chmod(config_file, 0o600)
print(f"Claude Code OmniRoute V2 settings written to: {config_file}")
print(f"Gateway: {base_url}")
print("Routing: OmniRoute auto")
print("Fallback: OmniRoute server-side")
print("Model discovery: enabled")
print("Credential: configured (not displayed)")
PY

unset IRENX_OMNIROUTE_BASE_URL IRENX_OMNIROUTE_API_KEY IRENX_OMNIROUTE_MODEL
unset IRENX_OMNIROUTE_OPUS_MODEL IRENX_OMNIROUTE_SONNET_MODEL IRENX_OMNIROUTE_HAIKU_MODEL
unset IRENX_CLAUDE_CONFIG_FILE

printf '%s\n' 'IRENX OmniRoute V2 configuration complete.'
printf '%s\n' 'Restart Claude Code so the environment is reloaded.'

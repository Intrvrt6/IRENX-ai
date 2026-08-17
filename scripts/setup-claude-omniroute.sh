#!/usr/bin/env bash
set -euo pipefail

# IRENX-ai: configure Claude Code to use OmniRoute without a real Anthropic API key.
#
# Required:
#   OMNIROUTE_BASE_URL=http://127.0.0.1:20128
#   OMNIROUTE_API_KEY=oma_live_xxx
#
# Optional model overrides:
#   OMNIROUTE_OPUS_MODEL=provider/model-id
#   OMNIROUTE_SONNET_MODEL=provider/model-id
#   OMNIROUTE_HAIKU_MODEL=provider/model-id
#
# Optional:
#   CLAUDE_CONFIG_DIR=$HOME/.claude
#   OMNIROUTE_SKIP_BACKUP=1
#
# The script preserves existing Claude Code settings and only updates the
# OmniRoute-related environment variables. Secrets are never printed.

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'ERROR: required command not found: %s\n' "$1" >&2
    exit 1
  }
}

: "${OMNIROUTE_BASE_URL:?Set OMNIROUTE_BASE_URL, e.g. http://127.0.0.1:20128}"
: "${OMNIROUTE_API_KEY:?Set OMNIROUTE_API_KEY to your OmniRoute access token/API key}"

if [[ "$OMNIROUTE_API_KEY" == "sk-dummy-key-to-bypass-oauth" || -z "$OMNIROUTE_API_KEY" ]]; then
  printf 'ERROR: OMNIROUTE_API_KEY must be a real OmniRoute credential.\n' >&2
  exit 1
fi

require_cmd python3

CONFIG_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
CONFIG_FILE="$CONFIG_DIR/settings.json"
mkdir -p "$CONFIG_DIR"

# Keep the config private because it contains the OmniRoute credential.
umask 077

if [[ -f "$CONFIG_FILE" ]]; then
  if [[ "${OMNIROUTE_SKIP_BACKUP:-0}" != "1" ]]; then
    BACKUP_FILE="$CONFIG_FILE.bak.$(date +%Y%m%d%H%M%S)"
    cp -p "$CONFIG_FILE" "$BACKUP_FILE"
    chmod 600 "$BACKUP_FILE"
    printf 'Backup created: %s\n' "$BACKUP_FILE"
  fi
fi

# Pass values through the environment rather than interpolating them into
# Python source. This avoids quoting/injection problems with URLs, keys, or
# model IDs containing special characters.
export IRENX_OMNIROUTE_BASE_URL="$OMNIROUTE_BASE_URL"
export IRENX_OMNIROUTE_API_KEY="$OMNIROUTE_API_KEY"
export IRENX_OMNIROUTE_OPUS_MODEL="${OMNIROUTE_OPUS_MODEL:-}"
export IRENX_OMNIROUTE_SONNET_MODEL="${OMNIROUTE_SONNET_MODEL:-}"
export IRENX_OMNIROUTE_HAIKU_MODEL="${OMNIROUTE_HAIKU_MODEL:-}"
export IRENX_CLAUDE_CONFIG_FILE="$CONFIG_FILE"

python3 <<'PY'
import json
import os
import tempfile
from pathlib import Path
from urllib.parse import urlparse

config_file = Path(os.environ["IRENX_CLAUDE_CONFIG_FILE"])
base_url = os.environ["IRENX_OMNIROUTE_BASE_URL"].strip().rstrip("/")
api_key = os.environ["IRENX_OMNIROUTE_API_KEY"]

parsed = urlparse(base_url)
if parsed.scheme not in {"http", "https"} or not parsed.netloc:
    raise SystemExit("ERROR: OMNIROUTE_BASE_URL must be a valid http:// or https:// URL")

if "\n" in base_url or "\r" in base_url or "\n" in api_key or "\r" in api_key:
    raise SystemExit("ERROR: URL/API key contains an invalid newline")

if config_file.exists():
    try:
        raw = config_file.read_text(encoding="utf-8")
        data = json.loads(raw)
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

# Only override model mappings when explicitly supplied. This prevents the
# old placeholder provider/model-id values from being written by default and
# preserves any valid model configuration already present.
model_vars = {
    "ANTHROPIC_DEFAULT_OPUS_MODEL": os.environ.get("IRENX_OMNIROUTE_OPUS_MODEL", "").strip(),
    "ANTHROPIC_DEFAULT_SONNET_MODEL": os.environ.get("IRENX_OMNIROUTE_SONNET_MODEL", "").strip(),
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": os.environ.get("IRENX_OMNIROUTE_HAIKU_MODEL", "").strip(),
}
for key, value in model_vars.items():
    if value:
        env[key] = value

# Atomic write: never leave a half-written settings.json if the process is
# interrupted. Restrict the temporary file permissions before replacement.
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
print(f"Claude Code OmniRoute settings written to: {config_file}")
print(f"OmniRoute endpoint: {base_url}")
print("Credential: configured (not displayed)")
PY

unset IRENX_OMNIROUTE_BASE_URL IRENX_OMNIROUTE_API_KEY
unset IRENX_OMNIROUTE_OPUS_MODEL IRENX_OMNIROUTE_SONNET_MODEL IRENX_OMNIROUTE_HAIKU_MODEL
unset IRENX_CLAUDE_CONFIG_FILE

printf '%s\n' "Configuration complete. Restart Claude Code so the environment is reloaded."

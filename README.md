# IRENX-ai

IRENX PRIME AI — live web terminal with a server-side market-data gateway.

## Architecture
- `index.html` — IRENX PRIME AI black-terminal UI.
- `api/index.ts` — Bun/Vercel gateway with REST + WebSocket endpoints.
- Provider adapter — Twelve Data WebSocket for streaming prices, with REST `/price` fallback when the stream has not populated a symbol yet.
- Credentials stay server-side in `TWELVEDATA_API_KEY`.
- `vercel.json` — Bun runtime configuration.

## Claude Code + OmniRoute V2

IRENX-ai includes a hardened local setup for using Claude Code through OmniRoute as a provider-neutral AI gateway.

- Template: `.claude/omniroute.settings.example.json`
- Setup script: `scripts/setup-claude-omniroute.sh`
- Default routing mode: `auto` — OmniRoute selects the target model/provider using live routing signals and can fall back server-side.
- Health gate: the setup script verifies `/v1/models` before modifying Claude settings.
- Model discovery: enabled for Claude Code's native model picker.
- Optional maintenance: `OMNIROUTE_AUTO_UPGRADE=1` upgrades the OmniRoute CLI during setup.
- Local Claude credentials/config are ignored by Git via `.gitignore`.

The OmniRoute configuration uses `ANTHROPIC_BASE_URL` for the gateway root and `ANTHROPIC_AUTH_TOKEN` for the OmniRoute access token. `ANTHROPIC_API_KEY` is only a dummy value used for OAuth-bypass compatibility; the real OmniRoute token must stay local and must never be committed.

Example setup:

```bash
OMNIROUTE_BASE_URL=http://127.0.0.1:20128 \
OMNIROUTE_API_KEY=oma_live_xxx \
OMNIROUTE_MODEL=auto \
bash scripts/setup-claude-omniroute.sh
```

For deterministic tier mapping, replace `auto` with explicit OmniRoute model IDs using `OMNIROUTE_OPUS_MODEL`, `OMNIROUTE_SONNET_MODEL`, and `OMNIROUTE_HAIKU_MODEL`.

Restart Claude Code after changing the configuration because Claude Code reads these environment variables at startup. OmniRoute's Claude Code integration requires the Anthropic gateway root without `/v1`; Claude Code appends `/v1/messages` itself.

## OmniRoute V2 design

```text
Claude Code / IRENX tools
          │
          ▼
     OmniRoute Gateway
          │
     ┌────┴────┐
     ▼         ▼
   AUTO      FUSION
     │         │
     └────┬────┘
          ▼
 Health + quota + latency + cost + success
          │
          ▼
 Provider/model selection + automatic fallback
          │
          ▼
 Compression / cache / memory / MCP as configured
```

IRENX does not hard-code a single upstream provider. Provider selection remains an OmniRoute responsibility, while IRENX owns the application logic and market-data layer.

## Endpoints
- `GET /api/health` — gateway/provider status.
- `GET /api/market?symbol=XAUUSD` — normalized latest quote.
- `GET /api/market?symbol=EURUSD` — normalized latest quote.
- `GET /api/market?symbol=GBPUSD` — normalized latest quote.
- `GET /api/market?symbol=USDJPY` — normalized latest quote.
- `GET /api/market?symbol=NAS100` — normalized latest quote.
- `WS /api/ws` — browser WebSocket stream.

## Supported symbols
`XAUUSD`, `EURUSD`, `GBPUSD`, `USDJPY`, `NAS100`.

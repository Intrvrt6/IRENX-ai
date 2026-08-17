# IRENX-ai

IRENX PRIME AI — live web terminal with a server-side market-data gateway.

## Architecture
- `index.html` — IRENX PRIME AI black-terminal UI.
- `api/index.ts` — Bun/Vercel gateway with REST + WebSocket endpoints.
- Provider adapter — Twelve Data WebSocket for streaming prices, with REST `/price` fallback when the stream has not populated a symbol yet.
- Credentials stay server-side in `TWELVEDATA_API_KEY`.
- `vercel.json` — Bun runtime configuration.

## Claude Code + OmniRoute

IRENX-ai includes a safe local setup for using Claude Code through OmniRoute without storing a real Anthropic API key in the repository.

- Template: `.claude/omniroute.settings.example.json`
- Setup script: `scripts/setup-claude-omniroute.sh`
- Local Claude credentials/config are ignored by Git via `.gitignore`.

The OmniRoute configuration uses `ANTHROPIC_BASE_URL` for the gateway and `ANTHROPIC_AUTH_TOKEN` for the OmniRoute access token. `ANTHROPIC_API_KEY` is only a dummy value used for OAuth-bypass compatibility; the real OmniRoute token must stay local and must never be committed.

Example setup:

```bash
OMNIROUTE_BASE_URL=http://127.0.0.1:20189 \
OMNIROUTE_API_KEY=oma_live_xxx \
OMNIROUTE_OPUS_MODEL=provider/model-id \
OMNIROUTE_SONNET_MODEL=provider/model-id \
OMNIROUTE_HAIKU_MODEL=provider/model-id \
bash scripts/setup-claude-omniroute.sh
```

Restart Claude Code after changing the configuration because Claude Code reads these environment variables at startup. OmniRoute's official Claude Code configuration notes that `ANTHROPIC_BASE_URL` should point to the gateway root without `/v1`, while Claude Code appends `/v1/messages`. See the [OmniRoute Claude Code Configuration wiki](https://github.com/diegosouzapw/OmniRoute/wiki/Claude-Code-Configuration).

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

## Environment variables
Set these in the deployment platform; never put the key in `index.html` or commit it to GitHub.

```text
TWELVEDATA_API_KEY=your_real_twelve_data_key
MARKET_PROVIDER=twelvedata
```

Twelve Data's documented real-time WebSocket endpoint is `wss://ws.twelvedata.com/v1/quotes/price?apikey=...`, using an `action: subscribe` message with a comma-separated symbol list. Its `/price` endpoint provides the latest available price.

## Deployment

The repository is prepared for Vercel's Bun runtime. Add `TWELVEDATA_API_KEY` to the Vercel project's Production environment, then deploy the `main` branch.

The IRENX UI intentionally remains **NO TRADE** when live market data is unavailable; a missing API key must not fabricate a quote or signal.

## Repository

https://github.com/Intrvrt6/IRENX-ai

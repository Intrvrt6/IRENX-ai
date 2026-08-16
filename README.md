# IRENX-ai

IRENX PRIME AI — live web terminal with a server-side market-data gateway.

## Architecture
- `index.html` — IRENX PRIME AI black-terminal UI.
- `api/index.ts` — Bun/Vercel gateway with REST + WebSocket endpoints.
- Provider adapter — Twelve Data WebSocket for streaming prices, with REST `/price` fallback when the stream has not populated a symbol yet.
- Credentials stay server-side in `TWELVEDATA_API_KEY`.
- `vercel.json` — Bun runtime configuration.

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

Twelve Data documents the real-time WebSocket endpoint as `wss://ws.twelvedata.com/v1/quotes/price?apikey=...` and the subscription format as an `action: subscribe` message with a comma-separated symbol list. The provider also documents `/price` as the latest-price REST endpoint. citeturn0search1turn1search0

## Deployment

The repository is prepared for Vercel's Bun runtime. Add `TWELVEDATA_API_KEY` to the Vercel project's Production environment, then deploy the `main` branch.

The IRENX UI intentionally remains **NO TRADE** when live market data is unavailable; a missing API key must not fabricate a quote or signal.

## Repository

https://github.com/Intrvrt6/IRENX-ai

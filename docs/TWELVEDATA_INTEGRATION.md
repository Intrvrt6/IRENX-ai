# IRENX — Twelve Data Market Data

IRENX uses Twelve Data as a read-only market-data provider for live price data and technical-analysis inputs.

OpenAPI specification:

`https://api.twelvedata.com/doc/swagger/openapi.json`

## Environment

```text
MARKET_PROVIDER=twelvedata
TWELVEDATA_API_KEY=...
```

Keep the API key server-side. Never expose it to browser, WhatsApp, MCP callers, or logs.

## Supported adapter operations

The shared adapter in `api/twelvedata.ts` provides:

- `price` — current price
- `quote` — quote metadata/bid/ask when supplied by the provider
- `time_series` — OHLCV series for IRENX multi-timeframe analysis
- `rsi`, `macd`, `sma`, `ema`, `atr` — technical inputs used as confirmation/evidence

The provider is a data source, not a trading trigger. IRENX PRIME remains responsible for REGIME → LIQUIDITY → REFLEXIVITY → OROCHI → VMAP → EXECUTION → RISK MANAGEMENT. A missing/stale provider response must result in `WAIT`/`NO TRADE`, not fabricated prices.

## Current symbols

The existing live market service maps:

- `XAUUSD` → `XAU/USD`
- `EURUSD` → `EUR/USD`
- `GBPUSD` → `GBP/USD`
- `USDJPY` → `USD/JPY`
- `NAS100` → `NDX`

The existing `/api/market?symbol=XAUUSD` endpoint uses Twelve Data REST as a fallback and the live WebSocket feed when configured.

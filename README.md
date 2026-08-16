# IRENX-ai

IRENX PRIME AI — web terminal build.

## Included
- `index.html` — IRENX PRIME AI black-terminal web interface.
- Live market-data contract: `GET /api/market?symbol=XAUUSD`
- Supported symbols: XAUUSD, EURUSD, GBPUSD, USDJPY, NAS100.
- Multi-timeframe selector and scalping mode.
- IRENX SIGNAL shortcut.
- Risk-first behavior: unavailable market data results in **NO TRADE**.

## Run

Open `index.html` directly for the UI. For live prices, serve it from a web server that also exposes `/api/market` and keeps provider API credentials server-side.

## Repository

https://github.com/Intrvrt6/IRENX-ai

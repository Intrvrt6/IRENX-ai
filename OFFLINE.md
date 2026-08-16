# IRENX Offline Mode

IRENX can run as an offline-capable PWA after the application shell has been cached by the browser.

## Offline behavior

- `sw.js` caches the application shell.
- `offline-engine.js` provides deterministic local analysis.
- Cached/local price history is used when available.
- Insufficient evidence returns `NO TRADE`.
- Offline mode is not an LLM and does not claim to know live market conditions without connectivity.

## Test

Open `/offline-test.html` while online once so the application assets are cached, then disable the network and reopen the app. The test page checks the local engine and PWA APIs.

## Production boundary

Live market prices require the configured market provider. Offline mode is for local continuity and analysis of previously cached data, not a replacement for a live market feed.

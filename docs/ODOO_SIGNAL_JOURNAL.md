# IRENX SIGNAL → Odoo Trade/Signal Journal

The IRENX runtime can automatically persist every approved signal into the bundled Odoo 19 module `irenx_signal_journal`.

## Flow

`IRENX SIGNAL` → `POST /api/irenx/signal` → IRENX Odoo client → Odoo JSON-2 → `irenx.signal.create_from_irenx()` → Signal Journal

Odoo JSON-2 is used because it is the supported external Models API in Odoo 19. The request is authenticated with a bearer API key.

## 1. Install the Odoo module

Copy or mount `integrations/odoo/irenx_signal_journal` into the Odoo addons path and update the Apps list. Install **IRENX Signal Journal**.

The module creates:

- `irenx.signal` model
- Signal Journal menu
- BUY/SELL/WAIT/NO TRADE status
- Entry, SL, TP1/TP2/TP3
- Confidence and timeframe
- REGIME, LIQUIDITY, REFLEXIVITY, OROCHI and VMAP evidence
- Trigger and metadata
- External ID for idempotent retries

## 2. Configure IRENX

Set these server-side environment variables:

```env
ODOO_BASE_URL=https://your-odoo.example.com
ODOO_API_KEY=...
ODOO_DATABASE=...
ODOO_SIGNAL_MODEL=irenx.signal
IRENX_SIGNAL_INGEST_KEY=...
```

Use a dedicated Odoo bot user/API key with only the permissions required for the journal.

## 3. Send an IRENX SIGNAL

`POST /api/irenx/signal`

Use `X-IRENX-Signal-Key` when `IRENX_SIGNAL_INGEST_KEY` is configured.

Example payload:

```json
{
  "symbol": "XAUUSD",
  "status": "BUY",
  "bias": "BULLISH",
  "entry": 3375.5,
  "sl": 3368.0,
  "tp1": 3383.0,
  "tp2": 3392.0,
  "tp3": 3405.0,
  "confidence": 86,
  "timeframe": "M15/H1",
  "regime": "TREND",
  "liquidity": "SELL-SIDE SWEEP",
  "reflexivity": "POSITIVE",
  "orochi": "CONFIRMED",
  "vmap": "ALIGNED",
  "trigger": "M15 structure reclaim",
  "metadata": {
    "signal_id": "irenx-2026-08-25-001"
  }
}
```

The ingestion method is idempotent: retrying the same `signal_id` updates the existing journal record instead of creating a duplicate.

## Security

Do not put Odoo API keys in client-side code. Odoo's JSON-2 API requires a bearer API key and applies the Odoo user's access rights, record rules and field access. Dedicated bot users are recommended for automated integrations.

# IRENX ↔ Odoo Integration

IRENX now includes a server-side Odoo 19 JSON-2 integration layer.

## Architecture

`IRENX API → api/odoo.ts → Odoo /json/2/<model>/<method>`

The integration is intentionally outside the trading/signal core. Odoo is used as the operational data layer for journaling, portfolio/accounting workflows, CRM, reporting, and audit records.

## Configuration

Set these server-side environment variables:

```env
ODOO_BASE_URL=https://your-odoo.example.com
ODOO_API_KEY=...
ODOO_DATABASE=your_database
ODOO_TIMEOUT_MS=15000
ODOO_SIGNAL_MODEL=x_irenx_signal
```

Use a dedicated Odoo bot user with the minimum permissions required by the integration. Odoo 19's JSON-2 API authenticates with a bearer API key and enforces the normal access rights, record rules, and field access controls. API keys should be kept server-side and rotated regularly.

## Endpoints

### Health

`GET /api/odoo/health`

Checks configuration and validates the connection by calling `res.users/context_get`.

### Generic model call

`POST /api/odoo/model`

Example body:

```json
{
  "model": "res.partner",
  "method": "search_read",
  "domain": [["is_company", "=", true]],
  "fields": ["name"],
  "limit": 20
}
```

### Search/read

`POST /api/odoo/search`

```json
{
  "model": "res.partner",
  "domain": [["name", "ilike", "IRENX"]],
  "fields": ["name", "email"],
  "limit": 20
}
```

### Read

`POST /api/odoo/read`

```json
{
  "model": "res.partner",
  "ids": [1, 2],
  "fields": ["name", "email"]
}
```

### Create

`POST /api/odoo/create`

```json
{
  "model": "res.partner",
  "values": {
    "name": "IRENX"
  }
}
```

### IRENX signal journal

`POST /api/odoo/signal`

The endpoint maps an IRENX signal to the configured `ODOO_SIGNAL_MODEL` (default `x_irenx_signal`). The target model must already exist in the connected Odoo database, with fields matching the `x_*` names used by `api/odoo.ts`.

Example:

```json
{
  "symbol": "XAUUSD",
  "status": "BUY",
  "bias": "bullish",
  "entry": 3375.5,
  "sl": 3367.5,
  "tp1": 3383.5,
  "tp2": 3391.5,
  "tp3": 3403.5,
  "confidence": 84,
  "timeframe": "M15/H1",
  "regime": "TREND",
  "liquidity": "sell-side sweep",
  "reflexivity": "positive",
  "orochi": "confirmed",
  "vmap": "aligned",
  "trigger": "M15 displacement + retest"
}
```

## Security boundary

Do not expose `ODOO_API_KEY` to the browser, frontend bundle, WebSocket messages, or client-side environment. The Odoo credentials are read only by the server-side integration module.

For production, restrict access to the generic `/api/odoo/model`, `/api/odoo/create`, and `/api/odoo/signal` endpoints at the application gateway/auth layer if they are exposed outside a trusted network. The integration itself validates model/method syntax, but Odoo remains the authority for authorization.

## Odoo version

The adapter targets Odoo 19's `/json/2` API. Odoo documents JSON-2 as the replacement for the older XML-RPC/JSON-RPC object APIs, which are deprecated in Odoo 19 and scheduled for removal in later releases.

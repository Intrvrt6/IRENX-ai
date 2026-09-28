# IRENX ↔ Odoo Integration

IRENX includes a server-side Odoo 19 JSON-2 integration layer.

## Production target

```env
ODOO_BASE_URL=https://irnx.odoo.com
ODOO_DATABASE=irnx.core
ODOO_SIGNAL_MODEL=irenx.signal
ODOO_API_KEY=<deployment-secret>
```

**Never commit `ODOO_API_KEY`.** Store it only as a deployment secret. The credential previously pasted into chat should be revoked/rotated before production use.

## Architecture

`IRENX Signal/API → api/odoo.ts → Odoo /json/2/<model>/<method> → irenx.signal`

Odoo is the operational data layer for signal journaling, portfolio/accounting workflows, reporting, and audit records. It does not become the authority for IRENX trading execution.

## Automatic signal flow

When an authenticated IRENX signal reaches the signal ingestion path, `pushIrenxSignal()` maps the signal into the `irenx.signal` Odoo model. The payload includes symbol, status, bias, entry, SL, TP1–TP3, confidence, timeframe, REGIME, LIQUIDITY, REFLEXIVITY, OROCHI, VMAP, trigger, timestamp, source, external ID, and metadata.

The Odoo module uses `external_id` for idempotent ingestion so retries do not intentionally create duplicate signal records.

## Health check

`GET /api/odoo/health`

The server checks configuration and validates the authenticated Odoo connection using `res.users/context_get`.

## Generic access

IRENX can use the server-side Odoo adapter for approved model operations such as `search_read`, `read`, and `create`. Odoo remains responsible for access rights, record rules, and field-level permissions.

## Security boundary

- Odoo API key stays server-side.
- Use a dedicated Odoo bot user with minimum required permissions.
- Do not expose the key to browser JavaScript, frontend bundles, logs, or client messages.
- Protect generic Odoo endpoints with IRENX gateway authentication.
- Rotate the API key if it is ever exposed.

## Deployment

Configure these secrets/environment variables in the production runtime:

```text
ODOO_BASE_URL=https://irnx.odoo.com
ODOO_DATABASE=irnx.core
ODOO_API_KEY=<secret>
ODOO_SIGNAL_MODEL=irenx.signal
ODOO_TIMEOUT_MS=15000
```

The repository deliberately contains the production URL and database name, but never the credential itself.

## Odoo version

The adapter targets Odoo 19 JSON-2 (`/json/2/<model>/<method>`).

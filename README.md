# IRENX-ai

IRENX PRIME AI — live web terminal with a server-side market-data gateway.

## Architecture
- `index.html` — IRENX PRIME AI black-terminal UI.
- `api/index.ts` — Bun/Vercel gateway with REST + WebSocket endpoints.
- `src/omniroute/core-router.ts` — IRENX OmniRoute Core Router V2: task-aware routing policy, scoring telemetry, quota/budget guards, circuit breaker, timeout, and observability.
- Provider adapter — Twelve Data WebSocket for streaming prices, with REST `/price` fallback when the stream has not populated a symbol yet.
- Credentials stay server-side in `TWELVEDATA_API_KEY` and `OMNIROUTE_API_KEY`.
- `vercel.json` — Bun runtime configuration.

## Claude Code + OmniRoute V2

IRENX-ai uses OmniRoute as its provider-neutral AI core. Claude Code connects to one gateway; OmniRoute handles live provider/model selection and upstream fallback.

- Template: `.claude/omniroute.settings.example.json`
- Setup script: `scripts/setup-claude-omniroute.sh`
- Default routing mode: `auto` — OmniRoute selects the target model/provider using live routing signals and can fall back server-side.
- Health gate: setup verifies `/v1/models` before changing Claude settings.
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

## IRENX OmniRoute Core Router V2

IRENX adds an application-level policy layer in front of OmniRoute without duplicating OmniRoute's provider registry. The request is classified by workload, mapped to an OmniRoute route family, then executed by OmniRoute's own live scoring/fallback engine.

### Task routing

| Workload | Preferred route | Optimization |
|---|---|---|
| Coding / debugging | `auto/coding:pro` | quality + reliability |
| Fast coding | `auto/coding:fast` | latency |
| Reasoning / analysis / trading | `auto/reasoning:pro` | reasoning quality |
| Budget reasoning | `auto/reasoning:cheap` | cost |
| Vision | `auto/vision:pro` | vision capability |
| Documentation | `auto/chat:reliable` | stability |
| Interactive chat | `auto/chat:fast` / reliable | latency + stability |
| General | `auto` | balanced |

OmniRoute's current Auto-Combo engine already exposes category/tier routes and live scoring across health, quota, cost, latency, task fit, stability, tier, context affinity, and connection density. IRENX therefore supplies the workload policy while OmniRoute remains the authoritative provider/model router. citehttps://github.com/diegosouzapw/OmniRoute/blob/release/v3.8.49/docs/routing/AUTO-COMBO.md

### Resilience

- **Circuit breaker:** IRENX tracks observed upstream provider/model failures and opens a local breaker after `IRENX_CB_FAILURE_THRESHOLD` consecutive failures.
- **Cooldown:** `IRENX_CB_COOLDOWN_MS` moves an open breaker to `HALF_OPEN` for recovery probing.
- **Timeout:** `IRENX_AI_TIMEOUT_MS` prevents a hung upstream request from blocking IRENX indefinitely.
- **Server-side fallback:** OmniRoute remains responsible for upstream fallback; IRENX does not hard-code provider chains.

### Cost / quota guard

Set optional runtime limits:

```text
IRENX_AI_BUDGET_USD=2
IRENX_AI_MAX_REQUESTS=0
IRENX_AI_MAX_TOKENS=0
IRENX_INPUT_USD_PER_1M=3
IRENX_OUTPUT_USD_PER_1M=15
IRENX_EST_OUTPUT_TOKENS=1200
```

`0` means unlimited for request/token quotas. Before sending a request, IRENX estimates input/output cost and blocks requests that would exceed the remaining budget or quota. Actual usage from the upstream response is then recorded for observability.

### Observability

`GET /api/ai/health` returns aggregate request/token/spend counters, per provider/model latency and success rate, circuit state, and recent routing events.

`GET /api/ai/route?prompt=...` performs a dry-run policy decision without calling the model.

`POST /api/ai` executes a request through the IRENX Core Router and returns routing metadata under the `irenx` object.

Example:

```json
{
  "prompt": "debug this TypeScript API timeout",
  "budgetUsd": 0.50,
  "maxLatencyMs": 8000
}
```

The response includes the task class, selected OmniRoute route, observed provider/model when exposed by the gateway, latency, circuit state, estimated cost, and scoring policy.

## Endpoints
- `GET /api/health` — market + AI gateway status.
- `GET /api/ai/health` — IRENX AI Core Router observability.
- `GET /api/ai/route?prompt=...` — dry-run task-aware route selection.
- `POST /api/ai` — task-aware AI request through OmniRoute.
- `GET /api/market?symbol=XAUUSD` — normalized latest quote.
- `GET /api/market?symbol=EURUSD` — normalized latest quote.
- `GET /api/market?symbol=GBPUSD` — normalized latest quote.
- `GET /api/market?symbol=USDJPY` — normalized latest quote.
- `GET /api/market?symbol=NAS100` — normalized latest quote.
- `WS /api/ws` — browser WebSocket stream.

## Supported symbols
`XAUUSD`, `EURUSD`, `GBPUSD`, `USDJPY`, `NAS100`.

# IRENX-ai

IRENX PRIME AI — live web terminal with a server-side market-data gateway.

## Architecture
- `index.html` — IRENX PRIME AI black-terminal UI.
- `api/index.ts` — Bun/Vercel gateway with REST + WebSocket endpoints.
- `src/omniroute/core-router.ts` — IRENX OmniRoute Core Router V2: task-aware routing policy, scoring telemetry, quota/budget guards, circuit breaker, timeout, and observability.
- `api/v1/models.ts` + `api/v1/chat/completions.ts` — OpenAI-compatible IRENX gateway for OmniCopilot and other compatible clients. It keeps OmniRoute credentials server-side while applying IRENX task-aware routing before forwarding requests.
- Provider adapter — Twelve Data WebSocket for streaming prices, with REST `/price` fallback when the stream has not populated a symbol yet.
- Credentials stay server-side in `TWELVEDATA_API_KEY` and `OMNIROUTE_API_KEY`.
- `vercel.json` — Bun runtime configuration.

## IRENX + OmniCopilot

IRENX now has a native OpenAI-compatible bridge designed for [OmniCopilot](https://github.com/diegosouzapw/OmniCopilot). The architecture is deliberately layered:

```text
VS Code / Copilot Chat
        |
        v
   OmniCopilot
        |
        v
 IRENX /api/v1
        |
        v
 IRENX Core Router
 task classification + policy + guards
        |
        v
    OmniRoute
        |
        +---- Claude
        +---- GPT
        +---- Gemini
        +---- Qwen / DeepSeek / Kimi / etc.
        +---- provider fallback / health / quota
```

This keeps **OmniRoute as the AI gateway**, **IRENX as the policy/intelligence layer**, and **OmniCopilot as the VS Code/Copilot interface**. IRENX does not maintain a second provider registry.

### Connect OmniCopilot to IRENX

1. Run OmniRoute on the server that hosts the provider credentials.
2. Deploy IRENX with `OMNIROUTE_BASE_URL` and `OMNIROUTE_API_KEY` configured server-side.
3. Optionally set `IRENX_GATEWAY_API_KEY` for client authentication.
4. In OmniCopilot, set `omnicopilot.baseUrl` to:

```text
https://YOUR-IRENX-HOST/api/v1
```

5. Put the same `IRENX_GATEWAY_API_KEY` into OmniCopilot's SecretStorage if gateway authentication is enabled.
6. Open Copilot Chat and refresh the model list.

OmniCopilot discovers models through `GET /api/v1/models` and streams chat through `POST /api/v1/chat/completions`.

### Smart routing mode

By default, `IRENX_COPILOT_RESPECT_MODEL=0`. The model selected in Copilot is treated as an interface hint, while IRENX classifies the workload and chooses an OmniRoute route such as:

| Workload | IRENX route family |
|---|---|
| Coding / debugging | `auto/coding:pro` or `auto/coding:fast` |
| Reasoning / analysis / trading | `auto/reasoning:pro` or `auto/reasoning:cheap` |
| Vision | `auto/vision:pro` |
| Documentation | `auto/chat:reliable` |
| Interactive chat | `auto/chat:fast` / `auto/chat:reliable` |
| General | `auto` |

Set `IRENX_COPILOT_RESPECT_MODEL=1` if the user must pin the exact model selected in the Copilot picker.

The bridge preserves **streaming, tools, tool choice, temperature, and other OpenAI-compatible request fields** while replacing the upstream `model` with the IRENX policy decision when smart routing is enabled. Response headers expose `X-IRENX-Route`, `X-IRENX-Task`, and `X-IRENX-Strategy` for diagnostics.

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

### OpenAI-compatible endpoints

- `GET /api/v1/models` — authenticated proxy to OmniRoute model discovery.
- `POST /api/v1/chat/completions` — streaming/non-streaming OpenAI-compatible gateway with IRENX task-aware model selection.

## Endpoints
- `GET /api/health` — market + AI gateway status.
- `GET /api/ai/health` — IRENX AI Core Router observability.
- `GET /api/ai/route?prompt=...` — dry-run task-aware route selection.
- `POST /api/ai` — task-aware AI request through OmniRoute.
- `GET /api/v1/models` — OmniCopilot-compatible model catalog proxy.
- `POST /api/v1/chat/completions` — OmniCopilot-compatible chat gateway.
- `GET /api/market?symbol=XAUUSD` — normalized latest quote.
- `GET /api/market?symbol=EURUSD` — normalized latest quote.
- `GET /api/market?symbol=GBPUSD` — normalized latest quote.
- `GET /api/market?symbol=USDJPY` — normalized latest quote.
- `GET /api/market?symbol=NAS100` — normalized latest quote.
- `WS /api/ws` — browser WebSocket stream.

## Supported symbols
`XAUUSD`, `EURUSD`, `GBPUSD`, `USDJPY`, `NAS100`.

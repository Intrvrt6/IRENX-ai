# IRENX-ai

IRENX PRIME AI — self-hosted live web terminal with server-side market data, OmniRoute AI routing, OmniCopilot compatibility, and Dify integration.

## Architecture
- `index.html` — IRENX PRIME AI black-terminal UI.
- `api/index.ts` — Bun HTTP + WebSocket server. It serves the web UI directly and exposes REST/WebSocket endpoints without Vercel.
- `src/omniroute/core-router.ts` — IRENX OmniRoute Core Router V2: task-aware routing policy, scoring telemetry, quota/budget guards, circuit breaker, timeout, and observability.
- `api/v1/models.ts` + `api/v1/chat/completions.ts` — OpenAI-compatible IRENX gateway for OmniCopilot and other compatible clients.
- `api/dify.ts` — server-side Dify bridge for workflows and chat.
- `Dockerfile` + `docker-compose.yml` — self-hosted Bun deployment.
- `Caddyfile` — automatic HTTPS reverse proxy for `ai.irenx.com`.
- `deploy.sh` — deployment/health-check helper.

**Vercel is intentionally not used.** IRENX is designed to run on a normal Linux server/VPS with Docker, Caddy, OmniRoute, and optionally Dify.

## Self-hosted deployment — `ai.irenx.com`

### 1. DNS

Create this DNS record at the DNS provider for `irenx.com`:

```text
Type: A
Name: ai
Value: <PUBLIC_IP_OF_YOUR_SERVER>
TTL: Auto
```

If you use Cloudflare, start with **DNS only** while validating the server. Caddy will obtain and renew the public TLS certificate automatically.

### 2. Server requirements

- Linux VPS/server
- Docker Engine
- Docker Compose plugin
- Ports `80/tcp` and `443/tcp` open
- DNS `ai.irenx.com` pointing to the server

### 3. Environment

```bash
cp .env.example .env
```

Set at minimum:

```text
OMNIROUTE_BASE_URL=http://127.0.0.1:20128
OMNIROUTE_API_KEY=...
TWELVEDATA_API_KEY=...
```

For Dify:

```text
DIFY_BASE_URL=http://dify-api:5001
DIFY_API_KEY=...
```

Do not commit `.env` or any provider/API credential.

### 4. Start

```bash
bash deploy.sh
```

Or directly:

```bash
docker compose up -d --build
```

Caddy terminates HTTPS and proxies to Bun on port `3000`. WebSocket upgrades are handled by the reverse proxy automatically.

### 5. Verify

```bash
curl -fsS https://ai.irenx.com/api/health
curl -fsS https://ai.irenx.com/api/ai/health
```

The public web terminal is:

```text
https://ai.irenx.com
```

OmniCopilot base URL:

```text
https://ai.irenx.com/api/v1
```

## IRENX + OmniCopilot

```text
VS Code / Copilot Chat
        |
        v
   OmniCopilot
        |
        v
https://ai.irenx.com/api/v1
        |
        v
 IRENX Core Router
        |
        v
    OmniRoute
        |
        +---- Claude
        +---- GPT
        +---- Gemini
        +---- Qwen / DeepSeek / Kimi / etc.
```

By default, `IRENX_COPILOT_RESPECT_MODEL=0`, so IRENX classifies the workload and selects an OmniRoute route family. Set it to `1` to pin the model selected by the client.

## Dify

Dify remains an external/self-hosted application engine. IRENX provides a server-side bridge:

- `GET /api/dify/health`
- `POST /api/dify/workflows/run`
- `POST /api/dify/chat-messages`

Run Dify separately and set `DIFY_BASE_URL`/`DIFY_API_KEY` in the IRENX server environment.

## Claude Code + OmniRoute V2

- Template: `.claude/omniroute.settings.example.json`
- Setup script: `scripts/setup-claude-omniroute.sh`
- Default routing mode: `auto`
- Health gate: verifies `/v1/models` before changing Claude settings.
- Optional maintenance: `OMNIROUTE_AUTO_UPGRADE=1`.

## IRENX OmniRoute Core Router V2

IRENX adds an application-level policy layer in front of OmniRoute without duplicating OmniRoute's provider registry.

### Resilience
- Circuit breaker with cooldown and recovery probing.
- Request timeout.
- OmniRoute remains responsible for upstream provider fallback.

### Cost / quota guard

```text
IRENX_AI_BUDGET_USD=2
IRENX_AI_MAX_REQUESTS=0
IRENX_AI_MAX_TOKENS=0
IRENX_INPUT_USD_PER_1M=3
IRENX_OUTPUT_USD_PER_1M=15
IRENX_EST_OUTPUT_TOKENS=1200
```

`0` means unlimited for request/token quotas.

### Endpoints
- `GET /api/health` — market + AI gateway status.
- `GET /api/ai/health` — AI Core Router observability.
- `GET /api/ai/route?prompt=...` — dry-run route selection.
- `POST /api/ai` — task-aware AI request through OmniRoute.
- `GET /api/v1/models` — OmniCopilot-compatible model catalog.
- `POST /api/v1/chat/completions` — OmniCopilot-compatible chat gateway.
- `GET /api/market?symbol=XAUUSD` — normalized latest quote.
- `WS /api/ws` — browser WebSocket stream.

## Supported symbols
`XAUUSD`, `EURUSD`, `GBPUSD`, `USDJPY`, `NAS100`.

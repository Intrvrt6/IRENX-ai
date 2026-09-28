<div align="center">

# IRENX
### PRIME AI • OMNIROUTE • EDGE INTELLIGENCE

**A self-hosted AI gateway for controlled routing, reliable operations, and local-first deployment.**

[![CI](https://img.shields.io/github/actions/workflow/status/Intrvrt6/IRENX-ai/rust-edge.yml?label=CI&style=flat-square)](https://github.com/Intrvrt6/IRENX-ai/actions)
[![License](https://img.shields.io/github/license/Intrvrt6/IRENX-ai?style=flat-square)](LICENSE)
[![Self Hosted](https://img.shields.io/badge/Self--Hosted-Yes-111111?style=flat-square)](#deployment)
[![Termux](https://img.shields.io/badge/Android-Termux-111111?style=flat-square)](TERMUX.md)

</div>

> IRENX provides one controlled gateway for AI routing, integrations, market data, and operational observability—without requiring a public cloud deployment for local development.

## What IRENX is

IRENX is a self-hosted AI intelligence gateway. It places an application-level policy and routing layer in front of model providers and optional business integrations.

The production runtime is Bun/TypeScript. Cloudflare Workers and Rust/WASM are isolated edge options and canaries; they do not silently replace the primary gateway.

## Capabilities

- Task-aware OmniRoute provider selection
- OpenAI-compatible gateway endpoints
- Budget, token, timeout, and circuit-breaker controls
- Dify workflow and chat bridge
- Odoo and Google People integrations
- Normalized market data for supported symbols
- MCP integration surface
- Docker/Caddy deployment for production
- Local Android deployment through Termux
- CI and regression gates for controlled promotion

## Architecture

```text
Client / Browser / Termux
            │
            ▼
     IRENX HTTP Gateway
            │
            ▼
     Policy + Core Router
            │
            ▼
        OmniRoute
       /    |     \
   GPT   Claude   Other providers

Optional: Dify • MCP • Odoo • Market data • Edge canary
```

## Quick start with Termux

```bash
pkg update && pkg upgrade -y
pkg install -y git curl bun

git clone https://github.com/Intrvrt6/IRENX-ai.git
cd IRENX-ai
bun install
cp .env.example .env
bun run start:termux
```

Open `http://127.0.0.1:3000` in the Android browser.

Detailed Android instructions are in [`TERMUX.md`](TERMUX.md).

## Local development

```bash
bun install
bun run typecheck
bun run start
```

The local server listens on port `3000` by default. Override it when necessary:

```bash
PORT=3001 CORS_ORIGIN=http://127.0.0.1:3001 bun run start
```

Health checks:

```bash
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3000/api/ai/health
```

## API surface

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Overall gateway health |
| `GET /api/ai/health` | Router observability |
| `GET /api/ai/route?prompt=...` | Routing preview |
| `POST /api/ai` | Task-aware AI request |
| `GET /api/v1/models` | OpenAI-compatible model catalog |
| `POST /api/v1/chat/completions` | OpenAI-compatible chat gateway |
| `GET /api/market?symbol=XAUUSD` | Normalized market quote |
| `WS /api/ws` | Live browser stream |
| `GET /api/dify/health` | Dify bridge health |
| `GET /api/odoo/health` | Odoo integration health |
| `GET /api/google/people/health` | Google People integration health |
| `GET /mcp` | MCP surface |

Supported market symbols: `XAUUSD`, `EURUSD`, `GBPUSD`, `USDJPY`, and `NAS100`.

## Configuration and security

Copy `.env.example` to `.env` and configure only the integrations you need. Provider credentials are server-side secrets and must never be embedded in the frontend or committed to Git.

Important controls include:

```text
IRENX_AI_BUDGET_USD=2
IRENX_AI_MAX_REQUESTS=100
IRENX_AI_MAX_TOKENS=200000
IRENX_AI_MAX_LATENCY_MS=12000
IRENX_AI_TIMEOUT_MS=45000
IRENX_CB_FAILURE_THRESHOLD=3
IRENX_CB_COOLDOWN_MS=30000
```

Use `SECURITY.md` for vulnerability reporting and secret-handling requirements.

## Production deployment

For a Linux server with Docker and Caddy:

```bash
cp .env.example .env
# configure secrets in .env
bash deploy.sh
```

The production domain and Cloudflare Worker configuration are maintained separately from the local Termux workflow. Local development does not require Docker, Cloudflare, or a public DNS record.

## Repository layout

```text
api/                 HTTP gateway and integrations
src/omniroute/       routing policy and provider control
mcp/                 MCP surface
worker/              Cloudflare Worker runtime
rust/                Rust/WASM edge canary
docs/                architecture and operations
scripts/             local development helpers
TERMUX.md            Android/Termux deployment guide
Dockerfile           production container image
docker-compose.yml   Docker/Caddy stack
wrangler.toml        Cloudflare configuration
```

## Quality gates

IRENX treats CI as a promotion boundary. Formatting, type checks, regression tests, edge validation, and deployment dry-runs must pass before a change is considered production-ready.

## License

IRENX is released under the MIT License. See [`LICENSE`](LICENSE). Third-party services and dependencies remain subject to their own terms, as documented in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

# IRENX Cloudflare-native

IRENX can run its public gateway and Remote MCP endpoint on Cloudflare Workers without a VPS.

## Runtime

- Worker: `irenx-ai`
- Custom domain: `https://ai.irenx.com`
- MCP: `https://ai.irenx.com/mcp`
- Health: `https://ai.irenx.com/api/health`
- AI route: `https://ai.irenx.com/api/ai`
- Dify health: `https://ai.irenx.com/api/dify/health`

The MCP implementation uses the current stateless Streamable HTTP path with `createMcpHandler` and `@modelcontextprotocol/server` v2. Cloudflare currently recommends this approach for new stateless MCP servers.

## GitHub automatic deployment

The repository contains `.github/workflows/cloudflare-deploy.yml`.

Add these GitHub Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The token should be scoped only to the Cloudflare account/resources required for Workers deployment. Never commit it to the repository.

Every push to `main` then runs dependency installation, Wrangler dry-run validation, deployment, and a production smoke test against `/api/health`.

Cloudflare also supports its native GitHub Workers Builds integration. If that is enabled for this repository, it can replace the GitHub Actions deployment workflow; do not enable both deployment paths at the same time.

## Runtime secrets

Set these as Worker secrets, not repository variables:

```text
OMNIROUTE_BASE_URL
OMNIROUTE_API_KEY
DIFY_BASE_URL
DIFY_API_KEY
```

`wrangler secret put NAME` creates/updates a Worker secret and deploys a new version. Provider keys must never be exposed to the browser.

## Policy guards

The Worker applies:

- task classification
- route selection hints
- request quota guard
- token quota guard
- estimated cost guard
- request timeout
- circuit breaker
- upstream latency measurement
- request/success/failure counters
- estimated spend accounting

OmniRoute remains the upstream AI provider router. IRENX does not hard-code a single model provider.

## Dify

Dify remains an upstream service. A Dify instance must be reachable from the Worker through `DIFY_BASE_URL` and authenticated with `DIFY_API_KEY`. If Dify is not configured, IRENX stays healthy and reports Dify as unavailable rather than pretending it is local.

## MCP tools

The read-only tools are:

- `search(query)`
- `fetch(id)`

They return canonical URLs so research clients can attach citations.

## No VPS / no Vercel

This deployment path does not require a VPS and does not use Vercel. Docker/Caddy files may remain temporarily for migration/rollback, but production traffic is intended to terminate at Cloudflare Workers.

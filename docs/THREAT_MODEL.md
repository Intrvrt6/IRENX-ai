# IRENX Threat Model

## Assets

- provider API credentials
- gateway API key
- recovery codes
- user and tenant identity
- AI prompts and outputs
- market data
- audit and cost records
- deployment artifacts

## Trust boundaries

1. Internet client → IRENX edge
2. IRENX gateway → authenticated tool execution
3. IRENX → external AI/provider APIs
4. CI → release artifacts
5. Trading analysis → execution authority

## Primary threats

- credential theft
- prompt injection
- tool poisoning
- unauthorized MCP tool execution
- SSRF through external fetch tools
- replayed webhooks
- excessive AI spend
- provider outage
- dependency/supply-chain compromise
- tenant data leakage
- accidental trading execution

## Controls

- server-side secrets
- deny-by-default protected endpoints
- API-key authentication
- role-aware authorization
- read/write separation
- audit events
- timeout and circuit breakers
- budget/quota guards
- dependency and secret scanning
- SBOM and release governance
- explicit trading execution boundary

## Security invariant

No external document, model output, market-data provider, or MCP read tool may silently gain authority to execute privileged operations.

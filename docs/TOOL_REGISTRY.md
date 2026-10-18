# IRENX Tool Registry

The registry defines the security contract for tools exposed through IRENX/MCP. New tools should be least-privilege and read-only by default.

## Registry model

Each tool should declare:

- `name`: stable tool identifier
- `category`: `ai`, `market`, `search`, `code`, `system`, `cloud`, `security`, `devops`, `business`, or `mcp`
- `risk`: `low`, `medium`, or `high`
- `readOnly`: whether the tool performs no mutations
- `requiresAuth`: whether upstream credentials are required
- `allowedEnvironments`: environments in which the tool may run
- `allowedOrigins`: explicit network destinations when applicable
- `timeoutMs`: maximum upstream duration
- `rateLimit`: request budget

## Current integration inventory

| Tool | Category | Risk | Read-only | Upstream boundary |
|---|---|---:|---:|---|
| `search` | search | low | yes | IRENX documentation |
| `fetch` | search | low | yes | IRENX documentation |
| `cdnjs_api` | developer | low | yes | `https://api.cdnjs.com` |
| `twelvedata_ad` | market | medium | yes | `https://api.twelvedata.com` |
| Dify bridge | business | medium | no | configured Dify endpoint |
| Odoo signal journal | business | medium | no | configured Odoo endpoint |

## Rules

1. Do not expose provider secrets to tool callers.
2. Prefer server-side authentication and explicit origin allowlists.
3. Do not let a tool become an implicit trade/execution trigger.
4. Mutating tools require an explicit permission contract and audit trail.
5. Add a CI test whenever a new security-sensitive tool is introduced.
6. Tool inputs must be schema-validated and bounded.
7. Network tools must enforce timeouts and reject unsafe URLs/paths.

# IRENX Repository Structure

IRENX keeps the repository organized around **runtime, integrations, operations, and governance**. Avoid creating new top-level folders unless they represent a real architectural boundary.

## Top level

```text
IRENX-ai/
├── README.md                 # Project entry point
├── LICENSE                   # MIT license
├── SECURITY.md               # Vulnerability reporting and security rules
├── NOTICE                    # Project notices
├── THIRD_PARTY_NOTICES.md    # Dependency/service license inventory
├── SBOM.md                   # SBOM policy
├── package.json              # Runtime/build scripts and dependencies
├── wrangler.toml             # Cloudflare Worker deployment config
├── .env.example              # Configuration contract; never real secrets
├── .nvmrc                    # Supported Node major
│
├── api/                      # HTTP/API adapters
├── src/                      # Core application logic
│   └── omniroute/             # Provider routing and resilience
├── worker/                   # Cloudflare-native runtime
├── mcp/                      # MCP server/tool surface
├── integrations/             # External platform adapters
│   └── odoo/                 # Odoo Signal Journal integration
├── rust/                     # Rust/WASM edge canary
├── assets/                   # Project/support media
├── docs/                     # Architecture, operations, security, roadmap
├── build/                    # Build compatibility entrypoints
│
├── .github/
│   ├── CODEOWNERS
│   ├── dependabot.yml
│   └── workflows/            # CI, security, governance, release, deploy
│
├── Dockerfile                # Migration/rollback container path
├── Caddyfile                 # Legacy/self-hosted reverse proxy path
└── webpack.config.cjs        # Compatibility build only
```

## Layer ownership

| Layer | Responsibility |
|---|---|
| `api/` | HTTP contracts and provider-facing API adapters |
| `src/` | Reusable business/routing logic |
| `worker/` | Production Cloudflare edge runtime and Platform v2 controls |
| `mcp/` | MCP protocol surface and tools |
| `integrations/` | External systems such as Odoo |
| `rust/` | Isolated WASM/edge canary |
| `docs/` | Architecture, security, operations and product guidance |
| `.github/` | Automation and release governance |

## Dependency direction

```text
API / MCP / Integrations
          ↓
       Core (`src`)
          ↓
 Providers / external services
```

The Worker may compose these capabilities, but provider credentials and privileged operations stay behind server-side boundaries.

## Documentation order

Start here, in this order:

1. `README.md` — what IRENX is
2. `docs/PLATFORM_V2_ARCHITECTURE.md` — system design
3. `docs/SECURITY_MODEL_V2.md` — authorization/security model
4. `docs/OPERATIONS.md` — production operation
5. `docs/RELEASE_POLICY.md` — release gates
6. `docs/PLATFORM_V2_ROADMAP.md` — future work
7. Integration-specific docs — Dify, Cloudflare, Odoo, etc.

## Professional repository rule

Keep the root boring. **Code belongs in code directories, integrations belong in `integrations/`, operational documentation belongs in `docs/`, and automation belongs in `.github/`.**

Do not duplicate the same architecture or configuration instructions across multiple files. Link to the canonical document instead.

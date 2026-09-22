# Third-party software and service inventory

This file is a governance index, not a replacement for each dependency's license text.

| Component / service | Role | Governance |
|---|---|---|
| Cloudflare Workers / Wrangler | edge runtime and deployment | Follow Cloudflare service terms and the license of installed packages |
| Model Context Protocol SDK | MCP server/tool surface | Verify package license and version in the lockfile/SBOM |
| Zod | runtime schema validation | Verify package license and version in the lockfile/SBOM |
| Dify | workflow/chat integration | External service; follow Dify license/terms for the deployed edition |
| Odoo | business integration | External project; follow the version-specific Odoo license |
| Twelve Data | market-data API | API/service terms apply separately from IRENX's MIT license |
| cdnjs API | public package metadata | API terms and upstream project license apply separately |
| OpenAI and other model APIs | AI providers | Provider terms and usage policies apply separately |

## Policy

1. Pin production dependencies through the lockfile where supported.
2. Generate an SBOM for releases.
3. Record SPDX identifiers when they are available.
4. Do not copy third-party source into IRENX without preserving required notices.
5. Re-check license compatibility when adding a new dependency or integration.
6. Treat service/API terms as separate from software copyright licenses.

The authoritative license for IRENX remains `LICENSE` (MIT). This inventory is intentionally conservative where a service is not itself distributed with IRENX.

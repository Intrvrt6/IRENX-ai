# Platform v2 Runtime Status

Implemented in this branch:

- Central role/permission definitions.
- Tool-level authorization policy with deny-by-default for unregistered tools.
- MCP enforcement helper.
- Lightweight trace/span primitives with a no-secret telemetry contract.
- Normalized Cost Engine usage events and budget decisions.
- Release governance workflow producing an inventory and SBOM manifest artifact.

Still deployment-dependent:

- OIDC/JWKS signature verification must be wired to the chosen identity provider.
- Durable storage must be selected and configured for audit/cost/state persistence.
- OTLP exporter/collector must be configured for production telemetry.
- GitHub repository secrets and Cloudflare secrets must be populated by the operator.
- Full dependency SBOM, provenance and artifact signing should be enabled as a release policy after the project build pipeline is verified.

Security rule: configuration placeholders are safe to commit; real credentials, bearer tokens and recovery codes are never committed.

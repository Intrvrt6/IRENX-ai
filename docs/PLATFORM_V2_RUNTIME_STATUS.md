# Platform v2 Runtime Status

Engineering sequence:

**architecture → runtime security primitives → observability primitives → cost primitives → release governance**

Implemented in this branch:

- Central role/permission definitions.
- Tool-level authorization policy with deny-by-default for unregistered tools.
- MCP enforcement helper.
- Lightweight trace/span primitives with a no-secret telemetry contract.
- Normalized Cost Engine usage events and budget decisions.
- Release governance workflow producing an inventory and SBOM manifest artifact.
- Security workflow with secret scanning, CodeQL, OSV dependency scanning, and Trivy filesystem scanning.
- CI validation for API, MCP, Cloudflare Worker, integrations, and dependency graph.

Verification rule:

- Only the latest commit's checks are treated as merge evidence.
- Historical failed runs are not treated as current source health.
- A release is green only when the current commit has successful required checks.

Still deployment-dependent:

- OIDC/JWKS signature verification must be wired to the chosen identity provider.
- Durable storage must be selected and configured for audit/cost/state persistence.
- OTLP exporter/collector must be configured for production telemetry.
- GitHub repository secrets and Cloudflare secrets must be populated by the operator.
- Full dependency SBOM, provenance and artifact signing should be enabled as a release policy after the project build pipeline is verified.

Security rule: configuration placeholders are safe to commit; real credentials, bearer tokens and recovery codes are never committed.

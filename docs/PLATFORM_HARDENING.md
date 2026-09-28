# IRENX Platform Hardening v1

## Scope

This phase hardens the gateway without changing the production routing authority.

### Controls introduced

- security vulnerability reporting policy
- repository code ownership
- Dependabot for npm, GitHub Actions, and Rust/Cargo dependencies
- third-party software/service governance
- MCP/tool security registry
- release/SBOM governance requirements

## Required production controls

Operators should additionally configure:

- GitHub secret scanning and push protection
- CodeQL or equivalent SAST
- dependency vulnerability scanning
- branch protection with required CI checks
- least-privilege GitHub Actions permissions
- protected production secrets
- Cloudflare WAF/rate limiting where applicable
- provider/API quotas and circuit breakers
- audit logging for privileged or mutating tools

## SBOM policy

Release artifacts should include an SPDX or CycloneDX SBOM generated from the exact dependency lock state used to build the artifact. The repository does not treat a hand-written dependency list as an SBOM.

## License policy

IRENX remains MIT-licensed. Adding an external dependency does not automatically relicense IRENX. Each dependency must be evaluated for license compatibility and required notices before distribution.

## MCP policy

MCP tools are untrusted integration boundaries. Read-only tools are preferred. Every network-capable tool must validate inputs, enforce a timeout, restrict destinations where possible, and keep credentials server-side.

## Rollout

1. Merge hardening documentation and automation.
2. Enable repository security features.
3. Require CI + security checks before merge.
4. Generate SBOM during release builds.
5. Add OpenTelemetry and cost telemetry in the next platform phase.
6. Add authentication/RBAC and per-tool policy enforcement before exposing high-risk mutating tools publicly.

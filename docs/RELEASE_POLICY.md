# IRENX Release Policy

## Required sequence

`architecture → runtime security → observability → cost controls → release governance`

A release is production-ready only after the implementation and verification stages pass on the same commit SHA.

## Required gates

1. Source and configuration validation
2. TypeScript typecheck
3. Wrangler dry-run
4. Secret scanning
5. Dependency vulnerability scanning
6. CodeQL analysis
7. Trivy filesystem/configuration scan
8. Governance policy checks
9. SBOM/release inventory
10. Deployment health verification

## Security rules

- No real credentials in Git.
- Protected API and MCP operations fail closed when authentication is required but unavailable.
- Write-capable operations require stronger authorization than read-only operations.
- Trading execution remains a separate authorization boundary.
- Security controls must not be disabled merely to obtain a green build.

## Rollback

Rollback to the last verified release when a production deployment introduces material security, availability, data-integrity, or cost-control regressions.

## Release evidence

A release should retain its commit SHA, CI result, security scan result, SBOM, provenance/signature evidence when enabled, and deployment health result.

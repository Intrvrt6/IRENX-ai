# IRENX Platform v2 Roadmap

## P0 — production security

- OIDC/OAuth2 authentication and API-key lifecycle
- RBAC + ABAC policy evaluation
- MCP permission enforcement
- server-side secret-provider abstraction
- persistent audit log
- durable counters/state
- prompt-injection, tool-poisoning, DLP and secret-redaction controls
- OpenTelemetry traces, metrics and logs
- persistent cost/usage events

## P1 — platform reliability

- Tool Registry
- Provider Registry
- centralized Policy Engine
- timeout/retry budgets
- health-aware routing
- idempotency
- async job/queue layer
- signed webhooks and replay protection
- OpenAPI governance and versioning

## P2 — supply chain and operations

- automatic SBOM per release
- SPDX/CycloneDX inventory
- dependency vulnerability gates
- license compatibility gates
- SLSA provenance
- signed artifacts
- disaster recovery and restore tests
- tenant isolation
- admin control plane

## P3 — developer platform

- IRENX CLI and `irenx doctor`
- tool scaffolding/testing
- policy tests
- security diagnostics
- chaos testing
- multi-region routing when justified by traffic and reliability requirements

## Release gate

A production release should pass typecheck/tests, security scanning, dependency/license policy, SBOM generation, provenance/signing, and deployment health checks. Missing optional provider credentials must not be treated as source-code secrets or silently committed.

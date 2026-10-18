# IRENX Platform v2 Architecture

## Scope

Platform hardening for authentication, RBAC/ABAC, MCP permission enforcement, observability, cost accounting, durable state, auditability, and software supply-chain controls.

## Security boundary

Client -> Edge/WAF -> Authentication -> Policy Engine -> Tool/Provider Registry -> IRENX Core -> External Provider.

No MCP tool is implicitly trusted. Each tool must declare read/write mode, risk, required permission, network destinations, timeout, rate limit, and audit policy.

## Identity

Supported identity classes:

- owner
- admin
- developer
- operator
- analyst
- trader
- viewer
- service

Authorization should combine RBAC with resource/tool policy. Secrets are server-side only and must never be embedded in source, URLs, or client bundles.

## MCP enforcement

Every MCP request should resolve identity, evaluate role and tool permission, apply rate/quota policy, execute only an allowed tool, and emit an audit event. Read-only tools such as market data, cdnjs, and Statuspage should not acquire write permissions implicitly.

## Observability

Emit OpenTelemetry-compatible traces, metrics, and logs. Correlate `trace_id`, `span_id`, `request_id`, provider, model, tool, latency, token usage, cost, decision, and error without recording secrets.

## Cost Engine

The existing in-process estimation is retained as a fast guard. Production accounting must persist usage events so totals survive Worker restarts and can be aggregated by tenant, user, provider, model, tool, and time window.

## Durable state

Use a persistent state layer for audit events, cost events, policy/configuration state, idempotency keys, and operational counters. Do not treat Worker process memory as durable state.

## Supply chain

Each release should produce an SBOM, run vulnerability/license checks, generate build provenance, and sign release artifacts. Dependency and license policy must cover transitive dependencies.

## Reliability

Provider routing should use timeout budgets, bounded retries with jitter, circuit breakers, health signals, and explicit fallback policy. Never retry indefinitely.

## Trading isolation

Trading is a domain boundary. Market-data providers are evidence/data sources and must not become autonomous trade-execution triggers. Execution requires an explicit risk and authorization layer.

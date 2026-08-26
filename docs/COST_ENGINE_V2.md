# IRENX Cost Engine v2

The current Worker has an in-process budget and token estimator. Platform v2 treats that as a fast admission-control guard, not as the authoritative accounting store.

## Required usage event

Each provider request should emit a normalized usage event:

- timestamp
- tenant/user/service identity
- provider
- model
- tool
- input tokens
- output tokens
- estimated/actual cost
- latency
- status
- trace ID

## Aggregations

Maintain daily, weekly, monthly, per-user, per-provider, per-model, and per-tool totals in durable storage.

## Controls

- soft budget warning
- hard budget limit
- request quota
- token quota
- provider-specific quota
- cost anomaly detection
- forecasted spend

Do not expose provider credentials or raw prompts in cost records.

# IRENX Service Objectives

These are engineering targets, not claims about current measured performance.

## Availability

Target: 99.9% monthly availability for the public gateway, excluding planned maintenance.

## Error rate

Target: less than 1% 5xx responses over a rolling 30-day window.

## Latency

Target: p95 gateway overhead below 500 ms excluding upstream model/provider latency.

## Recovery

Target RTO: 60 minutes for a production gateway failure.

Target RPO: 15 minutes for persistent operational data once a durable backend is enabled.

## Observability requirements

Every protected request should be correlatable by request/trace identifier without logging secrets or raw credentials.

## SLO policy

An SLO breach triggers investigation and capacity/reliability work. It must not be hidden by disabling monitoring or weakening CI gates.

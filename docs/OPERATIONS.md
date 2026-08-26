# IRENX Production Operations

## Operating principle

IRENX is operated as a production gateway: fail closed on protected operations, keep provider credentials server-side, preserve traceability, and promote only verified builds.

## Health checks

- `GET /api/health` — application, provider configuration, security posture.
- `GET /api/infra/cloudflare` — infrastructure health.
- `/mcp` — protected Remote MCP endpoint when `IRENX_MCP_AUTH_REQUIRED=1`.

## Authentication

Set `IRENX_GATEWAY_API_KEY` as a deployment secret. Protected requests use `Authorization: Bearer <key>` or `X-API-Key: <key>`.

Do not place the key in Git, URLs, client bundles, screenshots, or telemetry.

## RBAC

`IRENX_RBAC_DEFAULT_ROLE` controls the role assigned to authenticated gateway API-key traffic. Current roles are `owner`, `admin`, `developer`, `operator`, `analyst`, `trader`, `viewer`, and `service`.

Write operations are deliberately more restrictive than read operations. Trading execution must remain separately authorized from market-data access.

## Incident response

1. Confirm `/api/health` and provider status.
2. Check GitHub Actions for the exact deployment SHA.
3. Inspect audit/telemetry records using the request/trace identifiers.
4. Rotate exposed credentials immediately.
5. Disable the affected integration or provider rather than bypassing security gates.
6. Roll back to the last verified release if the regression is material.

## Release discipline

Never bypass required CI, security scanning, governance, or release artifacts to make a deployment appear green. Fix the failing control or explicitly document an approved exception.

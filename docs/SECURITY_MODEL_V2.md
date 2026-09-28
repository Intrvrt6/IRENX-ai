# IRENX Security Model v2

## Default posture

IRENX Platform v2 uses deny-by-default authorization for protected API and MCP operations.

## Roles

- `owner`: platform ownership and emergency administration
- `admin`: operational administration
- `developer`: development and tool-management operations
- `operator`: runtime/incident operations
- `analyst`: read-only analysis capabilities
- `trader`: market-data and approved signal capabilities; execution remains separately gated
- `viewer`: public/read-only capabilities
- `service`: machine identity with explicitly scoped permissions

## Permission naming

Use stable names such as:

- `system.read`
- `system.admin`
- `market.read`
- `trading.signal`
- `trading.execute`
- `mcp.tool.read`
- `mcp.tool.write`
- `provider.read`
- `provider.admin`
- `audit.read`
- `cost.read`
- `secrets.read`

## MCP policy

A tool must explicitly declare its required permission. Read-only external integrations such as Twelve Data, cdnjs, and Statuspage should default to read-only. Any write-capable tool requires a separate permission and should be audited.

## Token handling

Validate issuer, audience, signature, expiry, and relevant claims. Never log bearer tokens, API keys, recovery codes, authorization headers, or raw secret values.

## Audit

Authorization decisions should emit an audit event containing actor identity, action, tool/resource, allow/deny decision, trace ID, timestamp, and safe reason code.

## Trading safety

Market data and AI analysis are not execution authority. Trade execution must require a dedicated permission and risk gate outside the generic AI/MCP tool path.

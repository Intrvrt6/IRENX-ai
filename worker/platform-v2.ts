export type PlatformRole = "owner" | "admin" | "developer" | "operator" | "analyst" | "trader" | "viewer" | "service";

export type Identity = {
  subject: string;
  role: PlatformRole;
  tenant?: string;
};

export type Permission =
  | "system.read"
  | "system.admin"
  | "market.read"
  | "trading.signal"
  | "trading.execute"
  | "mcp.tool.read"
  | "mcp.tool.write"
  | "provider.read"
  | "provider.admin"
  | "audit.read"
  | "cost.read"
  | "secrets.read";

const rolePermissions: Record<PlatformRole, Permission[]> = {
  owner: ["system.read", "system.admin", "market.read", "trading.signal", "trading.execute", "mcp.tool.read", "mcp.tool.write", "provider.read", "provider.admin", "audit.read", "cost.read", "secrets.read"],
  admin: ["system.read", "system.admin", "market.read", "trading.signal", "mcp.tool.read", "mcp.tool.write", "provider.read", "provider.admin", "audit.read", "cost.read"],
  developer: ["system.read", "market.read", "mcp.tool.read", "mcp.tool.write", "provider.read", "cost.read"],
  operator: ["system.read", "market.read", "mcp.tool.read", "provider.read", "audit.read", "cost.read"],
  analyst: ["system.read", "market.read", "mcp.tool.read", "provider.read", "cost.read"],
  trader: ["system.read", "market.read", "trading.signal", "mcp.tool.read", "provider.read", "cost.read"],
  viewer: ["system.read", "market.read", "mcp.tool.read"],
  service: ["system.read", "mcp.tool.read"]
};

export type ToolPolicy = {
  permission: Permission;
  write?: boolean;
  risk?: "low" | "medium" | "high" | "critical";
};

export const TOOL_POLICIES: Record<string, ToolPolicy> = {
  search: { permission: "mcp.tool.read", risk: "low" },
  fetch: { permission: "mcp.tool.read", risk: "low" },
  cdnjs_api: { permission: "mcp.tool.read", risk: "medium" },
  statuspage_get_page: { permission: "mcp.tool.read", risk: "low" },
  twelvedata_ad: { permission: "market.read", risk: "medium" },
  trading_signal: { permission: "trading.signal", risk: "high" },
  trading_execute: { permission: "trading.execute", write: true, risk: "critical" }
};

export function authorize(identity: Identity, permission: Permission): boolean {
  return rolePermissions[identity.role]?.includes(permission) ?? false;
}

export function authorizeTool(identity: Identity, toolName: string): { allowed: boolean; reason: string } {
  const policy = TOOL_POLICIES[toolName];
  if (!policy) return { allowed: false, reason: "tool_not_registered" };
  if (!authorize(identity, policy.permission)) return { allowed: false, reason: "permission_denied" };
  if (policy.write && identity.role !== "owner") return { allowed: false, reason: "write_requires_owner" };
  return { allowed: true, reason: "allowed" };
}

export function identityFromBearer(request: Request): Identity | null {
  const value = request.headers.get("authorization") || "";
  if (!value.startsWith("Bearer ")) return null;
  const token = value.slice(7).trim();
  if (!token) return null;
  // Runtime JWT/OIDC verification is intentionally delegated to the deployment identity provider.
  // Never treat arbitrary bearer strings as trusted identity in production.
  return null;
}

export function auditEvent(input: {
  actor: string;
  action: string;
  resource: string;
  decision: "allow" | "deny";
  reason: string;
  traceId?: string;
}) {
  return {
    timestamp: new Date().toISOString(),
    actor: input.actor,
    action: input.action,
    resource: input.resource,
    decision: input.decision,
    reason: input.reason,
    traceId: input.traceId
  };
}

export function createTraceId(): string {
  return crypto.randomUUID();
}

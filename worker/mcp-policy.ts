import { authorizeTool, type Identity } from "./platform-v2";

export function enforceMcpTool(identity: Identity, toolName: string) {
  const decision = authorizeTool(identity, toolName);
  if (!decision.allowed) {
    throw new Error(`MCP authorization denied: ${decision.reason}`);
  }
  return decision;
}

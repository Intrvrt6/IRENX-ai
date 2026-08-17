import { chooseRoute } from "../../../src/omniroute/core-router";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-IRENX-Task"
    }
  });
}

function authorized(request: Request): boolean {
  const expected = process.env.IRENX_GATEWAY_API_KEY || "";
  if (!expected) return true;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${expected}`;
}

function flattenMessages(messages: unknown): string {
  if (!Array.isArray(messages)) return "";
  return messages.map((message) => {
    if (!message || typeof message !== "object") return "";
    const item = message as { role?: unknown; content?: unknown };
    const content = typeof item.content === "string" ? item.content : JSON.stringify(item.content ?? "");
    return `${String(item.role || "user")}: ${content}`;
  }).filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  if (!authorized(request)) return json({ error: { message: "Invalid IRENX gateway API key", type: "invalid_request_error" } }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return json({ error: { message: "Invalid JSON body", type: "invalid_request_error" } }, 400);
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) return json({ error: { message: "messages is required", type: "invalid_request_error" } }, 400);

  const prompt = flattenMessages(messages);
  const requestedModel = typeof body.model === "string" ? body.model : "auto";
  const policy = request.headers.get("x-irenx-task") || "";
  const policyPrompt = policy ? `[IRENX task=${policy}]\n${prompt}` : prompt;
  const decision = chooseRoute(policyPrompt, {
    model: process.env.IRENX_COPILOT_RESPECT_MODEL === "1" && requestedModel && requestedModel !== "auto" ? requestedModel : undefined,
    tier: (typeof body.irenx_tier === "string" ? body.irenx_tier : undefined) as "pro" | "free" | "cheap" | "fast" | "reliable" | undefined,
    budgetUsd: Number.isFinite(Number(body.irenx_budget_usd)) ? Number(body.irenx_budget_usd) : undefined,
    maxLatencyMs: Number.isFinite(Number(body.irenx_max_latency_ms)) ? Number(body.irenx_max_latency_ms) : undefined
  });

  const baseUrl = (process.env.OMNIROUTE_BASE_URL || "http://127.0.0.1:20128").replace(/\/$/, "");
  const apiKey = process.env.OMNIROUTE_API_KEY || "";
  if (!apiKey) return json({ error: { message: "OMNIROUTE_API_KEY is not configured", type: "configuration_error" } }, 503);

  const upstreamBody = {
    ...body,
    model: decision.model,
    stream: body.stream !== false
  };
  delete upstreamBody.irenx_tier;
  delete upstreamBody.irenx_budget_usd;
  delete upstreamBody.irenx_max_latency_ms;

  try {
    const upstream = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json"
      },
      body: JSON.stringify(upstreamBody),
      signal: AbortSignal.timeout(Number(process.env.IRENX_AI_TIMEOUT_MS || 45000))
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text();
      return json({
        error: { message: `OmniRoute request failed (HTTP ${upstream.status})`, type: "upstream_error", detail },
        irenx: { task: decision.task, selectedRoute: decision.model, strategy: decision.strategy, scorePolicy: decision.scorePolicy }
      }, 502);
    }

    const headers = new Headers(upstream.headers);
    headers.set("Cache-Control", "no-cache, no-transform");
    headers.set("X-IRENX-Route", decision.model);
    headers.set("X-IRENX-Task", decision.task);
    headers.set("X-IRENX-Strategy", decision.strategy);
    headers.set("X-Accel-Buffering", "no");

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    return json({
      error: { message: error instanceof Error ? error.message : "IRENX gateway failure", type: "upstream_error" },
      irenx: { task: decision.task, selectedRoute: decision.model, strategy: decision.strategy }
    }, 502);
  }
}

export async function OPTIONS() {
  return json(null, 204);
}

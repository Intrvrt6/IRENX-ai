import { chatThroughOmniRoute, observabilitySnapshot, chooseRoute } from "../src/omniroute/core-router";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" }
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith("/health")) return json({ ok: true, service: "irenx-omniroute-core", ...observabilitySnapshot() });
  if (url.pathname.endsWith("/route")) {
    const prompt = url.searchParams.get("prompt") || "";
    if (!prompt) return json({ error: "prompt is required" }, 400);
    return json(chooseRoute(prompt));
  }
  return json({ service: "IRENX OmniRoute Core Router V2", endpoints: ["POST /api/ai", "GET /api/ai/health", "GET /api/ai/route?prompt=..."] });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = typeof body?.prompt === "string" ? body.prompt : "";
    if (!prompt.trim()) return json({ error: "prompt is required" }, 400);
    const result = await chatThroughOmniRoute(prompt, {
      model: typeof body?.model === "string" ? body.model : undefined,
      tier: typeof body?.tier === "string" ? body.tier : undefined,
      budgetUsd: Number.isFinite(Number(body?.budgetUsd)) ? Number(body.budgetUsd) : undefined,
      maxLatencyMs: Number.isFinite(Number(body?.maxLatencyMs)) ? Number(body.maxLatencyMs) : undefined
    });
    return json(result);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "IRENX AI router failure" }, 502);
  }
}

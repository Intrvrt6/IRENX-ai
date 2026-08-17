function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type"
    }
  });
}

function authorized(request: Request): boolean {
  const expected = process.env.IRENX_GATEWAY_API_KEY || "";
  if (!expected) return true;
  const auth = request.headers.get("authorization") || "";
  return auth === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) return json({ error: { message: "Invalid IRENX gateway API key", type: "invalid_request_error" } }, 401);

  const baseUrl = (process.env.OMNIROUTE_BASE_URL || "http://127.0.0.1:20128").replace(/\/$/, "");
  const apiKey = process.env.OMNIROUTE_API_KEY || "";
  if (!apiKey) return json({ error: { message: "OMNIROUTE_API_KEY is not configured", type: "configuration_error" } }, 503);

  try {
    const upstream = await fetch(`${baseUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(Number(process.env.IRENX_AI_TIMEOUT_MS || 45000))
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("content-type") || "application/json", "Cache-Control": "no-store" }
    });
  } catch (error) {
    return json({ error: { message: error instanceof Error ? error.message : "OmniRoute model discovery failed", type: "upstream_error" } }, 502);
  }
}

export async function OPTIONS() {
  return json(null, 204);
}

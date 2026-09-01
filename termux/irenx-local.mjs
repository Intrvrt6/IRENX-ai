#!/usr/bin/env node
import http from "node:http";

const PORT = Number(process.env.IRENX_PORT || 8787);
const HOST = process.env.IRENX_HOST || "127.0.0.1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.IRENX_OPENAI_MODEL || "gpt-5.6";

const SYSTEM = `You are IRENX, a selective trading analysis assistant. Use this sequence: REGIME -> LIQUIDITY -> REFLEXIVITY -> OROCHI -> VMAP -> EXECUTION -> RISK MANAGEMENT. No single indicator can create a trade. Prefer WAIT/NO TRADE when evidence is insufficient. Never invent live market prices. For signal requests output Bias, Entry/Zone, SL, TP1, TP2, TP3, Trigger/Confirmation, and Status. Signals are analysis, not guaranteed profit.`;

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" });
  res.end(body);
}

async function ai(prompt) {
  if (!API_KEY) throw new Error("OPENAI_API_KEY belum diset di Termux");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, input: `${SYSTEM}\n\nUser: ${prompt}` })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `OpenAI HTTP ${response.status}`);
  const output = payload.output_text || payload.output?.flatMap(x => x.content || []).map(x => x.text || "").join("") || "";
  return { output_text: output, model: MODEL, local: true };
}

async function readBody(req) {
  let data = "";
  for await (const chunk of req) data += chunk;
  return data;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "OPTIONS") return json(res, 204, {});
    if (url.pathname === "/" || url.pathname === "/api") return json(res, 200, { service: "IRENX Local", mode: "termux", model: MODEL, endpoints: ["/api/health", "/api/ai"] });
    if (url.pathname === "/api/health") return json(res, 200, { ok: true, service: "irenx-local", mode: "termux", aiConfigured: Boolean(API_KEY), model: MODEL, time: new Date().toISOString() });
    if (url.pathname === "/api/ai" && req.method === "POST") {
      const body = JSON.parse(await readBody(req) || "{}");
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) return json(res, 400, { error: "prompt is required" });
      return json(res, 200, await ai(prompt));
    }
    if (url.pathname === "/api/ai" && req.method === "GET") {
      const prompt = url.searchParams.get("prompt")?.trim() || "";
      if (!prompt) return json(res, 400, { error: "prompt is required" });
      return json(res, 200, await ai(prompt));
    }
    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, 502, { error: error instanceof Error ? error.message : "IRENX local failure" });
  }
});

server.listen(PORT, HOST, () => console.log(`IRENX Local running at http://${HOST}:${PORT}`));

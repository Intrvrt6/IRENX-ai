import { chatThroughOmniRoute, observabilitySnapshot, chooseRoute } from "../src/omniroute/core-router";
import { difyConfigured, runDifyChat, runDifyWorkflow } from "./dify";
import { odooCall, odooCreate, odooHealth, odooRead, odooSearchRead, odooConfigured, pushIrenxSignal } from "./odoo";
import { createIrenxMcpHandler } from "../mcp/irenx";

const MCP_HANDLER = createIrenxMcpHandler();
const PROVIDER = process.env.MARKET_PROVIDER || "twelvedata";
const API_KEY = process.env.TWELVEDATA_API_KEY || "";
const PORT = Number(process.env.PORT || 3000);
const SIGNAL_INGEST_KEY = process.env.IRENX_SIGNAL_INGEST_KEY || "";
const ALLOWED = new Set(["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "NAS100"]);
const TD_SYMBOL: Record<string, string> = { XAUUSD: "XAU/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD", USDJPY: "USD/JPY", NAS100: "NDX" };

type Quote = { symbol: string; providerSymbol: string; bid: number | null; ask: number | null; price: number; timestamp: string; source: string };
const clients = new Set<any>();
const latest = new Map<string, Quote>();
let providerSocket: WebSocket | null = null;
let providerReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let providerConnected = false;

function cors(headers: Record<string, string> = {}) {
  return { "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-IRENX-Signal-Key", ...headers };
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }) });
}
function signalAuthorized(request: Request) {
  if (!SIGNAL_INGEST_KEY) return true;
  const supplied = request.headers.get("X-IRENX-Signal-Key") || request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
  return supplied === SIGNAL_INGEST_KEY;
}
function normalize(symbol: string, payload: any): Quote | null {
  const price = Number(payload.price ?? payload.close ?? payload.value);
  if (!Number.isFinite(price) || price <= 0) return null;
  const providerSymbol = String(payload.symbol || TD_SYMBOL[symbol] || symbol);
  const bid = Number.isFinite(Number(payload.bid)) ? Number(payload.bid) : null;
  const ask = Number.isFinite(Number(payload.ask)) ? Number(payload.ask) : null;
  const ts = Number(payload.timestamp);
  return { symbol, providerSymbol, bid, ask, price, timestamp: ts > 0 ? new Date(ts * 1000).toISOString() : new Date().toISOString(), source: PROVIDER };
}
function broadcast(q: Quote) {
  latest.set(q.symbol, q);
  const message = JSON.stringify(q);
  for (const client of clients) {
    try { client.send(message); } catch { clients.delete(client); }
  }
}
function subscribeProvider() {
  if (!API_KEY || PROVIDER !== "twelvedata") return;
  if (providerSocket) { try { providerSocket.close(); } catch {} }
  const url = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${encodeURIComponent(API_KEY)}`;
  const ws = new WebSocket(url);
  providerSocket = ws;
  ws.addEventListener("open", () => { providerConnected = true; ws.send(JSON.stringify({ action: "subscribe", params: { symbols: Object.values(TD_SYMBOL).join(",") } })); });
  ws.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(String(event.data));
      if (payload.event === "price" || payload.price != null) {
        const providerSymbol = String(payload.symbol || "").toUpperCase();
        const symbol = Object.entries(TD_SYMBOL).find(([, v]) => v.toUpperCase() === providerSymbol)?.[0];
        if (symbol) { const q = normalize(symbol, payload); if (q) broadcast(q); }
      }
    } catch (error) { console.error("provider message parse error", error); }
  });
  ws.addEventListener("close", () => { providerConnected = false; if (providerReconnectTimer) clearTimeout(providerReconnectTimer); providerReconnectTimer = setTimeout(subscribeProvider, 5000); });
  ws.addEventListener("error", (error) => console.error("provider websocket error", error));
}
async function restQuote(symbol: string): Promise<Quote> {
  if (!API_KEY) throw new Error("TWELVEDATA_API_KEY is not configured");
  const url = new URL("https://api.twelvedata.com/price");
  url.searchParams.set("symbol", TD_SYMBOL[symbol]);
  url.searchParams.set("apikey", API_KEY);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`provider HTTP ${response.status}`);
  const data = await response.json();
  if (data.status === "error" || data.code) throw new Error(data.message || "provider error");
  const q = normalize(symbol, data);
  if (!q) throw new Error("provider returned invalid price");
  broadcast(q);
  return q;
}
function health() {
  return { ok: true, provider: PROVIDER, configured: Boolean(API_KEY), providerWebSocket: providerConnected, clients: clients.size, time: new Date().toISOString(), dify: { configured: difyConfigured(), baseUrl: process.env.DIFY_BASE_URL || "http://127.0.0.1:5001" }, odoo: { configured: odooConfigured(), baseUrl: process.env.ODOO_BASE_URL || null, signalIngestAuth: Boolean(SIGNAL_INGEST_KEY) }, ai: observabilitySnapshot(), mcp: { enabled: true, endpoint: "/mcp" } };
}
function staticFile(pathname: string): Response | null {
  const files: Record<string, string> = { "/": "index.html", "/index.html": "index.html", "/manifest.webmanifest": "manifest.webmanifest" };
  const file = files[pathname];
  if (!file) return null;
  return new Response(Bun.file(file), { headers: { "Content-Type": file.endsWith(".webmanifest") ? "application/manifest+json" : "text/html; charset=utf-8", "Cache-Control": "no-cache" } });
}

subscribeProvider();

Bun.serve({
  port: PORT,
  async fetch(request, server) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });
    if (url.pathname === "/mcp" || url.pathname === "/mcp/") return MCP_HANDLER.fetch(request);
    if (url.pathname.startsWith("/mcp/docs/")) {
      const id = decodeURIComponent(url.pathname.slice("/mcp/docs/".length));
      const map: Record<string, string> = { readme: "README.md", "dify-integration": "docs/DIFY_INTEGRATION.md", "cloudflare-deployment": "docs/CLOUDFLARE_DEPLOYMENT.md", "ci-verification": "docs/CI-VERIFICATION.md", automation: "AUTOMATION.md", odoo: "docs/ODOO_INTEGRATION.md" };
      const path = map[id];
      if (!path) return new Response("Not found", { status: 404, headers: cors() });
      const file = Bun.file(path);
      if (!(await file.exists())) return new Response("Not found", { status: 404, headers: cors() });
      return new Response(await file.text(), { headers: cors({ "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "no-store" }) });
    }
    const staticResponse = staticFile(url.pathname);
    if (staticResponse) return staticResponse;
    if (url.pathname === "/api/health") return json(health());
    if (url.pathname === "/api/ai/health") return json({ ok: true, service: "irenx-omniroute-core", ...observabilitySnapshot() });
    if (url.pathname === "/api/dify/health") return json({ ok: difyConfigured(), service: "irenx-dify-bridge", configured: difyConfigured(), baseUrl: process.env.DIFY_BASE_URL || "http://127.0.0.1:5001" });
    if (url.pathname === "/api/odoo/health") return json(await odooHealth());
    if (url.pathname === "/api/ai/route") { const prompt = url.searchParams.get("prompt") || ""; if (!prompt) return json({ error: "prompt is required" }, 400); return json(chooseRoute(prompt)); }
    if (url.pathname === "/api/ai" && request.method === "POST") {
      try {
        const body = await request.json(); const prompt = typeof body?.prompt === "string" ? body.prompt : ""; if (!prompt.trim()) return json({ error: "prompt is required" }, 400);
        return json(await chatThroughOmniRoute(prompt, { model: typeof body?.model === "string" ? body.model : undefined, tier: typeof body?.tier === "string" ? body.tier : undefined, budgetUsd: Number.isFinite(Number(body?.budgetUsd)) ? Number(body.budgetUsd) : undefined, maxLatencyMs: Number.isFinite(Number(body?.maxLatencyMs)) ? Number(body.maxLatencyMs) : undefined }));
      } catch (error) { return json({ error: error instanceof Error ? error.message : "IRENX AI router failure" }, 502); }
    }
    if (url.pathname === "/api/dify/workflows/run" && request.method === "POST") { try { const body = await request.json(); return json(await runDifyWorkflow({ inputs: body?.inputs, user: body?.user, responseMode: body?.response_mode === "streaming" ? "streaming" : "blocking" })); } catch (error) { return json({ error: error instanceof Error ? error.message : "Dify workflow failure" }, 502); } }
    if (url.pathname === "/api/dify/chat-messages" && request.method === "POST") { try { const body = await request.json(); const query = typeof body?.query === "string" ? body.query : ""; if (!query.trim()) return json({ error: "query is required" }, 400); return json(await runDifyChat({ query, user: body?.user, conversationId: body?.conversation_id, inputs: body?.inputs, responseMode: body?.response_mode === "streaming" ? "streaming" : "blocking" })); } catch (error) { return json({ error: error instanceof Error ? error.message : "Dify chat failure" }, 502); } }
    if (url.pathname === "/api/odoo/model" && request.method === "POST") {
      try { const body = await request.json(); return json(await odooCall(body)); } catch (error) { return json({ error: error instanceof Error ? error.message : "Odoo API failure" }, 502); }
    }
    if (url.pathname === "/api/odoo/search" && request.method === "POST") {
      try { const body = await request.json(); return json(await odooSearchRead(String(body?.model || ""), Array.isArray(body?.domain) ? body.domain : [], Array.isArray(body?.fields) ? body.fields : [], Number(body?.limit || 50))); } catch (error) { return json({ error: error instanceof Error ? error.message : "Odoo search failure" }, 502); }
    }
    if (url.pathname === "/api/odoo/read" && request.method === "POST") {
      try { const body = await request.json(); if (!Array.isArray(body?.ids)) return json({ error: "ids is required" }, 400); return json(await odooRead(String(body?.model || ""), body.ids.map(Number), Array.isArray(body?.fields) ? body.fields : [])); } catch (error) { return json({ error: error instanceof Error ? error.message : "Odoo read failure" }, 502); }
    }
    if (url.pathname === "/api/odoo/create" && request.method === "POST") {
      try { const body = await request.json(); if (!body?.values || typeof body.values !== "object") return json({ error: "values is required" }, 400); return json(await odooCreate(String(body?.model || ""), body.values)); } catch (error) { return json({ error: error instanceof Error ? error.message : "Odoo create failure" }, 502); }
    }
    if ((url.pathname === "/api/odoo/signal" || url.pathname === "/api/irenx/signal") && request.method === "POST") {
      if (!signalAuthorized(request)) return json({ error: "Unauthorized signal ingestion" }, 401);
      try {
        const body = await request.json();
        if (!body?.symbol || !body?.status) return json({ error: "symbol and status are required" }, 400);
        const result = await pushIrenxSignal(body);
        return json({ ok: true, synced: true, odoo: result });
      } catch (error) { return json({ error: error instanceof Error ? error.message : "Odoo signal sync failure" }, 502); }
    }
    if (url.pathname === "/api/market") { const symbol = (url.searchParams.get("symbol") || "XAUUSD").toUpperCase(); if (!ALLOWED.has(symbol)) return json({ error: "Unsupported symbol" }, 400); const cached = latest.get(symbol); if (cached) return json(cached); try { return json(await restQuote(symbol)); } catch (error) { return json({ error: error instanceof Error ? error.message : "market data unavailable" }, 503); } }
    if (url.pathname === "/api/ws") { if (!server.upgrade(request)) return new Response("WebSocket upgrade required", { status: 426, headers: cors() }); return undefined; }
    if (url.pathname === "/api") return json({ service: "IRENX live market + OmniRoute AI Core + Dify + Odoo + MCP", endpoints: ["/api/health", "/api/market?symbol=XAUUSD", "/api/ws", "/api/ai", "/api/ai/health", "/api/ai/route?prompt=...", "/api/dify/health", "/api/dify/workflows/run", "/api/dify/chat-messages", "/api/odoo/health", "/api/odoo/model", "/api/odoo/search", "/api/odoo/read", "/api/odoo/create", "/api/irenx/signal", "/mcp"] });
    return new Response("Not found", { status: 404, headers: cors() });
  },
  websocket: {
    open(socket) { clients.add(socket); socket.send(JSON.stringify({ type: "connected", provider: PROVIDER, configured: Boolean(API_KEY) })); for (const q of latest.values()) socket.send(JSON.stringify(q)); },
    message(socket, message) { try { const data = JSON.parse(String(message)); if (data?.action === "ping") socket.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() })); } catch {} },
    close(socket) { clients.delete(socket); },
    error(socket, error) { clients.delete(socket); console.error("client websocket error", error); }
  }
});
console.log(`IRENX listening on :${PORT}`);

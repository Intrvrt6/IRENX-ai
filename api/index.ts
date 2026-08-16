const PROVIDER = process.env.MARKET_PROVIDER || "twelvedata";
const API_KEY = process.env.TWELVEDATA_API_KEY || "";
const ALLOWED = new Set(["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "NAS100"]);
const TD_SYMBOL: Record<string, string> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  NAS100: "NDX"
};

type Quote = { symbol: string; providerSymbol: string; bid: number | null; ask: number | null; price: number; timestamp: string; source: string };
const clients = new Set<any>();
const latest = new Map<string, Quote>();
let providerSocket: WebSocket | null = null;
let providerReconnectTimer: ReturnType<typeof setTimeout> | null = null;
let providerConnected = false;

function cors(headers: Record<string, string> = {}) {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,OPTIONS", "Access-Control-Allow-Headers": "Content-Type", ...headers };
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }) });
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
  ws.addEventListener("open", () => {
    providerConnected = true;
    ws.send(JSON.stringify({ action: "subscribe", params: { symbols: Object.values(TD_SYMBOL).join(",") } }));
  });
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
  ws.addEventListener("close", () => {
    providerConnected = false;
    if (providerReconnectTimer) clearTimeout(providerReconnectTimer);
    providerReconnectTimer = setTimeout(subscribeProvider, 5000);
  });
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
  return { ok: true, provider: PROVIDER, configured: Boolean(API_KEY), providerWebSocket: providerConnected, clients: clients.size, time: new Date().toISOString() };
}

subscribeProvider();

Bun.serve({
  async fetch(request, server) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });
    if (url.pathname === "/api/health") return json(health());
    if (url.pathname === "/api/market") {
      const symbol = (url.searchParams.get("symbol") || "XAUUSD").toUpperCase();
      if (!ALLOWED.has(symbol)) return json({ error: "Unsupported symbol" }, 400);
      const cached = latest.get(symbol);
      if (cached) return json(cached);
      try { return json(await restQuote(symbol)); }
      catch (error) { return json({ error: error instanceof Error ? error.message : "market data unavailable" }, 503); }
    }
    if (url.pathname === "/api/ws") {
      if (!server.upgrade(request)) return new Response("WebSocket upgrade required", { status: 426, headers: cors() });
      return undefined;
    }
    if (url.pathname === "/api") return json({ service: "IRENX live market gateway", endpoints: ["/api/health", "/api/market?symbol=XAUUSD", "/api/ws"] });
    return new Response("Not found", { status: 404, headers: cors() });
  },
  websocket: {
    open(socket) {
      clients.add(socket);
      socket.send(JSON.stringify({ type: "connected", provider: PROVIDER, configured: Boolean(API_KEY) }));
      for (const q of latest.values()) socket.send(JSON.stringify(q));
    },
    message(socket, message) {
      try {
        const data = JSON.parse(String(message));
        if (data?.action === "ping") socket.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
      } catch {}
    },
    close(socket) { clients.delete(socket); },
    error(socket, error) { clients.delete(socket); console.error("client websocket error", error); }
  }
});

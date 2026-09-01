#!/usr/bin/env node
import http from "node:http";

const PORT = Number(process.env.IRENX_PORT || 8787);
const HOST = process.env.IRENX_HOST || "127.0.0.1";
const API_KEY = process.env.OPENAI_API_KEY || "";
const MODEL = process.env.IRENX_OPENAI_MODEL || "gpt-5.6";
const MARKET_DATA_URL = process.env.IRENX_MARKET_DATA_URL || "";
const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY || "";
const TWELVEDATA_BASE_URL = "https://api.twelvedata.com";
const REQUEST_TIMEOUT_MS = Number(process.env.IRENX_AI_TIMEOUT_MS || 45000);
const MAX_BODY_BYTES = 1024 * 1024;
const FAILURE_THRESHOLD = Number(process.env.IRENX_CB_FAILURE_THRESHOLD || 3);
const COOLDOWN_MS = Number(process.env.IRENX_CB_COOLDOWN_MS || 30000);
const MAX_REQUESTS = Number(process.env.IRENX_AI_MAX_REQUESTS || 100);
const MAX_TOKENS = Number(process.env.IRENX_AI_MAX_TOKENS || 200000);
const MAX_OUTPUT_TOKENS = Number(process.env.IRENX_MAX_OUTPUT_TOKENS || 4096);

const SYSTEM = `You are IRENX, the user's trading analysis engine.
Use the mandatory sequence: REGIME -> LIQUIDITY -> REFLEXIVITY -> OROCHI -> VMAP -> EXECUTION -> RISK MANAGEMENT.
VMAP is a confirmation/filter, never a standalone trigger. No single indicator can create a trade.
Prefer WAIT or NO TRADE when evidence is insufficient.
Never invent current market prices, entry, stop loss, take profit, spread, volume, or market structure.
If verified live market data is unavailable, explicitly state LIVE MARKET DATA UNAVAILABLE and return WAIT/NO TRADE rather than fabricated numeric levels.
For IRENX SIGNAL, IRENX SCALPING, and IRENX PRIME return: Bias, Entry/Zone, SL, TP1, TP2, TP3, Trigger/Confirmation, Status.
Keep the output concise and operational. Signals are analysis, not a guarantee of profit.`;

let totalRequests = 0;
let totalTokens = 0;
let consecutiveFailures = 0;
let circuitOpenedAt = 0;

function json(res, status, data) {
  const body = JSON.stringify(data);
  if (status === 204) {
    res.writeHead(204, { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "Content-Type, Authorization" });
    return res.end();
  }
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "Content-Type, Authorization" });
  res.end(body);
}

function circuitOpen() {
  if (circuitOpenedAt && Date.now() - circuitOpenedAt >= COOLDOWN_MS) {
    circuitOpenedAt = 0;
    consecutiveFailures = 0;
  }
  return consecutiveFailures >= FAILURE_THRESHOLD && circuitOpenedAt > 0;
}

function classify(prompt) {
  const p = prompt.toLowerCase();
  if (/\b(code|coding|program|typescript|javascript|python|mql4|mql5|api|refactor)\b/.test(p)) return "coding";
  if (/\b(debug|bug|error|exception|stack trace|fix)\b/.test(p)) return "debugging";
  if (/\b(image|vision|screenshot|diagram)\b/.test(p)) return "vision";
  if (/\b(trading|forex|xauusd|gold|signal|scalp|entry|stop loss|take profit)\b/.test(p)) return "trading";
  if (/\b(reason|prove|derive|architecture|design)\b/.test(p)) return "reasoning";
  if (/\b(analy[sz]e|analysis|compare|research|evaluate)\b/.test(p)) return "analysis";
  if (/\b(readme|documentation|docs|document|summarize)\b/.test(p)) return "docs";
  return "general";
}

function extractSymbol(prompt) {
  const match = prompt.match(/\b(XAUUSD|XAGUSD|EURUSD|GBPUSD|USDJPY|AUDUSD|USDCAD|USDCHF|NAS100|NDX)\b/i);
  return match?.[1]?.toUpperCase() || "XAUUSD";
}

function twelveDataSymbol(symbol) {
  const map = { XAUUSD: "XAU/USD", XAGUSD: "XAG/USD", EURUSD: "EUR/USD", GBPUSD: "GBP/USD", USDJPY: "USD/JPY", AUDUSD: "AUD/USD", USDCAD: "USD/CAD", USDCHF: "USD/CHF", NAS100: "NDX" };
  return map[symbol] || symbol;
}

async function fetchMarketData(symbol) {
  if (MARKET_DATA_URL) {
    const url = new URL(MARKET_DATA_URL);
    url.searchParams.set("symbol", symbol);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`Market data HTTP ${response.status}`);
      const data = await response.json();
      if (!data || typeof data !== "object") throw new Error("Market data response is not an object");
      return { provider: "configured-endpoint", symbol, data };
    } finally {
      clearTimeout(timer);
    }
  }

  if (!TWELVEDATA_API_KEY) return null;
  const tdSymbol = twelveDataSymbol(symbol);
  const url = new URL(`${TWELVEDATA_BASE_URL}/time_series`);
  url.searchParams.set("symbol", tdSymbol);
  url.searchParams.set("interval", process.env.IRENX_MARKET_INTERVAL || "1min");
  url.searchParams.set("outputsize", process.env.IRENX_MARKET_OUTPUTSIZE || "100");
  url.searchParams.set("apikey", TWELVEDATA_API_KEY);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: "application/json" } });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(`Twelve Data HTTP ${response.status}`);
    if (!data || data.status === "error" || data.code) throw new Error(data?.message || "Twelve Data provider error");
    if (!Array.isArray(data.values) || data.values.length === 0) throw new Error("Twelve Data returned no candles");
    return { provider: "twelvedata", symbol, providerSymbol: tdSymbol, interval: data.meta?.interval || process.env.IRENX_MARKET_INTERVAL || "1min", timezone: data.meta?.timezone || null, values: data.values };
  } finally {
    clearTimeout(timer);
  }
}

function responseText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const chunks = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n").trim();
}

async function ai(prompt) {
  if (!API_KEY) throw new Error("OPENAI_API_KEY belum diset di Termux");
  if (circuitOpen()) throw new Error("IRENX circuit breaker: OpenAI sementara diblokir setelah kegagalan beruntun");
  if (totalRequests >= MAX_REQUESTS) throw new Error("IRENX quota guard: request limit reached");

  const symbol = extractSymbol(prompt);
  let marketData = null;
  let marketDataStatus = "LIVE MARKET DATA UNAVAILABLE";
  if (MARKET_DATA_URL || TWELVEDATA_API_KEY) {
    try {
      marketData = await fetchMarketData(symbol);
      marketDataStatus = marketData?.provider === "twelvedata" ? "VERIFIED LIVE MARKET DATA PROVIDED BY TWELVE DATA" : "VERIFIED MARKET DATA PROVIDED BY CONFIGURED ENDPOINT";
    } catch (error) {
      marketDataStatus = `LIVE MARKET DATA UNAVAILABLE (${error instanceof Error ? error.message : "fetch failed"})`;
    }
  }

  const input = `${SYSTEM}\n\nMarket-data status: ${marketDataStatus}\n${marketData ? `Verified market data JSON:\n${JSON.stringify(marketData)}` : "No verified market data was supplied."}\n\nUser: ${prompt}`;
  totalRequests++;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: { authorization: `Bearer ${API_KEY}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ model: MODEL, input, max_output_tokens: MAX_OUTPUT_TOKENS, store: false }),
    });

    const raw = await response.text();
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { raw }; }

    if (!response.ok) {
      consecutiveFailures++;
      if (consecutiveFailures >= FAILURE_THRESHOLD) circuitOpenedAt = Date.now();
      const upstream = payload?.error || {};
      const detail = upstream?.message || payload?.message || `OpenAI HTTP ${response.status}`;
      const error = new Error(`${detail} [HTTP ${response.status}${upstream?.code ? `; code=${upstream.code}` : ""}]`);
      error.status = response.status;
      throw error;
    }

    consecutiveFailures = 0;
    circuitOpenedAt = 0;
    const usage = payload?.usage || {};
    totalTokens += Number(usage.input_tokens || 0) + Number(usage.output_tokens || 0);
    if (totalTokens > MAX_TOKENS) throw new Error("IRENX quota guard: token limit reached");

    const output = responseText(payload);
    if (!output) throw new Error(`OpenAI returned no text output (response_id=${payload?.id || "unknown"})`);

    return {
      output_text: output,
      model: MODEL,
      local: true,
      task: classify(prompt),
      marketData: marketDataStatus,
      marketProvider: marketData?.provider || null,
      symbol,
      irenx: { sequence: ["REGIME", "LIQUIDITY", "REFLEXIVITY", "OROCHI", "VMAP", "EXECUTION", "RISK MANAGEMENT"], status: "READY" },
    };
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(req) {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (Buffer.byteLength(data) > MAX_BODY_BYTES) throw new Error("Request body too large");
  }
  return data;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "OPTIONS") return json(res, 204, {});
    if (url.pathname === "/" || url.pathname === "/api") return json(res, 200, { service: "IRENX Local", mode: "termux", model: MODEL, standalone: true, endpoints: ["/api/health", "/api/ai", "/api/market"] });
    if (url.pathname === "/api/health" && req.method === "GET") return json(res, 200, {
      ok: true,
      service: "irenx-local",
      mode: "termux",
      standalone: true,
      aiConfigured: Boolean(API_KEY),
      marketDataConfigured: Boolean(MARKET_DATA_URL || TWELVEDATA_API_KEY),
      marketProvider: TWELVEDATA_API_KEY ? "twelvedata" : (MARKET_DATA_URL ? "configured-endpoint" : null),
      model: MODEL,
      circuit: circuitOpen() ? "OPEN" : "CLOSED",
      totals: { requests: totalRequests, tokens: totalTokens },
      time: new Date().toISOString(),
    });
    if (url.pathname === "/api/market" && req.method === "GET") {
      const symbol = (url.searchParams.get("symbol") || "XAUUSD").toUpperCase();
      try {
        const data = await fetchMarketData(symbol);
        if (!data) return json(res, 503, { error: "market data unavailable", marketDataConfigured: false });
        return json(res, 200, data);
      } catch (error) {
        return json(res, 503, { error: error instanceof Error ? error.message : "market data unavailable", marketDataConfigured: true });
      }
    }
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
    const message = error instanceof Error ? error.message : "IRENX local failure";
    const status = Number(error?.status) || (/JSON|body too large|prompt is required/.test(message) ? 400 : 502);
    return json(res, status, { error: message, service: "irenx-local", model: MODEL });
  }
});

server.on("error", error => {
  console.error(`IRENX Local server error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => console.log(`IRENX Local running at http://${HOST}:${PORT}`));

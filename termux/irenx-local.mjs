#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const PORT = Number(process.env.IRENX_PORT || 8787);
const HOST = process.env.IRENX_HOST || "127.0.0.1";
const APP_HOME = process.env.IRENX_HOME || path.join(os.homedir(), ".irenx");
const MARKET_FILE = process.env.IRENX_MARKET_FILE || path.join(APP_HOME, "market.json");
const MAX_BODY_BYTES = 1024 * 1024;

const SEQUENCE = [
  "REGIME",
  "LIQUIDITY",
  "REFLEXIVITY",
  "OROCHI",
  "VMAP",
  "EXECUTION",
  "RISK MANAGEMENT",
];

const SYSTEM = `IRENX TERMUX NO-API is a deterministic local trading-analysis engine.\nMandatory sequence: ${SEQUENCE.join(" -> ")}.\nVMAP is confirmation only; no single indicator may trigger a trade.\nNever invent prices or market data. If local market data is missing or insufficient, return WAIT/NO TRADE.\nAnalysis is not a guarantee of profit.`;

let totalRequests = 0;

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "Content-Type",
  });
  res.end(body);
}

function ensureHome() {
  fs.mkdirSync(APP_HOME, { recursive: true });
}

function loadMarket(symbol = "XAUUSD") {
  if (!fs.existsSync(MARKET_FILE)) {
    return { symbol, candles: [], source: "none", file: MARKET_FILE };
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(MARKET_FILE, "utf8"));
  } catch (error) {
    throw new Error(`Invalid local market JSON: ${error instanceof Error ? error.message : "parse failed"}`);
  }

  const candles = Array.isArray(parsed) ? parsed : parsed.candles;
  const actualSymbol = String(parsed?.symbol || symbol).toUpperCase();
  if (!Array.isArray(candles)) throw new Error("Local market file must contain a candles array");

  const clean = candles
    .map((c) => ({
      time: c.time ?? c.datetime ?? c.date ?? null,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number.isFinite(Number(c.volume)) ? Number(c.volume) : 0,
    }))
    .filter((c) => [c.open, c.high, c.low, c.close].every(Number.isFinite) && c.high >= c.low)
    .slice(-500);

  return { symbol: actualSymbol, candles: clean, source: "local-file", file: MARKET_FILE };
}

function average(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

function ema(values, period) {
  if (values.length < period) return null;
  let e = average(values.slice(0, period));
  const k = 2 / (period + 1);
  for (let i = period; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function atr(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const tr = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  return average(tr.slice(-period));
}

function rsi(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  const start = closes.length - period;
  for (let i = start; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d;
    else losses -= d;
  }
  if (losses === 0) return 100;
  return 100 - 100 / (1 + gains / losses);
}

function vwap(candles, period = 50) {
  const rows = candles.slice(-period);
  let pv = 0;
  let v = 0;
  for (const c of rows) {
    const typical = (c.high + c.low + c.close) / 3;
    const volume = c.volume > 0 ? c.volume : 1;
    pv += typical * volume;
    v += volume;
  }
  return v ? pv / v : null;
}

function fmt(value) {
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function analyze(symbol = "XAUUSD") {
  const market = loadMarket(symbol);
  const candles = market.candles;
  const base = {
    service: "irenx-local",
    mode: "termux-no-api",
    standalone: true,
    symbol: market.symbol,
    source: market.source,
    marketFile: market.file,
    sequence: SEQUENCE,
  };

  if (candles.length < 20) {
    return {
      ...base,
      status: "WAIT",
      tradeStatus: "NO TRADE",
      reason: "INSUFFICIENT LOCAL MARKET DATA",
      required: "At least 20 valid OHLC candles are required; 50+ is recommended for stronger confirmation.",
      indicators: null,
    };
  }

  const closes = candles.map((c) => c.close);
  const last = candles.at(-1);
  const prev = candles.at(-2);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const atr14 = atr(candles, 14);
  const rsi14 = rsi(closes, 14);
  const vwap50 = vwap(candles, 50);
  const recent = candles.slice(-20);
  const swingHigh = Math.max(...recent.slice(0, -1).map((c) => c.high));
  const swingLow = Math.min(...recent.slice(0, -1).map((c) => c.low));
  const range = Math.max(last.high - last.low, atr14 || 0);
  const momentum = last.close - prev.close;

  const trendBull = ema20 !== null && ema50 !== null && ema20 > ema50 && last.close > ema20;
  const trendBear = ema20 !== null && ema50 !== null && ema20 < ema50 && last.close < ema20;
  const regime = trendBull ? "BULLISH TREND" : trendBear ? "BEARISH TREND" : "RANGE / TRANSITION";

  const sweepLow = last.low < swingLow && last.close > swingLow;
  const sweepHigh = last.high > swingHigh && last.close < swingHigh;
  const liquidity = sweepLow ? "SELL-SIDE LIQUIDITY SWEEP" : sweepHigh ? "BUY-SIDE LIQUIDITY SWEEP" : "NO CONFIRMED SWEEP";

  const reflexivity = momentum > 0 ? "POSITIVE MOMENTUM" : momentum < 0 ? "NEGATIVE MOMENTUM" : "NEUTRAL MOMENTUM";
  const orochi = sweepLow && momentum > 0 ? "BULLISH REVERSAL RESPONSE" : sweepHigh && momentum < 0 ? "BEARISH REVERSAL RESPONSE" : "NO REVERSAL CONFIRMED";
  const vmapSide = vwap50 !== null ? (last.close > vwap50 ? "PRICE ABOVE VMAP" : "PRICE BELOW VMAP") : "VMAP UNAVAILABLE";

  let bias = "NEUTRAL";
  let status = "WAIT";
  let trigger = "Require structure + liquidity + momentum + VMAP alignment.";

  const buyConfirmed = trendBull && last.close > (vwap50 ?? last.close) && (sweepLow || momentum > 0) && rsi14 !== null && rsi14 < 75;
  const sellConfirmed = trendBear && last.close < (vwap50 ?? last.close) && (sweepHigh || momentum < 0) && rsi14 !== null && rsi14 > 25;

  if (buyConfirmed) {
    bias = "BUY";
    status = "SETUP VALID — WAIT FOR EXECUTION TRIGGER";
    trigger = sweepLow ? "Bullish liquidity sweep + close confirmation above VMAP." : "Bullish structure + positive momentum + VMAP alignment.";
  } else if (sellConfirmed) {
    bias = "SELL";
    status = "SETUP VALID — WAIT FOR EXECUTION TRIGGER";
    trigger = sweepHigh ? "Bearish liquidity sweep + close confirmation below VMAP." : "Bearish structure + negative momentum + VMAP alignment.";
  }

  const entry = bias === "BUY" ? last.close : bias === "SELL" ? last.close : null;
  const risk = atr14 ? Math.max(atr14 * 0.8, range * 0.5) : null;
  const sl = entry !== null && risk !== null ? (bias === "BUY" ? entry - risk : entry + risk) : null;
  const tp1 = entry !== null && risk !== null ? (bias === "BUY" ? entry + risk : entry - risk) : null;
  const tp2 = entry !== null && risk !== null ? (bias === "BUY" ? entry + risk * 2 : entry - risk * 2) : null;
  const tp3 = entry !== null && risk !== null ? (bias === "BUY" ? entry + risk * 3 : entry - risk * 3) : null;

  return {
    ...base,
    status,
    tradeStatus: status.startsWith("SETUP") ? "WAIT EXECUTION" : "NO TRADE",
    bias,
    entryZone: entry === null ? null : { entry: fmt(entry), zone: [fmt(entry - (atr14 || 0) * 0.15), fmt(entry + (atr14 || 0) * 0.15)] },
    sl: fmt(sl),
    tp1: fmt(tp1),
    tp2: fmt(tp2),
    tp3: fmt(tp3),
    triggerConfirmation: trigger,
    stages: { regime, liquidity, reflexivity, orochi, vmap: vmapSide },
    indicators: { close: fmt(last.close), ema20: fmt(ema20), ema50: fmt(ema50), atr14: fmt(atr14), rsi14: fmt(rsi14), vwap50: fmt(vwap50), swingHigh: fmt(swingHigh), swingLow: fmt(swingLow) },
    candleTime: last.time,
    candlesUsed: candles.length,
    riskManagement: "Risk per trade must be defined by the user/broker account. IRENX does not size or execute orders.",
  };
}

function ask(prompt) {
  const p = String(prompt || "").trim();
  const upper = p.toUpperCase();
  if (!p) return { error: "prompt is required" };
  if (upper.includes("IRENX TEST") || upper === "TEST") {
    return {
      service: "irenx-local",
      mode: "termux-no-api",
      status: "READY",
      apiRequired: false,
      networkAI: false,
      marketSource: "LOCAL FILE ONLY",
      sequence: SEQUENCE,
      message: "IRENX TEST OK — local deterministic engine is running without OpenAI/Twelve Data/API keys.",
    };
  }
  if (/^(IRENX )?(SIGNAL|SCALPING|PRIME)/i.test(p) || /XAUUSD|XAGUSD|EURUSD|GBPUSD|USDJPY|NAS100/i.test(p)) {
    const symbol = (p.match(/\b(XAUUSD|XAGUSD|EURUSD|GBPUSD|USDJPY|AUDUSD|USDCAD|USDCHF|NAS100|NDX)\b/i)?.[1] || "XAUUSD").toUpperCase();
    return analyze(symbol);
  }
  return {
    service: "irenx-local",
    mode: "termux-no-api",
    status: "READY",
    apiRequired: false,
    message: "IRENX NO-API mode does not contain a cloud LLM. Use signal/scalping/prime with local OHLC data, or use IRENX commands/help.",
    supported: ["health", "market", "signal", "scalping", "prime", "ask \"IRENX TEST\""],
  };
}

async function readBody(req) {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (Buffer.byteLength(data) > MAX_BODY_BYTES) throw new Error("Request body too large");
  }
  return data;
}

function health() {
  const marketConfigured = fs.existsSync(MARKET_FILE);
  return {
    ok: true,
    service: "irenx-local",
    mode: "termux-no-api",
    standalone: true,
    apiRequired: false,
    networkAI: false,
    marketDataConfigured: marketConfigured,
    marketProvider: marketConfigured ? "local-file" : null,
    model: null,
    circuit: "DISABLED — no cloud API",
    totals: { requests: totalRequests },
    marketFile: MARKET_FILE,
    sequence: SEQUENCE,
    time: new Date().toISOString(),
  };
}

ensureHome();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "OPTIONS") return json(res, 204, {});
    if (url.pathname === "/" || url.pathname === "/api") return json(res, 200, { service: "IRENX Local", mode: "termux-no-api", standalone: true, apiRequired: false, endpoints: ["/api/health", "/api/ai", "/api/market"] });
    if (url.pathname === "/api/health" && req.method === "GET") return json(res, 200, health());
    if (url.pathname === "/api/market" && req.method === "GET") {
      const symbol = (url.searchParams.get("symbol") || "XAUUSD").toUpperCase();
      return json(res, 200, loadMarket(symbol));
    }
    if (url.pathname === "/api/ai" && req.method === "POST") {
      const body = JSON.parse(await readBody(req) || "{}");
      totalRequests++;
      return json(res, 200, ask(body.prompt));
    }
    if (url.pathname === "/api/ai" && req.method === "GET") {
      totalRequests++;
      return json(res, 200, ask(url.searchParams.get("prompt")));
    }
    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : "IRENX local failure" });
  }
});

server.on("error", (error) => {
  console.error(`IRENX Local server error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log(`IRENX TERMUX NO-API running at http://${HOST}:${PORT}`);
  console.log(`Local market file: ${MARKET_FILE}`);
});

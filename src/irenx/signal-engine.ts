export type SignalStatus = "BUY" | "SELL" | "WAIT" | "NO TRADE";

export type Candle = {
  datetime: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type TimeframeAnalysis = {
  timeframe: string;
  trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  momentum: number;
  structure: "HH_HL" | "LH_LL" | "MIXED";
  liquiditySweep: "BUY_SIDE" | "SELL_SIDE" | "NONE";
};

export type IrenxSignal = {
  symbol: string;
  status: SignalStatus;
  bias: "BULLISH" | "BEARISH" | "NEUTRAL";
  entry: number | null;
  sl: number | null;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  rr: number | null;
  confidence: number;
  trigger: string;
  regime: string;
  liquidity: string;
  vmap: string;
  timeframes: TimeframeAnalysis[];
  generatedAt: string;
};

function ema(values: number[], period: number) {
  if (values.length < period) return null;
  const k = 2 / (period + 1);
  let value = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < values.length; i++) value = values[i] * k + value * (1 - k);
  return value;
}

function atr(candles: Candle[], period = 14) {
  if (candles.length < period + 1) return null;
  const tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  return tr.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function analyzeTimeframe(timeframe: string, candles: Candle[]): TimeframeAnalysis {
  const closes = candles.map(c => c.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const last = closes.at(-1) || 0;
  const previous = closes.at(-6) || last;
  const momentum = e20 && e50 ? Math.max(-100, Math.min(100, ((last - e50) / Math.max(last * 0.001, 1)) * 10)) : 0;
  const trend = e20 == null || e50 == null ? "NEUTRAL" : e20 > e50 && last > e20 ? "BULLISH" : e20 < e50 && last < e20 ? "BEARISH" : "NEUTRAL";
  const highs = candles.slice(-6).map(c => c.high);
  const lows = candles.slice(-6).map(c => c.low);
  const structure = highs.at(-1)! > highs[0] && lows.at(-1)! > lows[0] ? "HH_HL" : highs.at(-1)! < highs[0] && lows.at(-1)! < lows[0] ? "LH_LL" : "MIXED";
  const range = Math.max(...candles.slice(-20).map(c => c.high)) - Math.min(...candles.slice(-20).map(c => c.low));
  const recentLow = Math.min(...candles.slice(-6, -1).map(c => c.low));
  const recentHigh = Math.max(...candles.slice(-6, -1).map(c => c.high));
  const liquiditySweep = range > 0 && last > recentHigh ? "SELL_SIDE" : range > 0 && last < recentLow ? "BUY_SIDE" : "NONE";
  return { timeframe, trend, momentum: Number(momentum.toFixed(1)), structure, liquiditySweep };
}

export function buildIrenxSignal(symbol: string, price: number, datasets: Record<string, Candle[]>): IrenxSignal {
  const analyses = Object.entries(datasets).map(([tf, candles]) => analyzeTimeframe(tf, candles));
  const bullish = analyses.filter(a => a.trend === "BULLISH").length;
  const bearish = analyses.filter(a => a.trend === "BEARISH").length;
  const bias = bullish > bearish ? "BULLISH" : bearish > bullish ? "BEARISH" : "NEUTRAL";
  const aligned = Math.max(bullish, bearish);
  const confidence = Math.min(95, 50 + aligned * 12 + (analyses.filter(a => a.structure === (bias === "BULLISH" ? "HH_HL" : "LH_LL")).length * 5));
  const allCandles = Object.values(datasets).flat();
  const volatility = atr(allCandles.slice(-100), 14) || Math.max(price * 0.001, 1);
  const direction = bias === "BULLISH" ? 1 : bias === "BEARISH" ? -1 : 0;
  const entry = direction ? price : null;
  const sl = direction ? price - direction * volatility * 1.2 : null;
  const risk = sl == null ? null : Math.abs(price - sl);
  const tp1 = risk == null ? null : price + direction * risk * 1.5;
  const tp2 = risk == null ? null : price + direction * risk * 2;
  const tp3 = risk == null ? null : price + direction * risk * 3;
  const trigger = direction === 0 ? "Multi-timeframe structure is not aligned" : `MTF ${bias.toLowerCase()} alignment with volatility-based risk filter`;
  const status: SignalStatus = confidence >= 78 && aligned >= 2 ? (direction > 0 ? "BUY" : "SELL") : confidence >= 62 ? "WAIT" : "NO TRADE";
  return {
    symbol,
    status,
    bias,
    entry,
    sl,
    tp1,
    tp2,
    tp3,
    rr: risk ? 1.5 : null,
    confidence: Number(confidence.toFixed(0)),
    trigger,
    regime: bias === "NEUTRAL" ? "TRANSITION" : "TREND",
    liquidity: analyses.map(a => `${a.timeframe}:${a.liquiditySweep}`).join(" | "),
    vmap: "FILTER_ONLY: price/structure confirmation required",
    timeframes: analyses,
    generatedAt: new Date().toISOString(),
  };
}

export async function fetchTwelveDataCandles(symbol: string, interval: string, outputsize = 120): Promise<Candle[]> {
  const apiKey = process.env.TWELVEDATA_API_KEY || "";
  if (!apiKey) throw new Error("TWELVEDATA_API_KEY is not configured");
  const providerSymbol = symbol === "XAUUSD" ? "XAU/USD" : symbol.includes("/") ? symbol : symbol;
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", providerSymbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", String(Math.min(500, Math.max(50, outputsize))));
  url.searchParams.set("apikey", apiKey);
  const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  const data = await response.json() as any;
  if (!response.ok || data.status === "error" || !Array.isArray(data.values)) throw new Error(data.message || `Twelve Data request failed with HTTP ${response.status}`);
  return data.values.reverse().map((v: any) => ({ datetime: String(v.datetime), open: Number(v.open), high: Number(v.high), low: Number(v.low), close: Number(v.close) })).filter((c: Candle) => [c.open, c.high, c.low, c.close].every(Number.isFinite));
}

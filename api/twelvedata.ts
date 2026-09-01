const BASE_URL = "https://api.twelvedata.com";
export const TWELVEDATA_OPENAPI_URL = "https://api.twelvedata.com/doc/swagger/openapi.json";

export type TwelveDataRequest = {
  endpoint: string;
  params?: Record<string, string | number | boolean | undefined>;
};

function apiKey() {
  const key = process.env.TWELVEDATA_API_KEY || "";
  if (!key) throw new Error("TWELVEDATA_API_KEY is not configured");
  return key;
}

export async function twelveDataRequest<T = unknown>({ endpoint, params = {} }: TwelveDataRequest): Promise<T> {
  const url = new URL(endpoint.replace(/^\/+/, ""), `${BASE_URL}/`);
  url.searchParams.set("apikey", apiKey());
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Twelve Data HTTP ${response.status}: ${body?.message || response.statusText}`);
  if (body?.status === "error" || body?.code) throw new Error(`Twelve Data ${body.code || "error"}: ${body.message || "provider error"}`);
  return body as T;
}

export async function twelveDataPrice(symbol: string) {
  return twelveDataRequest({ endpoint: "price", params: { symbol } });
}

export async function twelveDataQuote(symbol: string) {
  return twelveDataRequest({ endpoint: "quote", params: { symbol } });
}

export async function twelveDataTimeSeries(symbol: string, interval = "1min", outputsize = 200) {
  return twelveDataRequest({ endpoint: "time_series", params: { symbol, interval, outputsize } });
}

export async function twelveDataIndicator(endpoint: "rsi" | "macd" | "sma" | "ema" | "atr", symbol: string, interval = "1min", params: Record<string, string | number | boolean | undefined> = {}) {
  return twelveDataRequest({ endpoint, params: { symbol, interval, ...params } });
}

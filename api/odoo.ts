const ODOO_URL = (process.env.ODOO_BASE_URL || "").replace(/\/$/, "");
const ODOO_API_KEY = process.env.ODOO_API_KEY || "";
const ODOO_DATABASE = process.env.ODOO_DATABASE || "";
const ODOO_TIMEOUT_MS = Number(process.env.ODOO_TIMEOUT_MS || 15000);

export type OdooCall = {
  model: string;
  method: string;
  ids?: number[];
  context?: Record<string, unknown>;
  [key: string]: unknown;
};

export type IrenxSignal = {
  symbol: string;
  status: "BUY" | "SELL" | "WAIT" | "NO TRADE";
  bias?: string;
  entry?: number | null;
  sl?: number | null;
  tp1?: number | null;
  tp2?: number | null;
  tp3?: number | null;
  confidence?: number | null;
  timeframe?: string;
  regime?: string;
  liquidity?: string;
  reflexivity?: string;
  orochi?: string;
  vmap?: string;
  trigger?: string;
  timestamp?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
};

export function odooConfigured() {
  return Boolean(ODOO_URL && ODOO_API_KEY);
}

function headers() {
  const result: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json; charset=utf-8",
    Authorization: `bearer ${ODOO_API_KEY}`,
    "User-Agent": "IRENX-Odoo-Integration/1.1",
  };
  if (ODOO_DATABASE) result["X-Odoo-Database"] = ODOO_DATABASE;
  return result;
}

async function callOdoo(model: string, method: string, body: Record<string, unknown> = {}) {
  if (!ODOO_URL || !ODOO_API_KEY) throw new Error("ODOO_BASE_URL and ODOO_API_KEY are required");
  if (!model || !/^[a-zA-Z0-9_.]+$/.test(model)) throw new Error("Invalid Odoo model");
  if (!method || !/^[a-zA-Z0-9_]+$/.test(method)) throw new Error("Invalid Odoo method");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ODOO_TIMEOUT_MS);
  try {
    const response = await fetch(`${ODOO_URL}/json/2/${encodeURIComponent(model)}/${encodeURIComponent(method)}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: unknown;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!response.ok) {
      const detail = typeof payload === "object" && payload !== null ? JSON.stringify(payload) : String(payload);
      throw new Error(`Odoo HTTP ${response.status}: ${detail.slice(0, 1000)}`);
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export async function odooHealth() {
  if (!ODOO_URL) return { configured: false, ok: false, reason: "ODOO_BASE_URL is not configured" };
  if (!ODOO_API_KEY) return { configured: false, ok: false, reason: "ODOO_API_KEY is not configured" };
  try {
    await callOdoo("res.users", "context_get");
    return { configured: true, ok: true, baseUrl: ODOO_URL, databaseConfigured: Boolean(ODOO_DATABASE) };
  } catch (error) {
    return { configured: true, ok: false, baseUrl: ODOO_URL, databaseConfigured: Boolean(ODOO_DATABASE), error: error instanceof Error ? error.message : "Odoo health check failed" };
  }
}

export function odooSearchRead(model: string, domain: unknown[] = [], fields: string[] = [], limit = 50) {
  return callOdoo(model, "search_read", { domain, fields, limit: Math.min(Math.max(limit, 1), 200) });
}

export function odooCreate(model: string, values: Record<string, unknown>) {
  return callOdoo(model, "create", { values });
}

export function odooRead(model: string, ids: number[], fields: string[] = []) {
  return callOdoo(model, "read", { ids, fields });
}

/**
 * Automatically persists an IRENX SIGNAL into the installed Odoo journal module.
 * The custom module exposes create_from_irenx() so retries are idempotent.
 */
export function pushIrenxSignal(signal: IrenxSignal) {
  const model = process.env.ODOO_SIGNAL_MODEL || "irenx.signal";
  const timestamp = signal.timestamp || new Date().toISOString();
  const externalId = signal.externalId || String(signal.metadata?.signal_id || `${signal.symbol}:${signal.status}:${timestamp}`);
  const values: Record<string, unknown> = {
    name: `IRENX ${signal.symbol} ${signal.status}`,
    symbol: signal.symbol,
    status: signal.status,
    bias: signal.bias || "",
    entry: signal.entry ?? 0,
    sl: signal.sl ?? 0,
    tp1: signal.tp1 ?? 0,
    tp2: signal.tp2 ?? 0,
    tp3: signal.tp3 ?? 0,
    confidence: signal.confidence ?? 0,
    timeframe: signal.timeframe || "",
    regime: signal.regime || "",
    liquidity: signal.liquidity || "",
    reflexivity: signal.reflexivity || "",
    orochi: signal.orochi || "",
    vmap: signal.vmap || "",
    trigger: signal.trigger || "",
    signal_time: timestamp,
    source: "IRENX",
    external_id: externalId,
    metadata_json: JSON.stringify(signal.metadata || {}),
  };
  return callOdoo(model, "create_from_irenx", { values });
}

export async function odooCall(request: OdooCall) {
  const { model, method, ids, context, ...params } = request;
  return callOdoo(model, method, { ...(ids ? { ids } : {}), ...(context ? { context } : {}), ...params });
}

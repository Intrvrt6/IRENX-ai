import { createMcpHandler } from "agents/mcp/server";
import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

type Env = {
  IRENX_ENV: string;
  IRENX_PUBLIC_ORIGIN: string;
  IRENX_AI_BUDGET_USD: string;
  IRENX_AI_MAX_REQUESTS: string;
  IRENX_AI_MAX_TOKENS: string;
  IRENX_AI_MAX_LATENCY_MS: string;
  IRENX_AI_TIMEOUT_MS: string;
  IRENX_CB_FAILURE_THRESHOLD: string;
  IRENX_CB_COOLDOWN_MS: string;
  IRENX_INPUT_USD_PER_1M: string;
  IRENX_OUTPUT_USD_PER_1M: string;
  IRENX_EST_OUTPUT_TOKENS: string;
  OMNIROUTE_BASE_URL?: string;
  OMNIROUTE_API_KEY?: string;
  DIFY_BASE_URL?: string;
  DIFY_API_KEY?: string;
};

type ProviderMetric = { requests: number; successes: number; failures: number; latency: number; consecutiveFailures: number; openedAt: number; spend: number };
const metrics = new Map<string, ProviderMetric>();
let totalRequests = 0;
let totalTokens = 0;
let totalSpend = 0;

const docs: Record<string, { title: string; text: string; url: string }> = {
  "irenx-overview": { title: "IRENX Overview", url: "https://ai.irenx.com/mcp/docs/irenx-overview", text: "IRENX is a Cloudflare-native AI gateway. It provides task-aware routing, cost and quota guards, circuit breaking, observability, OmniRoute integration, Dify integration, and Remote MCP tools." },
  "irenx-routing": { title: "IRENX Routing Policy", url: "https://ai.irenx.com/mcp/docs/irenx-routing", text: "IRENX classifies work into coding, reasoning, vision, chat, analysis, debugging, docs, trading, and general tasks. Routing preferences are applied before requests reach OmniRoute." },
  "irenx-mcp": { title: "IRENX MCP", url: "https://ai.irenx.com/mcp/docs/irenx-mcp", text: "IRENX exposes a stateless Remote MCP endpoint at /mcp using Streamable HTTP. The read-only search and fetch tools are designed for research and knowledge workflows." }
};

function num(value: string | undefined, fallback: number) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function envNum(env: Env, key: keyof Env, fallback: number) { return num(env[key] as string | undefined, fallback); }
function metric(key: string) { let m = metrics.get(key); if (!m) { m = { requests: 0, successes: 0, failures: 0, latency: 0, consecutiveFailures: 0, openedAt: 0, spend: 0 }; metrics.set(key, m); } return m; }
function circuitOpen(m: ProviderMetric, env: Env) { const threshold = envNum(env, "IRENX_CB_FAILURE_THRESHOLD", 3); const cooldown = envNum(env, "IRENX_CB_COOLDOWN_MS", 30000); if (m.openedAt && Date.now() - m.openedAt >= cooldown) { m.openedAt = 0; m.consecutiveFailures = 0; } return m.consecutiveFailures >= threshold && m.openedAt > 0; }
function classify(prompt: string) { const p = prompt.toLowerCase(); if (/\b(code|coding|program|typescript|javascript|python|mql4|mql5|api|refactor)\b/.test(p)) return "coding"; if (/\b(debug|bug|error|exception|stack trace|fix)\b/.test(p)) return "debugging"; if (/\b(image|vision|screenshot|diagram)\b/.test(p)) return "vision"; if (/\b(trading|forex|xauusd|gold|signal|scalp|entry|stop loss|take profit)\b/.test(p)) return "trading"; if (/\b(reason|prove|derive|architecture|design)\b/.test(p)) return "reasoning"; if (/\b(analy[sz]e|analysis|compare|research|evaluate)\b/.test(p)) return "analysis"; if (/\b(readme|documentation|docs|document|summarize)\b/.test(p)) return "docs"; if (/\b(chat|conversation|reply|explain)\b/.test(p)) return "chat"; return "general"; }
function estimateTokens(text: string) { return Math.max(1, Math.ceil(text.length / 4)); }
function estimateCost(input: number, output: number, env: Env) { return input / 1e6 * envNum(env, "IRENX_INPUT_USD_PER_1M", 3) + output / 1e6 * envNum(env, "IRENX_OUTPUT_USD_PER_1M", 15); }
function json(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } }); }

async function routeAI(prompt: string, env: Env, model?: string) {
  const base = (env.OMNIROUTE_BASE_URL || "").replace(/\/$/, "");
  const key = env.OMNIROUTE_API_KEY || "";
  if (!base || !key) throw new Error("OmniRoute upstream is not configured in Cloudflare secrets");
  const inputTokens = estimateTokens(prompt);
  const outputTokens = envNum(env, "IRENX_EST_OUTPUT_TOKENS", 1200);
  const budget = envNum(env, "IRENX_AI_BUDGET_USD", 2);
  const maxRequests = envNum(env, "IRENX_AI_MAX_REQUESTS", 100);
  const maxTokens = envNum(env, "IRENX_AI_MAX_TOKENS", 200000);
  const projected = estimateCost(inputTokens, outputTokens, env);
  if (totalRequests >= maxRequests) throw new Error("IRENX quota guard: request limit reached");
  if (totalTokens + inputTokens > maxTokens) throw new Error("IRENX quota guard: token limit reached");
  if (totalSpend + projected > budget) throw new Error("IRENX budget guard: projected request exceeds remaining budget");

  const task = classify(prompt);
  const selected = model || (task === "coding" || task === "debugging" ? "auto/coding:pro" : task === "reasoning" || task === "analysis" || task === "trading" ? "auto/reasoning:pro" : task === "vision" ? "auto/vision:pro" : "auto");
  const upstreamKey = "omniroute";
  const m = metric(upstreamKey);
  if (circuitOpen(m, env)) throw new Error("IRENX circuit breaker: OmniRoute is temporarily open");

  totalRequests++;
  totalTokens += inputTokens;
  const started = Date.now();
  const timeout = envNum(env, "IRENX_AI_TIMEOUT_MS", 45000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(`${base}/v1/chat/completions`, { method: "POST", signal: controller.signal, headers: { authorization: `Bearer ${key}`, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ model: selected, messages: [{ role: "user", content: prompt }] }) });
    const latency = Date.now() - started;
    m.requests++; m.latency += latency;
    if (!response.ok) { m.failures++; m.consecutiveFailures++; if (m.consecutiveFailures >= envNum(env, "IRENX_CB_FAILURE_THRESHOLD", 3)) m.openedAt = Date.now(); throw new Error(`OmniRoute upstream HTTP ${response.status}`); }
    const payload: any = await response.json();
    m.successes++; m.consecutiveFailures = 0; m.openedAt = 0;
    const usage = payload?.usage || {};
    const inUsed = Number(usage.prompt_tokens ?? usage.input_tokens ?? inputTokens);
    const outUsed = Number(usage.completion_tokens ?? usage.output_tokens ?? outputTokens);
    const spend = estimateCost(Math.max(0, inUsed), Math.max(0, outUsed), env);
    totalTokens += Math.max(0, outUsed); totalSpend += spend; m.spend += spend;
    return { ...payload, irenx: { task, selectedRoute: selected, upstream: "omniroute", latencyMs: latency, estimatedCostUsd: Number(spend.toFixed(6)), circuit: "CLOSED", strategy: "cloudflare-native-v1" } };
  } finally { clearTimeout(timer); }
}

function createMcpServer() {
  const server = new McpServer({ name: "IRENX Cloudflare MCP", version: "1.0.0" });
  server.registerTool("search", { description: "Search IRENX public documentation and capabilities.", inputSchema: { query: z.string().min(1) } }, async ({ query }) => {
    const q = query.toLowerCase();
    const results = Object.entries(docs).filter(([, d]) => `${d.title} ${d.text}`.toLowerCase().includes(q) || q.split(/\s+/).some(term => term.length > 2 && `${d.title} ${d.text}`.toLowerCase().includes(term))).map(([id, d]) => ({ id, title: d.title, url: d.url }));
    return { structuredContent: { results }, content: [{ type: "text", text: JSON.stringify({ results }) }] };
  });
  server.registerTool("fetch", { description: "Fetch an IRENX documentation item by ID.", inputSchema: { id: z.string().min(1) } }, async ({ id }) => {
    const d = docs[id];
    if (!d) throw new Error(`Document not found: ${id}`);
    const result = { id, title: d.title, text: d.text, url: d.url, metadata: { source: "irenx-cloudflare-worker" } };
    return { structuredContent: result, content: [{ type: "text", text: JSON.stringify(result) }] };
  });
  return server;
}
const mcpHandler = createMcpHandler(createMcpServer, { route: "/mcp", allowedHostnames: ["ai.irenx.com", "irenx-ai.workers.dev"] });

export default { async fetch(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);
  if (url.pathname === "/mcp" || url.pathname.startsWith("/mcp/")) return mcpHandler(request, env, ctx);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-allow-headers": "Content-Type, Authorization, Mcp-Session-Id" } });
  if (url.pathname === "/" || url.pathname === "/api") return json({ service: "IRENX Cloudflare-native", version: "1.0.0", endpoints: ["/api/health", "/api/ai/route", "/api/ai", "/api/dify/health", "/mcp"] });
  if (url.pathname === "/api/health") return json({ ok: true, service: "irenx-cloudflare", environment: env.IRENX_ENV, domain: env.IRENX_PUBLIC_ORIGIN, mcp: "/mcp", upstreams: { omniroute: Boolean(env.OMNIROUTE_BASE_URL && env.OMNIROUTE_API_KEY), dify: Boolean(env.DIFY_BASE_URL && env.DIFY_API_KEY) }, totals: { requests: totalRequests, tokens: totalTokens, estimatedSpendUsd: Number(totalSpend.toFixed(6)) }, time: new Date().toISOString() });
  if (url.pathname === "/api/ai/route") { const prompt = url.searchParams.get("prompt") || ""; if (!prompt) return json({ error: "prompt is required" }, 400); return json({ task: classify(prompt), route: classify(prompt) === "coding" ? "auto/coding:pro" : classify(prompt) === "trading" ? "auto/reasoning:pro" : "auto" }); }
  if (url.pathname === "/api/ai" && request.method === "POST") { try { const body: any = await request.json(); const prompt = typeof body?.prompt === "string" ? body.prompt : ""; if (!prompt.trim()) return json({ error: "prompt is required" }, 400); return json(await routeAI(prompt, env, typeof body?.model === "string" ? body.model : undefined)); } catch (e) { return json({ error: e instanceof Error ? e.message : "IRENX AI failure" }, 502); } }
  if (url.pathname === "/api/dify/health") return json({ ok: Boolean(env.DIFY_BASE_URL && env.DIFY_API_KEY), configured: Boolean(env.DIFY_BASE_URL && env.DIFY_API_KEY), baseUrl: env.DIFY_BASE_URL || null });
  if (url.pathname === "/api/dify/workflows/run" && request.method === "POST") { if (!env.DIFY_BASE_URL || !env.DIFY_API_KEY) return json({ error: "Dify upstream is not configured" }, 503); const body = await request.text(); const response = await fetch(`${env.DIFY_BASE_URL.replace(/\/$/, "")}/v1/workflows/run`, { method: "POST", headers: { authorization: `Bearer ${env.DIFY_API_KEY}`, "content-type": "application/json" }, body }); return new Response(response.body, { status: response.status, headers: { "content-type": response.headers.get("content-type") || "application/json", "cache-control": "no-store" } }); }
  return json({ error: "Not found" }, 404);
} } satisfies ExportedHandler<Env>;

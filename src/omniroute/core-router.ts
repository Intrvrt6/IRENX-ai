export type TaskType = "coding" | "reasoning" | "vision" | "chat" | "analysis" | "debugging" | "docs" | "trading" | "general";
export type RouteTier = "pro" | "free" | "cheap" | "fast" | "reliable";
type CircuitState = "CLOSED" | "HALF_OPEN" | "OPEN";
type ProviderMetric = { provider: string; model: string; requests: number; successes: number; failures: number; totalLatencyMs: number; lastSuccessAt: number; lastFailureAt: number; consecutiveFailures: number; state: CircuitState; openedAt: number; estimatedSpendUsd: number; };
type RouterDecision = { task: TaskType; model: string; strategy: string; budgetUsd: number; estimatedCostUsd: number; circuit: CircuitState; scorePolicy: Record<string, number>; reason: string; };
type RouterOptions = { budgetUsd?: number; maxLatencyMs?: number; tier?: RouteTier; model?: string; };

const DEFAULT_BUDGET_USD = Number(process.env.IRENX_AI_BUDGET_USD || "2");
const MAX_LATENCY_MS = Number(process.env.IRENX_AI_MAX_LATENCY_MS || "12000");
const MAX_REQUESTS = Number(process.env.IRENX_AI_MAX_REQUESTS || "0");
const MAX_TOKENS = Number(process.env.IRENX_AI_MAX_TOKENS || "0");
const INPUT_USD_PER_1M = Number(process.env.IRENX_INPUT_USD_PER_1M || "3");
const OUTPUT_USD_PER_1M = Number(process.env.IRENX_OUTPUT_USD_PER_1M || "15");
const DEFAULT_OUTPUT_TOKENS = Number(process.env.IRENX_EST_OUTPUT_TOKENS || "1200");
const CB_FAILURE_THRESHOLD = Number(process.env.IRENX_CB_FAILURE_THRESHOLD || "3");
const CB_COOLDOWN_MS = Number(process.env.IRENX_CB_COOLDOWN_MS || "30000");
const REQUEST_TIMEOUT_MS = Number(process.env.IRENX_AI_TIMEOUT_MS || "45000");
const metrics = new Map<string, ProviderMetric>();
const routeEvents: Array<Record<string, unknown>> = [];
let totalRequests = 0;
let totalTokens = 0;
let totalSpendUsd = 0;

const TASK_HINTS: Record<TaskType, RegExp[]> = {
  coding: [/\b(code|coding|program|implement|refactor|typescript|javascript|python|mql4|mql5|api)\b/i],
  reasoning: [/\b(reason|reasoning|prove|derive|architecture|design)\b/i],
  vision: [/\b(image|vision|screenshot|visual|diagram)\b/i],
  chat: [/\b(chat|conversation|reply|explain)\b/i],
  analysis: [/\b(analy[sz]e|analysis|compare|research|evaluate)\b/i],
  debugging: [/\b(debug|bug|error|exception|fix|trace)\b/i],
  docs: [/\b(readme|documentation|docs|document|write|summarize)\b/i],
  trading: [/\b(trading|forex|xauusd|gold|signal|scalp|entry|sl|tp|market)\b/i],
  general: []
};

function now() { return Date.now(); }
function clamp(n: number, min = 0, max = 1) { return Math.max(min, Math.min(max, n)); }
function estimateTokens(text: string) { return Math.max(1, Math.ceil(text.length / 4)); }
function estimateCost(inputTokens: number, outputTokens = DEFAULT_OUTPUT_TOKENS) { return (inputTokens / 1_000_000) * INPUT_USD_PER_1M + (outputTokens / 1_000_000) * OUTPUT_USD_PER_1M; }

export function classifyTask(input: string): TaskType {
  const scores = new Map<TaskType, number>();
  for (const [task, hints] of Object.entries(TASK_HINTS) as [TaskType, RegExp[]][]) scores.set(task, hints.reduce((s, re) => s + (re.test(input) ? 1 : 0), 0));
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[1] > 0 ? ranked[0][0] : "general";
}

function routeFor(task: TaskType, tier: RouteTier): string {
  if (task === "coding" || task === "debugging") return tier === "fast" ? "auto/coding:fast" : tier === "cheap" ? "auto/coding:cheap" : "auto/coding:pro";
  if (task === "reasoning" || task === "analysis" || task === "trading") return tier === "cheap" ? "auto/reasoning:cheap" : "auto/reasoning:pro";
  if (task === "vision") return tier === "free" ? "auto/vision:free" : "auto/vision:pro";
  if (task === "docs") return tier === "cheap" ? "auto/chat:cheap" : "auto/chat:reliable";
  if (task === "chat") return tier === "fast" ? "auto/chat:fast" : "auto/chat:reliable";
  return tier === "cheap" ? "auto/cheap" : tier === "fast" ? "auto/fast" : "auto";
}

function getMetric(provider: string, model: string): ProviderMetric {
  const key = `${provider || "unknown"}/${model || "unknown"}`;
  let m = metrics.get(key);
  if (!m) { m = { provider: provider || "unknown", model: model || "unknown", requests: 0, successes: 0, failures: 0, totalLatencyMs: 0, lastSuccessAt: 0, lastFailureAt: 0, consecutiveFailures: 0, state: "CLOSED", openedAt: 0, estimatedSpendUsd: 0 }; metrics.set(key, m); }
  if (m.state === "OPEN" && now() - m.openedAt >= CB_COOLDOWN_MS) m.state = "HALF_OPEN";
  return m;
}
function recordFailure(m: ProviderMetric) { m.failures++; m.consecutiveFailures++; m.lastFailureAt = now(); if (m.consecutiveFailures >= CB_FAILURE_THRESHOLD) { m.state = "OPEN"; m.openedAt = now(); } }
function recordSuccess(m: ProviderMetric) { m.successes++; m.consecutiveFailures = 0; m.lastSuccessAt = now(); m.state = "CLOSED"; }

export function chooseRoute(prompt: string, options: RouterOptions = {}): RouterDecision {
  const task = classifyTask(prompt);
  const inputTokens = estimateTokens(prompt);
  const projectedCost = estimateCost(inputTokens);
  const requestedBudget = options.budgetUsd ?? DEFAULT_BUDGET_USD;
  const tier: RouteTier = options.tier || (requestedBudget < projectedCost * 2 ? "cheap" : "pro");
  const model = options.model || routeFor(task, tier);
  const latencyBudget = options.maxLatencyMs ?? MAX_LATENCY_MS;
  const scorePolicy = { taskFit: task === "general" ? 0.65 : 1, health: 1, quota: MAX_REQUESTS === 0 || totalRequests < MAX_REQUESTS ? 1 : 0, cost: tier === "cheap" ? 1 : 0.7, latency: tier === "fast" ? 1 : 0.75, stability: 1, budget: requestedBudget > 0 && totalSpendUsd < requestedBudget ? 1 : 0 };
  return { task, model, strategy: "irenx-policy-v2", budgetUsd: requestedBudget, estimatedCostUsd: projectedCost, circuit: "CLOSED", scorePolicy, reason: `task=${task}; tier=${tier}; projectedCost=$${projectedCost.toFixed(6)}; latencyBudget=${latencyBudget}ms; OmniRoute owns live provider scoring and fallback` };
}

function headerValue(headers: Headers, names: string[]) { for (const name of names) { const value = headers.get(name); if (value) return value; } return "unknown"; }
export function metricsSnapshot() { return [...metrics.values()].map(m => ({ ...m, successRate: m.requests ? m.successes / m.requests : 1, avgLatencyMs: m.requests ? Math.round(m.totalLatencyMs / m.requests) : null })); }
export function observabilitySnapshot() { return { generatedAt: new Date().toISOString(), providers: metricsSnapshot(), totals: { requests: totalRequests, tokens: totalTokens, estimatedSpendUsd: Number(totalSpendUsd.toFixed(6)) }, recent: routeEvents.slice(-100), config: { budgetUsd: DEFAULT_BUDGET_USD, maxRequests: MAX_REQUESTS, maxTokens: MAX_TOKENS, maxLatencyMs: MAX_LATENCY_MS, circuitFailureThreshold: CB_FAILURE_THRESHOLD, circuitCooldownMs: CB_COOLDOWN_MS, inputUsdPer1M: INPUT_USD_PER_1M, outputUsdPer1M: OUTPUT_USD_PER_1M } }; }

export async function chatThroughOmniRoute(prompt: string, options: RouterOptions = {}) {
  const baseUrl = (process.env.OMNIROUTE_BASE_URL || "http://127.0.0.1:20128").replace(/\/$/, "");
  const apiKey = process.env.OMNIROUTE_API_KEY || "";
  if (!apiKey) throw new Error("OMNIROUTE_API_KEY is not configured");
  const decision = chooseRoute(prompt, options);
  if (MAX_REQUESTS > 0 && totalRequests >= MAX_REQUESTS) throw new Error("IRENX quota guard: request limit reached");
  if (MAX_TOKENS > 0 && totalTokens + estimateTokens(prompt) > MAX_TOKENS) throw new Error("IRENX quota guard: token limit reached");
  if (decision.budgetUsd > 0 && totalSpendUsd + decision.estimatedCostUsd > decision.budgetUsd) throw new Error("IRENX budget guard: projected request exceeds remaining budget");

  totalRequests++;
  totalTokens += estimateTokens(prompt);
  const started = now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1/chat/completions`, { method: "POST", signal: controller.signal, headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify({ model: decision.model, messages: [{ role: "user", content: prompt }] }) });
  } catch (error) {
    routeEvents.push({ at: new Date().toISOString(), ok: false, error: error instanceof Error ? error.message : "network error", task: decision.task, route: decision.model });
    throw error;
  } finally { clearTimeout(timer); }

  const latencyMs = now() - started;
  const provider = headerValue(response.headers, ["x-omniroute-provider", "x-provider", "x-upstream-provider"]);
  const model = headerValue(response.headers, ["x-omniroute-model", "x-model", "x-upstream-model"]);
  const metric = getMetric(provider, model);
  metric.requests++; metric.totalLatencyMs += latencyMs;
  if (!response.ok) { recordFailure(metric); routeEvents.push({ at: new Date().toISOString(), ok: false, status: response.status, provider, model, latencyMs, task: decision.task, route: decision.model, circuit: metric.state }); throw new Error(`OmniRoute request failed (${response.status})`); }

  const payload = await response.json();
  recordSuccess(metric);
  const usage = payload?.usage || {};
  const inputTokens = Number(usage.prompt_tokens ?? usage.input_tokens ?? estimateTokens(prompt));
  const outputTokens = Number(usage.completion_tokens ?? usage.output_tokens ?? DEFAULT_OUTPUT_TOKENS);
  const usedTokens = Math.max(0, inputTokens) + Math.max(0, outputTokens);
  const estimatedCostUsd = Number(payload?.irenx?.estimatedCostUsd || estimateCost(inputTokens, outputTokens));
  totalTokens += Math.max(0, outputTokens);
  totalSpendUsd += estimatedCostUsd;
  metric.estimatedSpendUsd += estimatedCostUsd;
  routeEvents.push({ at: new Date().toISOString(), ok: true, provider, model, latencyMs, task: decision.task, route: decision.model, tokens: usedTokens, estimatedCostUsd });
  return { ...payload, irenx: { task: decision.task, selectedRoute: decision.model, provider, model, latencyMs, circuit: metric.state, budgetUsd: decision.budgetUsd, estimatedCostUsd, strategy: decision.strategy, scorePolicy: decision.scorePolicy } };
}

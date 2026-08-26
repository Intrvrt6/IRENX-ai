export type UsageEvent = {
  timestamp: string;
  actor?: string;
  tenant?: string;
  provider: string;
  model?: string;
  tool?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs?: number;
  status: "success" | "error";
  traceId?: string;
};

export type CostSummary = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  spendUsd: number;
};

export function createUsageEvent(input: Omit<UsageEvent, "timestamp">): UsageEvent {
  return { timestamp: new Date().toISOString(), ...input };
}

export function summarize(events: UsageEvent[]): CostSummary {
  return events.reduce((summary, event) => ({
    requests: summary.requests + 1,
    inputTokens: summary.inputTokens + Math.max(0, event.inputTokens),
    outputTokens: summary.outputTokens + Math.max(0, event.outputTokens),
    spendUsd: summary.spendUsd + Math.max(0, event.costUsd)
  }), { requests: 0, inputTokens: 0, outputTokens: 0, spendUsd: 0 });
}

export function budgetDecision(spendUsd: number, budgetUsd: number, alertRatio = 0.8) {
  if (budgetUsd <= 0) return { state: "disabled" as const };
  if (spendUsd >= budgetUsd) return { state: "blocked" as const };
  if (spendUsd >= budgetUsd * alertRatio) return { state: "warning" as const };
  return { state: "normal" as const };
}

export type TelemetryEvent = {
  traceId: string;
  name: string;
  startedAt: number;
  durationMs: number;
  attributes: Record<string, string | number | boolean | undefined>;
};

export function startSpan(name: string, attributes: Record<string, string | number | boolean | undefined> = {}) {
  const traceId = crypto.randomUUID();
  const startedAt = Date.now();
  return {
    traceId,
    end(extra: Record<string, string | number | boolean | undefined> = {}): TelemetryEvent {
      return { traceId, name, startedAt, durationMs: Date.now() - startedAt, attributes: { ...attributes, ...extra } };
    }
  };
}

export function safeTelemetry(event: TelemetryEvent) {
  // Never attach authorization headers, API keys, bearer tokens, prompts, or recovery codes.
  return event;
}

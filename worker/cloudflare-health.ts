export type CloudflareHealth = {
  ok: boolean;
  indicator: "none" | "minor" | "major" | "critical" | "unknown";
  description: string;
  execution: "NORMAL" | "CAUTION" | "NO_TRADE";
  api: "ONLINE" | "OFFLINE";
  checkedAt: string;
  unresolvedIncidents: number;
  activeMaintenances: number;
  upcomingMaintenances: number;
  degradedComponents: number;
  source: string;
  maintenanceSource: string;
  reason?: string;
};

const STATUS_URL = "https://www.cloudflarestatus.com/api/v2/summary.json";
const MAINTENANCE_URL = "https://www.cloudflarestatus.com/api/v2/scheduled-maintenances/upcoming.json";
const CACHE_MS = 30_000;
const REQUEST_TIMEOUT_MS = 10_000;
let cached: { value: CloudflareHealth; expiresAt: number } | null = null;

function mapIndicator(value: unknown): CloudflareHealth["indicator"] {
  if (value === "none" || value === "minor" || value === "major" || value === "critical") return value;
  return "unknown";
}

function classify(indicator: CloudflareHealth["indicator"], activeMaintenances: number): CloudflareHealth["execution"] {
  if (indicator === "major" || indicator === "critical" || indicator === "unknown") return "NO_TRADE";
  if (indicator === "minor" || activeMaintenances > 0) return "CAUTION";
  return "NORMAL";
}

async function fetchJson(url: string, controller: AbortController) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "IRENX-Cloudflare-Health/1.2"
    },
    signal: controller.signal
  });
  if (!response.ok) throw new Error(`Cloudflare status HTTP ${response.status} for ${url}`);
  return response.json() as Promise<any>;
}

export async function getCloudflareHealth(force = false): Promise<CloudflareHealth> {
  const now = Date.now();
  if (!force && cached && cached.expiresAt > now) return cached.value;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const [statusResult, maintenanceResult] = await Promise.allSettled([
      fetchJson(STATUS_URL, controller),
      fetchJson(MAINTENANCE_URL, controller)
    ]);

    if (statusResult.status === "rejected") throw statusResult.reason;

    const payload = statusResult.value;
    const maintenancePayload = maintenanceResult.status === "fulfilled" ? maintenanceResult.value : null;
    const indicator = mapIndicator(payload?.status?.indicator);
    const components = Array.isArray(payload?.components) ? payload.components : [];
    const incidents = Array.isArray(payload?.incidents) ? payload.incidents : [];
    const maintenances = Array.isArray(payload?.scheduled_maintenances) ? payload.scheduled_maintenances : [];
    const upcoming = Array.isArray(maintenancePayload?.scheduled_maintenances)
      ? maintenancePayload.scheduled_maintenances
      : [];
    const degradedComponents = components.filter(
      (component: any) => component?.status && component.status !== "operational"
    ).length;

    const value: CloudflareHealth = {
      ok: indicator === "none" || indicator === "minor",
      indicator,
      description: String(payload?.status?.description || "Unknown"),
      execution: classify(indicator, maintenances.length),
      api: "ONLINE",
      checkedAt: new Date().toISOString(),
      unresolvedIncidents: incidents.length,
      activeMaintenances: maintenances.length,
      upcomingMaintenances: upcoming.length,
      degradedComponents,
      source: STATUS_URL,
      maintenanceSource: MAINTENANCE_URL,
      ...(maintenanceResult.status === "rejected"
        ? { reason: `Scheduled maintenance feed unavailable: ${maintenanceResult.reason instanceof Error ? maintenanceResult.reason.message : "request failed"}` }
        : {})
    };

    cached = { value, expiresAt: now + CACHE_MS };
    return value;
  } catch (error) {
    const value: CloudflareHealth = {
      ok: false,
      indicator: "unknown",
      description: "Cloudflare status unavailable",
      execution: "NO_TRADE",
      api: "OFFLINE",
      checkedAt: new Date().toISOString(),
      unresolvedIncidents: 0,
      activeMaintenances: 0,
      upcomingMaintenances: 0,
      degradedComponents: 0,
      source: STATUS_URL,
      maintenanceSource: MAINTENANCE_URL,
      reason: error instanceof Error ? error.message : "Cloudflare status check failed"
    };
    cached = { value, expiresAt: now + 10_000 };
    return value;
  } finally {
    clearTimeout(timer);
  }
}

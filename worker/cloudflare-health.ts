export type CloudflareHealth = {
  ok: boolean;
  indicator: "none" | "minor" | "major" | "critical" | "unknown";
  description: string;
  execution: "NORMAL" | "CAUTION" | "NO_TRADE";
  api: "ONLINE" | "OFFLINE";
  checkedAt: string;
  unresolvedIncidents: number;
  activeMaintenances: number;
  degradedComponents: number;
  source: string;
  reason?: string;
};

const STATUS_URL = "https://www.cloudflarestatus.com/api/v2/summary.json";
const CACHE_MS = 30_000;
let cached: { value: CloudflareHealth; expiresAt: number } | null = null;

function mapIndicator(value: unknown): CloudflareHealth["indicator"] {
  if (value === "none" || value === "minor" || value === "major" || value === "critical") return value;
  return "unknown";
}

function classify(indicator: CloudflareHealth["indicator"]): CloudflareHealth["execution"] {
  if (indicator === "major" || indicator === "critical" || indicator === "unknown") return "NO_TRADE";
  if (indicator === "minor") return "CAUTION";
  return "NORMAL";
}

export async function getCloudflareHealth(force = false): Promise<CloudflareHealth> {
  const now = Date.now();
  if (!force && cached && cached.expiresAt > now) return cached.value;

  try {
    const response = await fetch(STATUS_URL, {
      headers: { accept: "application/json", "user-agent": "IRENX-Cloudflare-Health/1.0" },
      cf: { cacheTtl: 30, cacheEverything: true }
    } as RequestInit);

    if (!response.ok) throw new Error(`Cloudflare status HTTP ${response.status}`);
    const payload: any = await response.json();
    const indicator = mapIndicator(payload?.status?.indicator);
    const components = Array.isArray(payload?.components) ? payload.components : [];
    const incidents = Array.isArray(payload?.incidents) ? payload.incidents : [];
    const maintenances = Array.isArray(payload?.scheduled_maintenances) ? payload.scheduled_maintenances : [];
    const degradedComponents = components.filter((component: any) => component?.status && component.status !== "operational").length;

    const value: CloudflareHealth = {
      ok: indicator === "none" || indicator === "minor",
      indicator,
      description: String(payload?.status?.description || "Unknown"),
      execution: classify(indicator),
      api: "ONLINE",
      checkedAt: new Date().toISOString(),
      unresolvedIncidents: incidents.length,
      activeMaintenances: maintenances.length,
      degradedComponents,
      source: STATUS_URL
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
      degradedComponents: 0,
      source: STATUS_URL,
      reason: error instanceof Error ? error.message : "Cloudflare status check failed"
    };
    cached = { value, expiresAt: now + 10_000 };
    return value;
  }
}

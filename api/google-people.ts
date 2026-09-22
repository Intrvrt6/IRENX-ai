const PEOPLE_BASE_URL = "https://people.googleapis.com/v1";
const ACCESS_TOKEN = process.env.GOOGLE_PEOPLE_ACCESS_TOKEN || "";
const TIMEOUT_MS = Number(process.env.GOOGLE_PEOPLE_TIMEOUT_MS || 15000);

export const GOOGLE_PEOPLE_SCOPES = {
  readonly: "https://www.googleapis.com/auth/contacts.readonly",
  readWrite: "https://www.googleapis.com/auth/contacts",
} as const;

function configured() {
  return Boolean(ACCESS_TOKEN);
}

async function peopleRequest(path: string, params: Record<string, string> = {}) {
  if (!ACCESS_TOKEN) throw new Error("GOOGLE_PEOPLE_ACCESS_TOKEN is not configured");
  const url = new URL(`${PEOPLE_BASE_URL}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", Authorization: `Bearer ${ACCESS_TOKEN}`, "User-Agent": "IRENX-Google-People/1.0" },
      signal: controller.signal,
    });
    const text = await response.text();
    let payload: unknown;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
    if (!response.ok) {
      const detail = typeof payload === "object" && payload !== null ? JSON.stringify(payload) : String(payload);
      throw new Error(`Google People API HTTP ${response.status}: ${detail.slice(0, 1000)}`);
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

export function googlePeopleConfigured() {
  return configured();
}

export async function googlePeopleHealth() {
  if (!configured()) return { configured: false, ok: false, reason: "GOOGLE_PEOPLE_ACCESS_TOKEN is not configured" };
  try {
    const person = await peopleRequest("people/me", { personFields: "names,emailAddresses" });
    return { configured: true, ok: true, person };
  } catch (error) {
    return { configured: true, ok: false, error: error instanceof Error ? error.message : "Google People API health check failed" };
  }
}

export function googlePeopleMe(personFields = "names,emailAddresses,phoneNumbers,organizations,photos") {
  return peopleRequest("people/me", { personFields });
}

export function googlePeopleConnections(options: {
  personFields?: string;
  pageToken?: string;
  pageSize?: number;
  requestSyncToken?: boolean;
  syncToken?: string;
  sortOrder?: string;
} = {}) {
  const params: Record<string, string> = {
    personFields: options.personFields || "names,emailAddresses,phoneNumbers,organizations,photos,metadata",
    pageSize: String(Math.min(Math.max(options.pageSize || 100, 1), 1000)),
  };
  if (options.pageToken) params.pageToken = options.pageToken;
  if (options.requestSyncToken) params.requestSyncToken = "true";
  if (options.syncToken) params.syncToken = options.syncToken;
  if (options.sortOrder) params.sortOrder = options.sortOrder;
  return peopleRequest("people/me/connections", params);
}

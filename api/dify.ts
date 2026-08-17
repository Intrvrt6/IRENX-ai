const DIFY_BASE_URL = (process.env.DIFY_BASE_URL || "http://127.0.0.1:5001").replace(/\/$/, "");
const DIFY_API_KEY = process.env.DIFY_API_KEY || "";
const DIFY_TIMEOUT_MS = Number(process.env.DIFY_TIMEOUT_MS || 120000);

export function difyConfigured() {
  return Boolean(DIFY_API_KEY);
}

async function difyFetch(path: string, init: RequestInit = {}) {
  if (!DIFY_API_KEY) throw new Error("DIFY_API_KEY is not configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIFY_TIMEOUT_MS);
  try {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${DIFY_API_KEY}`);
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");
    return await fetch(`${DIFY_BASE_URL}${path}`, { ...init, headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function runDifyWorkflow(input: {
  inputs?: Record<string, unknown>;
  user?: string;
  responseMode?: "blocking" | "streaming";
}) {
  const response = await difyFetch("/v1/workflows/run", {
    method: "POST",
    body: JSON.stringify({
      inputs: input.inputs || {},
      user: input.user || "irenx",
      response_mode: input.responseMode || "blocking"
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Dify workflow HTTP ${response.status}: ${text.slice(0, 500)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export async function runDifyChat(input: {
  query: string;
  user?: string;
  conversationId?: string;
  inputs?: Record<string, unknown>;
  responseMode?: "blocking" | "streaming";
}) {
  const response = await difyFetch("/v1/chat-messages", {
    method: "POST",
    body: JSON.stringify({
      inputs: input.inputs || {},
      query: input.query,
      response_mode: input.responseMode || "blocking",
      conversation_id: input.conversationId || "",
      user: input.user || "irenx"
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Dify chat HTTP ${response.status}: ${text.slice(0, 500)}`);
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

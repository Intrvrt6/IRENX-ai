type WhatsAppEnv = {
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_APP_SECRET?: string;
  WHATSAPP_ALLOWED_NUMBERS?: string;
};

const GRAPH_VERSION = "v23.0";
const seenMessages = new Map<string, number>();
const MESSAGE_DEDUPE_MS = 10 * 60 * 1000;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function textFromBody(body: any): { id: string; from: string; text: string } | null {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message || message.type !== "text" || typeof message.from !== "string" || typeof message.id !== "string") return null;
  const text = typeof message.text?.body === "string" ? message.text.body.trim() : "";
  return text ? { id: message.id, from: message.from, text } : null;
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(rawBody: string, signature: string, secret?: string) {
  if (!secret) return false;
  if (!signature.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = "sha256=" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(expected, signature);
}

function isAllowedNumber(from: string, env: WhatsAppEnv) {
  const configured = (env.WHATSAPP_ALLOWED_NUMBERS || "").split(",").map((v) => v.trim()).filter(Boolean);
  return configured.length === 0 || configured.includes(from);
}

function pruneSeenMessages() {
  const now = Date.now();
  for (const [id, expiresAt] of seenMessages) if (expiresAt <= now) seenMessages.delete(id);
}

function markMessageIfNew(id: string) {
  pruneSeenMessages();
  if (seenMessages.has(id)) return false;
  seenMessages.set(id, Date.now() + MESSAGE_DEDUPE_MS);
  return true;
}

async function sendWhatsAppText(to: string, text: string, env: WhatsAppEnv) {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) throw new Error("WhatsApp credentials are not configured");
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body: text.slice(0, 4096) },
    }),
  });
  if (!response.ok) throw new Error(`WhatsApp Graph API HTTP ${response.status}`);
}

function help() {
  return [
    "🔥 IRENX WhatsApp",
    "",
    "Commands:",
    "• IRENX SIGNAL XAUUSD",
    "• IRENX SCALPING XAUUSD",
    "• IRENX PRIME XAUUSD",
    "• IRENX HELP",
    "",
    "Status: READY",
  ].join("\\n");
}

function buildPrompt(message: string) {
  const command = message.trim();
  const system = [
    "You are IRENX, the user's trading analysis interface.",
    "For IRENX SIGNAL or IRENX SCALPING, be concise and output Bias, Entry/Zone, SL, TP1, TP2, TP3, Trigger/Confirmation, and Status.",
    "Use the IRENX PRIME sequence: REGIME -> LIQUIDITY -> REFLEXIVITY -> OROCHI -> VMAP -> EXECUTION -> RISK MANAGEMENT.",
    "No indicator is allowed to create a trade by itself. Prefer WAIT or NO TRADE when evidence is insufficient.",
    "Never invent a current market price, entry, SL, or TP. If reliable live market data is unavailable, explicitly say LIVE MARKET DATA UNAVAILABLE and do not fabricate numeric levels.",
    "Signals are analysis, not a guarantee of profit.",
  ].join(" ");
  return `${system}\\n\\nUser command: ${command}`;
}

async function processMessage(incoming: { id: string; from: string; text: string }, env: WhatsAppEnv, ctx: ExecutionContext, irenxFetch: (request: Request, env: any, ctx: ExecutionContext) => Promise<Response>) {
  const normalized = incoming.text.trim();

  if (/^irenx\\s+help$/i.test(normalized) || /^help$/i.test(normalized)) {
    await sendWhatsAppText(incoming.from, help(), env);
    return;
  }

  if (!/^irenx(?:\\s+(?:signal|scalping|prime)(?:\\s+.+)?)?$/i.test(normalized)) return;

  try {
    const aiRequest = new Request(new URL("/api/ai", "https://internal.irenx"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: buildPrompt(normalized) }),
    });
    const aiResponse = await irenxFetch(aiRequest, env, ctx);
    const payload: any = await aiResponse.json();
    if (!aiResponse.ok) throw new Error(payload?.error || "IRENX AI failure");
    const output = payload?.output_text || payload?.choices?.[0]?.message?.content || payload?.response;
    if (!output) throw new Error("IRENX returned an empty response");
    await sendWhatsAppText(incoming.from, `🔥 IRENX\\n\\n${String(output).slice(0, 4000)}`, env);
  } catch (error) {
    console.error("IRENX WhatsApp processing error", error);
    await sendWhatsAppText(incoming.from, "⚠️ IRENX sedang mengalami gangguan sementara. Silakan coba lagi beberapa saat lagi.", env).catch((sendError) => console.error("IRENX WhatsApp error reply failed", sendError));
  }
}

export async function handleWhatsApp(
  request: Request,
  env: WhatsAppEnv,
  ctx: ExecutionContext,
  irenxFetch: (request: Request, env: any, ctx: ExecutionContext) => Promise<Response>,
) {
  const url = new URL(request.url);

  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && token === env.WHATSAPP_VERIFY_TOKEN && challenge) return new Response(challenge, { status: 200 });
    return json({ ok: false, error: "Webhook verification failed" }, 403);
  }

  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!env.WHATSAPP_APP_SECRET) return json({ error: "WhatsApp webhook is not configured" }, 503);

  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") || "";
  if (!(await verifySignature(rawBody, signature, env.WHATSAPP_APP_SECRET))) return json({ error: "Invalid webhook signature" }, 401);

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const incoming = textFromBody(body);
  if (!incoming) return json({ ok: true, ignored: true });
  if (!isAllowedNumber(incoming.from, env)) return json({ ok: true, ignored: true });
  if (!markMessageIfNew(incoming.id)) return json({ ok: true, duplicate: true });

  ctx.waitUntil(processMessage(incoming, env, ctx, irenxFetch));
  return json({ ok: true, accepted: true });
}

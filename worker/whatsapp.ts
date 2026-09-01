type WhatsAppEnv = {
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_APP_SECRET?: string;
};

const GRAPH_VERSION = "v23.0";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function textFromBody(body: any): { from: string; text: string } | null {
  const value = body?.entry?.[0]?.changes?.[0]?.value;
  const message = value?.messages?.[0];
  if (!message || message.type !== "text" || typeof message.from !== "string") return null;
  const text = typeof message.text?.body === "string" ? message.text.body.trim() : "";
  return text ? { from: message.from, text } : null;
}

async function verifySignature(request: Request, rawBody: string, secret?: string) {
  if (!secret) return true;
  const signature = request.headers.get("x-hub-signature-256") || "";
  if (!signature.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = "sha256=" + Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(new TextEncoder().encode(expected), new TextEncoder().encode(signature));
}

async function sendWhatsAppText(to: string, text: string, env: WhatsAppEnv) {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) throw new Error("WhatsApp credentials are not configured");
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: text.slice(0, 4096) } }),
  });
  if (!response.ok) throw new Error(`WhatsApp Graph API HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
}

function help() {
  return [
    "🔥 IRENX WhatsApp",
    "",
    "Commands:",
    "• IRENX SIGNAL — signal market",
    "• IRENX SCALPING — scalping analysis",
    "• IRENX PRIME — full IRENX analysis",
    "• IRENX HELP — command list",
    "",
    "Contoh: IRENX SIGNAL XAUUSD",
  ].join("\\n");
}

function buildPrompt(message: string) {
  const command = message.toUpperCase();
  const system = [
    "You are IRENX, the user's trading analysis interface.",
    "For IRENX SIGNAL or IRENX SCALPING, be concise and output Bias, Entry/Zone, SL, TP1, TP2, TP3, Trigger/Confirmation, and Status.",
    "Use the IRENX PRIME sequence: REGIME -> LIQUIDITY -> REFLEXIVITY -> OROCHI -> VMAP -> EXECUTION -> RISK MANAGEMENT.",
    "No indicator is allowed to create a trade by itself. Prefer WAIT or NO TRADE when evidence is insufficient.",
    "Do not claim live price data unless the configured upstream actually provides it. If live market data is unavailable, explicitly say so instead of inventing prices.",
    "Risk warning: signals are analysis, not a guarantee of profit.",
  ].join(" ");
  return `${system}\n\nUser command: ${command}`;
}

export async function handleWhatsApp(request: Request, env: WhatsAppEnv, ctx: ExecutionContext, irenxFetch: (request: Request, env: any, ctx: ExecutionContext) => Promise<Response>) {
  const url = new URL(request.url);

  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && token === env.WHATSAPP_VERIFY_TOKEN && challenge) return new Response(challenge, { status: 200 });
    return json({ ok: false, error: "Webhook verification failed" }, 403);
  }

  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const rawBody = await request.text();
  if (!(await verifySignature(request, rawBody, env.WHATSAPP_APP_SECRET))) return json({ error: "Invalid webhook signature" }, 401);

  let body: any;
  try { body = JSON.parse(rawBody); } catch { return json({ error: "Invalid JSON" }, 400); }
  const incoming = textFromBody(body);
  if (!incoming) return json({ ok: true, ignored: true });

  const normalized = incoming.text.trim();
  if (/^irenx\\s+help$/i.test(normalized) || /^help$/i.test(normalized)) {
    await sendWhatsAppText(incoming.from, help(), env);
    return json({ ok: true });
  }
  if (!/^irenx(\\s+(signal|scalping|prime))?/i.test(normalized)) return json({ ok: true, ignored: true });

  const prompt = buildPrompt(normalized);
  try {
    const aiRequest = new Request(new URL("/api/ai", request.url), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) });
    const aiResponse = await irenxFetch(aiRequest, env, ctx);
    const payload: any = await aiResponse.json();
    if (!aiResponse.ok) throw new Error(payload?.error || "IRENX AI failure");
    const output = payload?.output_text || payload?.choices?.[0]?.message?.content || payload?.response || JSON.stringify(payload);
    await sendWhatsAppText(incoming.from, `🔥 IRENX\\n\\n${String(output).slice(0, 4000)}`, env);
    return json({ ok: true });
  } catch (error) {
    await sendWhatsAppText(incoming.from, `⚠️ IRENX sedang tidak dapat memproses request.\\n\\n${error instanceof Error ? error.message : "Temporary failure"}`.slice(0, 4000), env);
    return json({ ok: false }, 502);
  }
}

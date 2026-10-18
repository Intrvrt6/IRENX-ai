import { handleWhatsApp } from "./whatsapp";

type Env = {
  IRENX_CORE_URL: string;
  WHATSAPP_VERIFY_TOKEN?: string;
  WHATSAPP_ACCESS_TOKEN?: string;
  WHATSAPP_PHONE_NUMBER_ID?: string;
  WHATSAPP_APP_SECRET?: string;
  WHATSAPP_ALLOWED_NUMBERS?: string;
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (!env.IRENX_CORE_URL) {
      return new Response(JSON.stringify({ error: "IRENX_CORE_URL is not configured" }), { status: 503, headers: { "content-type": "application/json" } });
    }

    const coreUrl = new URL(env.IRENX_CORE_URL);
    const irenxFetch = async (aiRequest: Request) => {
      const body = await aiRequest.json().catch(() => ({}));
      return fetch(new URL("/api/ai", coreUrl), {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
      });
    };

    const url = new URL(request.url);
    if (url.pathname === "/api/webhooks/whatsapp") return handleWhatsApp(request, env, ctx, irenxFetch);
    return new Response(JSON.stringify({ service: "IRENX WhatsApp Bot", standalone: true, core: coreUrl.origin }), { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  },
};

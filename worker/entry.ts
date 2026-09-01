import irenx from "./index";
import { handleWhatsApp } from "./whatsapp";

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext) {
    const url = new URL(request.url);
    if (url.pathname === "/api/webhooks/whatsapp") {
      return handleWhatsApp(request, env, ctx, irenx.fetch.bind(irenx));
    }
    return irenx.fetch(request, env, ctx);
  },
};

import { createMcpHandler, McpServer } from "npm:@modelcontextprotocol/server@2.0.0";
import * as z from "npm:zod@4";
import { buildIrenxSignal, fetchTwelveDataCandles } from "../src/irenx/signal-engine";

const PUBLIC_ORIGIN = process.env.MCP_PUBLIC_ORIGIN || "https://ai.irenx.com";
const CDNJS_API_ORIGIN = "https://api.cdnjs.com";
const STATUSPAGE_API_ORIGIN = "https://api.statuspage.io";
const DOCS = [
  { id: "readme", title: "IRENX-ai README", path: "README.md" },
  { id: "dify-integration", title: "IRENX Dify Integration", path: "docs/DIFY_INTEGRATION.md" },
  { id: "cloudflare-deployment", title: "IRENX Cloudflare Deployment", path: "docs/CLOUDFLARE_DEPLOYMENT.md" },
  { id: "ci-verification", title: "IRENX CI Verification", path: "docs/CI-VERIFICATION.md" },
  { id: "automation", title: "IRENX Automation", path: "AUTOMATION.md" },
  { id: "cdnjs-api", title: "IRENX cdnjs API Integration", path: "docs/CDNJS_API_INTEGRATION.md" },
  { id: "statuspage-api", title: "IRENX Statuspage API Integration", path: "docs/STATUSPAGE_API_INTEGRATION.md" },
];

type SearchResult = { id: string; title: string; url: string };
type SearchOutput = { results: SearchResult[] };
type FetchOutput = { id: string; title: string; text: string; url: string; metadata?: Record<string, unknown> };

function resultUrl(id: string) { return `${PUBLIC_ORIGIN}/mcp/docs/${encodeURIComponent(id)}`; }
function normalize(text: string) { return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function score(query: string, title: string, text: string) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return 0;
  const haystack = normalize(`${title} ${text}`);
  return terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
}
async function readDoc(path: string) { const file = Bun.file(path); if (!(await file.exists())) return ""; return await file.text(); }
function cdnjsUrl(path: string, query?: Record<string, string>) {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.includes("..")) throw new Error("Invalid cdnjs API path");
  const url = new URL(path, CDNJS_API_ORIGIN);
  if (query) for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url;
}
function statuspageUrl(path: string, query?: Record<string, string>) {
  if (!path.startsWith("/v1/") || path.startsWith("//") || path.includes("\\") || path.includes("..")) throw new Error("Invalid Statuspage API path");
  const url = new URL(path, STATUSPAGE_API_ORIGIN);
  if (query) for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url;
}

export function createIrenxMcpHandler() {
  return createMcpHandler(() => {
    const server = new McpServer({ name: "IRENX AI MCP", version: "1.3.0" });

    server.registerTool(
      "irenx_signal",
      {
        description: "Generate a read-only IRENX market signal from live Twelve Data OHLC candles. Uses multi-timeframe trend, structure, liquidity sweep, volatility risk and a VMAP confirmation placeholder; never executes trades.",
        inputSchema: z.object({
          symbol: z.enum(["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "NAS100"]).default("XAUUSD"),
          timeframes: z.array(z.enum(["1min", "5min", "15min", "30min", "1h", "4h"])).min(1).max(4).default(["5min", "15min", "1h"]),
        }),
      },
      async ({ symbol, timeframes }) => {
        const datasets: Record<string, Awaited<ReturnType<typeof fetchTwelveDataCandles>>> = {};
        for (const timeframe of timeframes) datasets[timeframe] = await fetchTwelveDataCandles(symbol, timeframe, 120);
        const latest = datasets[timeframes[0]].at(-1)?.close;
        if (!latest) throw new Error("No live market candle available");
        const signal = buildIrenxSignal(symbol, latest, datasets);
        return { content: [{ type: "text", text: JSON.stringify(signal) }] };
      },
    );

    server.registerTool(
      "search",
      {
        description: "Search IRENX project documentation and return URL-backed results suitable for citations.",
        inputSchema: z.object({ query: z.string().min(1).max(500) }),
        outputSchema: z.object({ results: z.array(z.object({ id: z.string(), title: z.string(), url: z.string().url() })) }),
      },
      async ({ query }): Promise<{ structuredContent: SearchOutput; content: Array<{ type: "text"; text: string }> }> => {
        const scored: Array<SearchResult & { score: number }> = [];
        for (const doc of DOCS) { const text = await readDoc(doc.path); const points = score(query, doc.title, text); if (points > 0) scored.push({ id: doc.id, title: doc.title, url: resultUrl(doc.id), score: points }); }
        scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
        const output: SearchOutput = { results: scored.slice(0, 8).map(({ id, title, url }) => ({ id, title, url })) };
        return { structuredContent: output, content: [{ type: "text", text: JSON.stringify(output) }] };
      },
    );

    server.registerTool(
      "fetch",
      {
        description: "Fetch the complete text of an IRENX documentation result by its search ID.",
        inputSchema: z.object({ id: z.string().min(1).max(100) }),
        outputSchema: z.object({ id: z.string(), title: z.string(), text: z.string(), url: z.string().url(), metadata: z.record(z.string(), z.unknown()).optional() }),
      },
      async ({ id }): Promise<{ structuredContent: FetchOutput; content: Array<{ type: "text"; text: string }> }> => {
        const doc = DOCS.find((item) => item.id === id); if (!doc) throw new Error(`Unknown document id: ${id}`);
        const text = await readDoc(doc.path); if (!text) throw new Error(`Document is unavailable: ${id}`);
        const output: FetchOutput = { id: doc.id, title: doc.title, text, url: resultUrl(doc.id), metadata: { source: "irenx-repository", path: doc.path } };
        return { structuredContent: output, content: [{ type: "text", text: JSON.stringify(output) }] };
      },
    );

    server.registerTool("cdnjs_api", { description: "Read public cdnjs API data through the official api.cdnjs.com service. Read-only and restricted to the cdnjs API origin.", inputSchema: z.object({ path: z.string().min(1).max(500).default("/libraries"), query: z.record(z.string(), z.string()).optional() }) }, async ({ path, query }) => {
      const url = cdnjsUrl(path, query); const response = await fetch(url, { headers: { Accept: "application/json" } }); const text = await response.text();
      if (!response.ok) throw new Error(`cdnjs API request failed with HTTP ${response.status}`); let data: unknown; try { data = JSON.parse(text); } catch { data = text; }
      return { content: [{ type: "text", text: JSON.stringify({ source: "cdnjs", url: url.toString(), data }) }] };
    });

    server.registerTool("statuspage_get_page", { description: "Read a Statuspage page using the official Statuspage API. Read-only; the API key remains server-side and is never returned.", inputSchema: z.object({ page_id: z.string().min(1).max(200).optional(), path: z.string().min(1).max(500).default("/v1/pages") }) }, async ({ page_id, path }) => {
      const configuredPageId = process.env.STATUSPAGE_PAGE_ID || ""; const id = page_id || configuredPageId;
      if (!id && path === "/v1/pages") throw new Error("STATUSPAGE_PAGE_ID is required for a page lookup");
      const resolvedPath = path === "/v1/pages" ? `/v1/pages/${encodeURIComponent(id)}` : path; const apiKey = process.env.STATUSPAGE_API_KEY || "";
      if (!apiKey) throw new Error("STATUSPAGE_API_KEY is not configured"); const url = statuspageUrl(resolvedPath);
      const response = await fetch(url, { method: "GET", headers: { Accept: "application/json", Authorization: `OAuth ${apiKey}` } }); const text = await response.text();
      if (!response.ok) throw new Error(`Statuspage API request failed with HTTP ${response.status}`); let data: unknown; try { data = JSON.parse(text); } catch { data = text; }
      return { content: [{ type: "text", text: JSON.stringify({ source: "statuspage", pageId: id || null, data }) }] };
    });

    server.registerTool("health", { description: "Return IRENX MCP and runtime health information.", inputSchema: z.object({}) }, async () => ({ content: [{ type: "text", text: JSON.stringify({ ok: true, service: "irenx-mcp", version: "1.3.0", cdnjsApi: CDNJS_API_ORIGIN, statuspageApi: STATUSPAGE_API_ORIGIN, statuspageConfigured: Boolean(process.env.STATUSPAGE_API_KEY), marketConfigured: Boolean(process.env.TWELVEDATA_API_KEY), timestamp: new Date().toISOString() }) }] }));
    return server;
  });
}

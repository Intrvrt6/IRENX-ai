import { createMcpHandler, McpServer } from "npm:@modelcontextprotocol/server@2.0.0";
import * as z from "npm:zod@4";

const PUBLIC_ORIGIN = process.env.MCP_PUBLIC_ORIGIN || "https://ai.irenx.com";
const TWELVEDATA_API_KEY = process.env.TWELVEDATA_API_KEY || "";
const DOCS = [
  { id: "readme", title: "IRENX-ai README", path: "README.md" },
  { id: "dify-integration", title: "IRENX Dify Integration", path: "docs/DIFY_INTEGRATION.md" },
  { id: "cloudflare-deployment", title: "IRENX Cloudflare Deployment", path: "docs/CLOUDFLARE_DEPLOYMENT.md" },
  { id: "ci-verification", title: "IRENX CI Verification", path: "docs/CI-VERIFICATION.md" },
  { id: "automation", title: "IRENX Automation", path: "AUTOMATION.md" },
  { id: "twelvedata-ad", title: "IRENX Twelve Data AD Indicator", path: "docs/TWELVEDATA_AD.md" },
];

type SearchResult = { id: string; title: string; url: string };
type SearchOutput = { results: SearchResult[] };
type FetchOutput = { id: string; title: string; text: string; url: string; metadata?: Record<string, unknown> };

function resultUrl(id: string) {
  return `${PUBLIC_ORIGIN}/mcp/docs/${encodeURIComponent(id)}`;
}

function normalize(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function score(query: string, title: string, text: string) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return 0;
  const haystack = normalize(`${title} ${text}`);
  return terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
}

async function readDoc(path: string) {
  const file = Bun.file(path);
  if (!(await file.exists())) return "";
  return await file.text();
}

export function createIrenxMcpHandler() {
  return createMcpHandler(() => {
    const server = new McpServer({ name: "IRENX AI MCP", version: "1.1.0" });

    server.registerTool(
      "search",
      {
        description: "Search IRENX project documentation and return URL-backed results suitable for citations.",
        inputSchema: z.object({ query: z.string().min(1).max(500) }),
        outputSchema: z.object({ results: z.array(z.object({ id: z.string(), title: z.string(), url: z.string().url() })) }),
      },
      async ({ query }): Promise<{ structuredContent: SearchOutput; content: Array<{ type: "text"; text: string }> }> => {
        const scored: Array<SearchResult & { score: number }> = [];
        for (const doc of DOCS) {
          const text = await readDoc(doc.path);
          const points = score(query, doc.title, text);
          if (points > 0) scored.push({ id: doc.id, title: doc.title, url: resultUrl(doc.id), score: points });
        }
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
        const doc = DOCS.find((item) => item.id === id);
        if (!doc) throw new Error(`Unknown document id: ${id}`);
        const text = await readDoc(doc.path);
        if (!text) throw new Error(`Document is unavailable: ${id}`);
        const output: FetchOutput = { id: doc.id, title: doc.title, text, url: resultUrl(doc.id), metadata: { source: "irenx-repository", path: doc.path } };
        return { structuredContent: output, content: [{ type: "text", text: JSON.stringify(output) }] };
      },
    );

    server.registerTool(
      "twelvedata_ad",
      {
        description: "Fetch Twelve Data Accumulation/Distribution (AD) indicator data for a symbol and interval. API credentials stay server-side.",
        inputSchema: z.object({
          symbol: z.string().min(1).max(40).default("AAPL"),
          interval: z.string().min(2).max(10).default("1min"),
          time_period: z.number().int().min(1).max(800).optional(),
          outputsize: z.number().int().min(1).max(5000).optional(),
        }),
      },
      async ({ symbol, interval, time_period, outputsize }) => {
        if (!TWELVEDATA_API_KEY) throw new Error("TWELVEDATA_API_KEY is not configured");
        const url = new URL("https://api.twelvedata.com/ad");
        url.searchParams.set("symbol", symbol.toUpperCase());
        url.searchParams.set("interval", interval);
        if (time_period !== undefined) url.searchParams.set("time_period", String(time_period));
        if (outputsize !== undefined) url.searchParams.set("outputsize", String(outputsize));

        const response = await fetch(url, {
          headers: { Accept: "application/json", Authorization: `apikey ${TWELVEDATA_API_KEY}` },
        });
        const data = await response.json();
        if (!response.ok || data?.status === "error" || data?.code) {
          throw new Error(data?.message || `Twelve Data AD request failed with HTTP ${response.status}`);
        }
        return {
          content: [{ type: "text", text: JSON.stringify({ source: "twelvedata", indicator: "AD", symbol: symbol.toUpperCase(), interval, data }) }],
        };
      },
    );

    server.registerTool(
      "health",
      { description: "Return IRENX MCP and runtime health information.", inputSchema: z.object({}) },
      async () => ({ content: [{ type: "text", text: JSON.stringify({ ok: true, service: "irenx-mcp", twelveDataConfigured: Boolean(TWELVEDATA_API_KEY), timestamp: new Date().toISOString() }) }] }),
    );

    return server;
  });
}

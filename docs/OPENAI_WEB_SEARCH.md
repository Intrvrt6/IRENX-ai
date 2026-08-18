# IRENX OpenAI Web Search

IRENX Cloudflare Worker uses the OpenAI Responses API for web-enabled AI when `OPENAI_API_KEY` is configured.

## Configuration

Store `OPENAI_API_KEY` as a Cloudflare Worker secret. Never commit the key to GitHub.

Optional variables:

- `IRENX_OPENAI_MODEL` — defaults to `gpt-5.6`
- `IRENX_OPENAI_SEARCH_CONTEXT` — `low`, `medium`, or `high`; defaults to `medium`

## Endpoint

`POST /api/ai`

```json
{"prompt":"Search the latest XAUUSD news and summarize the market impact."}
```

IRENX calls `POST https://api.openai.com/v1/responses` with the hosted `web_search` tool. The Responses payload is preserved so web-search citations/annotations remain available to clients.

## Routing

OpenAI is the primary provider when configured. If OpenAI is unavailable and OmniRoute is configured, IRENX falls back to OmniRoute.

Existing quota, timeout, circuit-breaker, and observability controls remain active.

## Security

Use Cloudflare secrets for `OPENAI_API_KEY`, `OMNIROUTE_API_KEY`, and `DIFY_API_KEY`. Do not put provider keys in tracked source files or GitHub workflow YAML.

# IRENX + Dify Integration

IRENX can use a self-hosted Dify instance as an application/workflow/agent layer without storing the Dify API key in the browser.

```text
IRENX / OmniCopilot
        |
        +--> OmniRoute Core Router --> LLM providers
        |
        +--> Dify Bridge --> Dify workflows / chat apps / agents
```

## Configuration

Set these server-side environment variables:

```text
DIFY_BASE_URL=http://127.0.0.1:5001
DIFY_API_KEY=app-xxxxxxxxxxxxxxxx
DIFY_TIMEOUT_MS=120000
```

Dify's API uses an application API key in the `Authorization: Bearer ...` header. Do not expose it to the client.

## Endpoints

- `GET /api/dify/health` — reports whether the bridge is configured.
- `POST /api/dify/workflows/run` — proxies Dify `POST /v1/workflows/run`.
- `POST /api/dify/chat-messages` — proxies Dify `POST /v1/chat-messages`.

Example workflow request:

```json
{
  "inputs": {"topic": "XAUUSD market review"},
  "user": "irenx",
  "response_mode": "blocking"
}
```

Example chat request:

```json
{
  "query": "Analyze this task",
  "user": "irenx",
  "response_mode": "blocking",
  "inputs": {}
}
```

## Self-hosting Dify

Use the official Dify Docker Compose deployment rather than copying Dify's entire source tree into IRENX. Dify documents Docker Compose as the easiest self-hosted installation path and requires Docker Compose v2.24.0 or newer. Dify also requires a generated `SECRET_KEY`. Keep Dify's database, Redis, and other middleware on the Dify deployment side.

When Dify is deployed on the same host/network, point `DIFY_BASE_URL` at the Dify API service. When it is remote, use its HTTPS URL.

## Security

- Never commit `DIFY_API_KEY`.
- Keep Dify API keys server-side.
- Put HTTPS/reverse-proxy authentication in front of public IRENX deployments.
- The bridge does not duplicate Dify's workflow engine; Dify remains the source of truth for workflow execution.

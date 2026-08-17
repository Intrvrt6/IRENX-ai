# IRENX + Cloudflare deployment

Production hostname: `ai.irenx.com`

## Architecture

```text
Internet
  -> Cloudflare DNS / Proxy / TLS / WAF
  -> ai.irenx.com
  -> VPS :80/:443
  -> Caddy
  -> IRENX Bun :3000
  -> OmniRoute / Dify / market-data providers
```

## Cloudflare DNS

Create an `A` record:

```text
Type: A
Name: ai
Content: <PUBLIC_IP_OF_IRENX_VPS>
Proxy: Proxied (orange cloud)
TTL: Auto
```

Do not use a placeholder IP. The value must be the public IP of the server running this repository.

## SSL/TLS

Use `Full (strict)` in Cloudflare. Caddy terminates HTTPS at the origin and automatically obtains/renews its certificate for `ai.irenx.com`.

If Cloudflare proxy is enabled, allow inbound TCP `80` and `443` from Cloudflare's published IP ranges at the VPS firewall. Do not expose port `3000` publicly; Docker publishes it only on `127.0.0.1`.

## Deploy

```bash
git clone https://github.com/Intrvrt6/IRENX-ai.git
cd IRENX-ai
cp .env.example .env
# edit .env; keep all credentials server-side
bash deploy.sh
```

The deployment script requires DNS to resolve before starting the public health check. It waits for the IRENX container healthcheck and then verifies `https://ai.irenx.com/api/health`.

## Verification

```bash
curl -fsS https://ai.irenx.com/api/health
curl -fsS https://ai.irenx.com/api/ai/health
curl -fsS https://ai.irenx.com/api/dify/health
```

OmniCopilot should use:

```text
https://ai.irenx.com/api/v1
```

## Cloudflare API/MCP safety

Never commit `CLOUDFLARE_API_TOKEN`, provider API keys, OmniRoute credentials, or Dify API keys. Use Cloudflare OAuth/MCP or narrowly scoped API tokens and keep secrets in the server environment.

## No Vercel dependency

This deployment does not use Vercel. `vercel.json` and Vercel runtime configuration are intentionally absent from the repository.

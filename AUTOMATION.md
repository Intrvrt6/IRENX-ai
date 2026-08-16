# IRENX Automation

## Pipeline

`push main -> self-hosted Linux runner -> validation -> Cloudflare Pages`

## Required GitHub Actions secrets

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## Runner labels

The workflows expect a self-hosted Linux runner with labels:

- `self-hosted`
- `linux`

## Security

Never commit SSH private keys, GitHub runner registration tokens, Cloudflare API tokens, or market-data API keys. Store deployment credentials in GitHub Actions Secrets.

## Cloudflare

The deployment workflow targets the Cloudflare Pages project `irenx-prime-ai`.

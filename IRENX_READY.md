# IRENX Ready Checklist

The repository contains the production web shell, live market gateway, offline PWA shell, deterministic offline brain, offline browser test, GitHub-hosted CI, self-hosted automation, and Cloudflare deployment workflow.

Before production use, configure the required provider secrets and bring the self-hosted runner online if the self-hosted workflows are required.

Live market data is unavailable without a configured provider. Offline mode does not invent live prices and returns NO TRADE when evidence is insufficient.

# IRENX Security Policy

## Reporting a vulnerability

Do not disclose suspected vulnerabilities, credentials, API keys, or exploit details in public issues or pull requests.

Use a private GitHub security advisory when available, or contact the repository owner through the private security channel configured for the project.

Include:
- affected component and version/commit
- impact and attack prerequisites
- reproduction steps or a minimal proof of concept
- suggested mitigation, if known

## Secret handling

Provider credentials must remain server-side and must be supplied through environment variables or platform secret stores. Never commit API keys, bearer tokens, private keys, `.env` files, or production credentials.

## Supported security boundary

IRENX is a self-hosted gateway. Integrations are treated as untrusted external boundaries. MCP tools should be least-privilege, read-only by default, and restricted to explicit upstream origins where possible.

## Security controls

The project uses CI governance, tracked-secret scanning, dependency automation, and security-oriented source audits. These controls reduce risk but do not guarantee that a deployment is secure; operators remain responsible for production secrets, network policy, identity, backups, and updates.

# IRENX Rust Edge v4.1

IRENX Rust Edge v4.1 hardens the existing Cloudflare Workers Rust/WASM canary without promoting it to production traffic.

## Changes

- Adds `/api/ready` and `/ready` canary readiness endpoints.
- Adds bounded `X-Request-Id` propagation and response correlation.
- Restricts the canary runtime to `GET` and `OPTIONS` until the gateway contract is implemented.
- Replaces wildcard CORS with `IRENX_PUBLIC_ORIGIN` and a safe `https://ai.irenx.com` fallback.
- Adds baseline browser/security headers including CSP, frame protection, `nosniff`, referrer policy, and permissions policy.
- Keeps production traffic on the existing IRENX TypeScript gateway.

## Promotion gates

Do not route `/v1/*` production traffic to Rust Edge until all of the following are verified:

1. Rust format check passes.
2. Clippy passes with `-D warnings`.
3. WASM release build passes.
4. Wrangler dry-run passes.
5. Deployed `/api/health` returns `ok: true` and `readiness: canary`.
6. Deployed `/api/ready` returns HTTP 200.
7. Authentication, gateway compatibility, rate limiting, provider routing, and smoke tests pass.
8. CORS origin is explicitly configured with `IRENX_PUBLIC_ORIGIN`.
9. No provider credential is present in source or workflow files.

## Operational rule

A healthy canary is not equivalent to production readiness. The Rust runtime remains a controlled edge component until the complete gateway contract is implemented and verified.

# IRENX Rust Edge v4

IRENX now has a Rust/Wasm edge-runtime foundation under `rust/` using Cloudflare's `workers-rs` SDK.

## Why this layer exists

- isolate security-sensitive edge logic from the existing TypeScript gateway
- provide a typed Rust/Wasm runtime for request validation and future provider routing
- keep the current production gateway unchanged until the Rust runtime passes CI and smoke tests
- enable a controlled cutover instead of a risky all-at-once rewrite

## Runtime

The Rust Worker uses `workers-rs` and targets `wasm32-unknown-unknown`.

## Promotion policy

The Rust runtime is initially a canary/build artifact. Production traffic remains on the existing IRENX Worker until:

1. formatting and Clippy pass
2. WASM release build passes
3. Wrangler dry-run passes
4. deployed Rust health endpoint passes
5. gateway integration and authentication tests pass

Only after those gates should `/v1/*` traffic be migrated behind the Rust layer.

## Security boundary

Provider credentials must remain Cloudflare secrets. They must never be committed to source or GitHub Actions YAML.

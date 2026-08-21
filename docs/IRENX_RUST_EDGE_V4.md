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

## Code Search & Security Audit

Use GitHub Code Search syntax to inspect the IRENX repository for security-sensitive surfaces. These queries are also useful when reviewing a PR branch locally or through GitHub's repository search tooling:

```text
repo:Intrvrt6/IRENX-ai (Authorization OR JWT OR Bearer OR authenticate)
repo:Intrvrt6/IRENX-ai language:rust (Authorization OR secret OR token OR credential)
repo:Intrvrt6/IRENX-ai (OMNIROUTE_API_KEY OR OMNIROUTE_BASE_URL)
repo:Intrvrt6/IRENX-ai (v1/chat/completions OR v1/models OR api/health)
repo:Intrvrt6/IRENX-ai path:.github/workflows
repo:Intrvrt6/IRENX-ai (TODO OR FIXME)
```

For credential hunting, prefer regex queries when appropriate:

```text
repo:Intrvrt6/IRENX-ai /sk-[A-Za-z0-9_-]{20,}/
```

GitHub Code Search indexes the default branch, so branch-specific validation for `upgrade/irenx-rust-edge-v4` is enforced in CI as `git grep` over the checked-out PR revision. The `IRENX Code Search Audit` workflow performs credential-pattern checks, Rust security-surface inspection, gateway routing-surface inspection, and documentation validation.

## Security boundary

Provider credentials must remain Cloudflare secrets. They must never be committed to source or GitHub Actions YAML.

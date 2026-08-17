# IRENX CI verification

The CI workflows use GitHub-hosted runners. Secret scanning intentionally permits the non-secret Claude Code OAuth compatibility placeholder `sk-dummy-key-to-bypass-oauth` while rejecting other credential-like values.

The IRENX AI router validation checks task classification, OmniRoute routing, circuit breaker settings, request timeout, request quota, and token quota guards.

# IRENX Cross-Platform Access

IRENX is delivered as a standards-based responsive web application and Progressive Web App (PWA). The same public origin can be opened on modern desktop and mobile operating systems without maintaining separate application logic.

## Supported device families

- Android phones/tablets — Chrome and other Chromium-based browsers; install from the browser's Add to Home Screen / Install App action when offered.
- iPhone/iPad — Safari; use Share → Add to Home Screen.
- Windows — Edge/Chrome; install IRENX as an app when the browser offers Install.
- macOS — Safari/Chrome/Edge; use Add to Dock/Install when offered.
- Linux — Chrome/Chromium/Firefox; use the browser directly. Chromium-based browsers can install the PWA when supported.

## Architecture

```text
Any OS / browser
       |
       v
https://ai.irenx.com
       |
       +--> Responsive IRENX UI
       +--> PWA manifest + install metadata
       +--> Public API / WebSocket
       |
       v
IRENX backend
       +--> AI Router
       +--> Odoo
       +--> Google People API
       +--> Google Cloud Logging
```

The browser is the portable client. Provider credentials, Odoo keys, Google OAuth tokens, and other secrets remain server-side.

## Important boundary

A browser/PWA is the primary cross-platform client. Native desktop/mobile packages are not required for normal access and should only be added later if native OS integrations are needed.

## Validation

Before calling a release production-ready, CI should verify the manifest, public health endpoint, and deployment smoke test. A missing backend dependency must result in `NO TRADE`/safe degradation rather than a fabricated signal.

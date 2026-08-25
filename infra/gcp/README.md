# IRENX Google Cloud

Target project: `irenx-506618`

This directory defines the production blueprint for running the IRENX backend on Google Cloud while keeping Odoo credentials outside the repository.

## Target architecture

`GitHub CI → Cloud Run → Secret Manager → Odoo JSON-2 → irnx.odoo.com / irnx.core`

App Hub can be used as the application inventory/management layer for the IRENX application. Google documents App Hub as the application management layer for discovering and operating supported Google Cloud resources. citehttps://docs.cloud.google.com/app-hub/docs

## Required secrets

Create these in Google Cloud Secret Manager:

- `irenx-odoo-api-key`
- `irenx-signal-ingest-key`

Do **not** commit their values. Cloud Run should receive them through Secret Manager with a dedicated service account granted `roles/secretmanager.secretAccessor`.

## Runtime configuration

```text
ODOO_BASE_URL=https://irnx.odoo.com
ODOO_DATABASE=irnx.core
ODOO_SIGNAL_MODEL=irenx.signal
```

The Odoo API key is intentionally not included here.

## Cloud Run

Recommended service name: `irenx-api`

Recommended runtime service account: `irenx-runtime@irenx-506618.iam.gserviceaccount.com`

Grant only the Secret Manager access required by the service. Google recommends Secret Manager for sensitive Cloud Run configuration rather than storing API keys directly in source or ordinary environment variables.

## App Hub

Register the Cloud Run service as the primary IRENX application component after application management is enabled for the project/folder boundary.

## Deployment

The actual deployment must be executed from an authenticated Google Cloud environment with access to project `irenx-506618`. This repository intentionally does not contain credentials or attempt to impersonate the user's Google account.

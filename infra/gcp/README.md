# IRENX Google Cloud

Target project: `irenx-506618`

This directory defines the production blueprint for running the IRENX backend on Google Cloud while keeping Odoo and Google user-data credentials outside the repository.

## Target architecture

`GitHub CI → Cloud Run → Secret Manager → IRENX → Odoo JSON-2 + Google People API`

App Hub is the application inventory/management layer for the IRENX application.

## Required secrets

Create these in Google Cloud Secret Manager:

- `irenx-odoo-api-key`
- `irenx-signal-ingest-key`
- `irenx-google-people-access-token`
- `irenx-google-people-ingest-key`

Do **not** commit their values. Cloud Run should receive them through Secret Manager with a dedicated runtime service account granted only the required `roles/secretmanager.secretAccessor` access.

## Runtime configuration

```text
ODOO_BASE_URL=https://irnx.odoo.com
ODOO_DATABASE=irnx.core
ODOO_SIGNAL_MODEL=irenx.signal
GOOGLE_PEOPLE_TIMEOUT_MS=15000
```

The Odoo API key, Google People OAuth access token, and endpoint guard key are intentionally not included here.

## Google People API

IRENX uses a user-authorized OAuth 2.0 access token for private People/Contacts data. Recommended minimum read scope:

`https://www.googleapis.com/auth/contacts.readonly`

The access token must be kept server-side. It must never be embedded in the frontend, repository, WebSocket payload, or public configuration.

## Cloud Run

Recommended service name: `irenx-api`

Recommended runtime service account: `irenx-runtime@irenx-506618.iam.gserviceaccount.com`

Grant only the Secret Manager access required by the service.

## App Hub

Register the Cloud Run service as the primary IRENX application component after application management is enabled for the project/folder boundary.

## Deployment

The actual deployment must be executed from an authenticated Google Cloud environment with access to project `irenx-506618`. This repository intentionally does not contain credentials or attempt to impersonate the user's Google account.

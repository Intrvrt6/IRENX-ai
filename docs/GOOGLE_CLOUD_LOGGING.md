# IRENX ↔ Google Cloud Logging

IRENX is configured for Google Cloud project `irenx-506618`.

## Logging path

`IRENX runtime → stdout/stderr → Cloud Run → Cloud Logging`

Cloud Run automatically collects container stdout/stderr and sends it to Cloud Logging. IRENX also includes `api/cloud-logging.ts` for structured JSON logs and request-trace correlation using `X-Cloud-Trace-Context`.

## Logs Explorer

Use the user's Cloud Logging Logs Explorer link for project `irenx-506618`, or filter Cloud Run logs with:

```text
resource.type="cloud_run_revision"
resource.labels.service_name="irenx-api"
```

For errors:

```text
resource.type="cloud_run_revision"
resource.labels.service_name="irenx-api"
severity>=ERROR
```

## Runtime variables

```env
GOOGLE_CLOUD_PROJECT=irenx-506618
GCP_PROJECT_ID=irenx-506618
IRENX_LOG_SERVICE=irenx-api
```

No Google credential is required just to emit stdout/stderr logs from Cloud Run. Do not put service-account keys or OAuth tokens in the repository.

## Important

The shared `cloudlogging.app.goo.gl` URL is a Google Console deep link. It is not an ingestion endpoint. IRENX connects to Cloud Logging through the Google Cloud runtime and structured stdout; Cloud Logging then indexes the entries automatically.

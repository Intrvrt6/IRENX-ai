# IRENX ↔ Google People API

IRENX now includes a server-side Google People API adapter for authenticated user profile/contact data.

## Architecture

`IRENX API → api/google-people.ts → people.googleapis.com/v1`

The adapter does not expose Google credentials to the browser. It expects a user-authorized OAuth 2.0 access token in the server environment.

## Required configuration

```env
GOOGLE_PEOPLE_ACCESS_TOKEN=...
GOOGLE_PEOPLE_TIMEOUT_MS=15000
GOOGLE_PEOPLE_INGEST_KEY=...
```

For private contacts, Google requires OAuth authorization. The read-only contacts scope is:

`https://www.googleapis.com/auth/contacts.readonly`

For contact management/write operations, use:

`https://www.googleapis.com/auth/contacts`

Google's `people.connections.list` requires `personFields` and supports pagination and incremental synchronization. Sync tokens expire after 7 days; an expired token requires a new full sync.

## Endpoints

### Health

`GET /api/google/people/health`

Validates the configured access token by requesting `people/me` with minimal fields.

### Authenticated profile

`GET /api/google/people/me?personFields=names,emailAddresses,phoneNumbers`

### Contacts

`GET /api/google/people/connections?personFields=names,emailAddresses,phoneNumbers,organizations,photos,metadata&pageSize=100`

Supported query parameters include `pageToken`, `pageSize`, `requestSyncToken`, `syncToken`, and `sortOrder`.

## Security

- Never commit `GOOGLE_PEOPLE_ACCESS_TOKEN`.
- Keep the token in Google Cloud Secret Manager or another server-side secret store.
- Restrict `/api/google/people/*` with `GOOGLE_PEOPLE_INGEST_KEY` when the service is reachable outside a trusted network.
- Request the minimum OAuth scope required.
- Do not forward the Google access token to frontend code.

Google's People API returns private contact data only after the authenticated user grants the relevant OAuth scope.

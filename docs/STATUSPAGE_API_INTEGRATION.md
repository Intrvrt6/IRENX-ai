# IRENX Statuspage API Integration

IRENX exposes a read-only MCP tool, `statuspage_get_page`, for querying the official Statuspage API.

## Configuration

Set these server-side secrets:

```env
STATUSPAGE_API_KEY=
STATUSPAGE_PAGE_ID=
```

The API key is sent only in the upstream request as:

```http
Authorization: OAuth <server-side-key>
```

It is never returned by the tool.

## Tool

`statuspage_get_page`

- `page_id` — optional override; defaults to `STATUSPAGE_PAGE_ID`.
- `path` — defaults to `/v1/pages` and resolves to `/v1/pages/{page_id}`.
- read-only `GET` requests only.
- upstream restricted to `https://api.statuspage.io`.
- rejects path traversal and non-`/v1/` paths.

## Operational use

Use this integration for IRENX observability and service-status context. It must not be treated as a trading or execution trigger by itself.

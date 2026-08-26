# cdnjs API Integration

IRENX can query the public cdnjs API service maintained by cdnjs. The upstream `cdnjs/api-server` project is a Cloudflare Worker API server for api.cdnjs.com and is MIT licensed.

## MCP usage

IRENX exposes the `cdnjs_api` MCP tool for read-only API access.

Supported inputs:

- `path`: API path under `https://api.cdnjs.com`, for example `/libraries` or `/libraries/react`.
- `query`: optional query parameters as a JSON object.

The integration is intentionally read-only and uses an allowlisted upstream origin. It does not clone, deploy, or modify the cdnjs service.

## Upstream

Repository: https://github.com/cdnjs/api-server
API: https://api.cdnjs.com

The upstream project documents that its API server is deployed as a Cloudflare Worker and provides the cdnjs API used by the website.

# Twelve Data AD Integration

IRENX exposes Twelve Data's **Accumulation/Distribution (AD)** indicator through the MCP tool `twelvedata_ad`.

## Configuration

Set the existing server-side secret:

```env
TWELVEDATA_API_KEY=your_server_side_key
```

Do not put the key in frontend code, prompts, public URLs, or committed source files.

## MCP usage

Default request:

```json
{
  "symbol": "AAPL",
  "interval": "1min"
}
```

Optional parameters:

- `time_period`: indicator period when supported by the provider.
- `outputsize`: number of returned data points.

The integration calls `https://api.twelvedata.com/ad` server-side and authenticates with the Twelve Data API key in the request header.

## IRENX signal role

AD is treated as a **volume/accumulation-distribution confirmation input**, not a standalone trade trigger. IRENX should combine it with regime, liquidity, structure, reflexivity, momentum, and risk controls before producing an execution decision.

## Reference

Twelve Data documents the AD indicator as a volume indicator and supports intraday intervals such as `1min`.

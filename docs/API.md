# API reference

The Flask API serves REST snapshots and Server-Sent Event streams. Times are UTC ISO
8601 strings.

## Health

`GET /health` returns backend status and whether Supabase persistence is enabled.

## REST snapshots

| Endpoint | Description |
|---|---|
| `GET /api/zones` | Current zone, stability, transition state, candidate count |
| `GET /api/exposures` | Aggregate exposures, strike curve, walls, flip and Greek bands |
| `GET /api/micro` | Quote imbalance, microprice, spread, liquidity and volatility |
| `GET /api/signals` | Direction, explosion and precision scores |
| `GET /api/alerts?limit=50` | Most recent active alerts |

## SSE streams

Connect with `EventSource` to:

- `/stream/zones`
- `/stream/exposures`
- `/stream/micro`
- `/stream/scores`
- `/stream/alerts`

Each response is emitted as a named event matching the final path segment:

```ts
const source = new EventSource(`${BACKEND_URL}/stream/zones`);
source.addEventListener("zones", (event) => {
  const zone = JSON.parse((event as MessageEvent).data);
});
```

The default cadence is 1.5 seconds and is controlled by `STREAM_INTERVAL`.

## Live vendor integration

`VendorDataProvider` uses Twelve Data's `/price` endpoint for the configured underlying
and ThetaData's direct Python client for all-expiration Greeks, NBBO quotes, last trades,
and open interest. Vendor calls are cached independently. When a refresh fails, the
provider records the error in `/health` and temporarily serves synthetic data so SSE
connections remain alive.

Use `DATA_PROVIDER=live` to require the live-provider path or `DATA_PROVIDER=auto` to
enable it whenever both API keys are configured.

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

## Connecting a live market-data provider

Implement an adapter with `snapshot()` and `option_chain(spot)` methods matching
`SyntheticDataProvider`, then instantiate it in `app/__init__.py`. Normalize provider
field names at the adapter boundary. Confirm option multipliers, dealer sign convention,
quote timestamps, and stale-data handling before using live output.


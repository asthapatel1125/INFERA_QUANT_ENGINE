# Deployment

## 1. Supabase

Create a project and run `supabase/schema.sql` in the SQL editor. Keep row-level
security enabled. The backend should use a server-side key; never expose that key to the
frontend.

## 2. Render backend

The repository includes `backend/render.yaml`. Create a Blueprint or Web Service with:

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn app:app --workers 1 --threads 8 --timeout 0`
- Health check: `/health`

Set the following environment variables:

```text
DATA_PROVIDER=live
MARKET_SYMBOL=QQQ
TWELVEDATA_API_KEY=<your Twelve Data key>
THETADATA_API_KEY=<your ThetaData portal API key>
THETADATA_MAX_DTE=90
THETADATA_STRIKE_RANGE=30
THETADATA_CHAIN_TTL=15
THETADATA_OI_TTL=900
TWELVEDATA_PRICE_TTL=60
SUPABASE_URL=<your Supabase URL>
SUPABASE_KEY=<your Supabase server-side secret key>
CORS_ORIGINS=<your Vercel origin>
```

ThetaData's Python client connects directly to its hosted service, so Theta Terminal
does not need to run on Render. Python 3.12 or newer is required.
Long-lived SSE connections require a nonzero worker timeout; the included command uses
threaded workers.

## 3. Vercel frontend

Import the repository and set the root directory to `frontend`. Vercel detects Vite.
Set:

```text
VITE_BACKEND_URL=https://your-render-service.onrender.com
```

Add the resulting Vercel origin to backend `CORS_ORIGINS`.

## 4. Verification

Check `/health`, load every dashboard, observe the LIVE indicator, and keep an SSE
connection open for several minutes. Confirm Supabase rows, CORS policy, reconnection
behavior, and your live provider's field mapping before treating the deployment as
production-ready.

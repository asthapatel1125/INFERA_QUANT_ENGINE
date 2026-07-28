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

Set `SUPABASE_URL`, `SUPABASE_KEY`, `DATA_PROVIDER_API_KEY`, and `CORS_ORIGINS`.
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


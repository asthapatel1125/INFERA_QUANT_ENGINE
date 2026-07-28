# Axiom Flow

Institutional options-flow analytics with a Flask API, React + TypeScript dashboards,
Server-Sent Events, and optional Supabase persistence.

## Quick start

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
flask --app app run --debug --port 5000
```

The backend starts with a deterministic synthetic data provider, so no credentials are
required for local development. Set `SUPABASE_URL` and `SUPABASE_KEY` to persist data.

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:5173`. The Vite development server proxies API and stream
requests to `http://localhost:5000`.

## Tests and production builds

```bash
cd backend
pytest

cd ../frontend
npm run build
```

See [docs/API.md](docs/API.md) for endpoint details and
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Render, Vercel, and Supabase setup.

> This software is an analytics demonstration, not financial advice or an execution
> system. Validate all market-data assumptions before production use.


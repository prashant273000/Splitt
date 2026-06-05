# Setup

## Prerequisites

- Node.js 20+
- Docker Desktop (for Postgres)

## First-time setup

Run everything from the **repo root** unless noted otherwise.

```bash
# 1. Install dependencies for all workspaces
npm install

# 2. Start Postgres (port 5434 on the host)
docker compose up -d

# 3. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Apply migrations and generate the Prisma client
npm --workspace backend run prisma:migrate

# 5. Seed dev users (Dev User, Alice, Bob)
npm --workspace backend run db:seed

# 6. Start the backend (port 3000)
npm run dev:backend
```

In a second terminal:

```bash
# 7. Start the frontend (port 5173)
npm run dev:frontend
```

## Verify it works

- Open http://localhost:5173 — redirects to `/login`.
- Click **Dev Login** — lands on the home page as Dev User.
- Click **Post Ride** — form loads, fill it in and submit, ride appears on home page.
- Click **Post Intent** — form loads, submit, intent appears.
- `curl http://localhost:3000/health` returns `{"ok":true,"db":"connected",...}`.

For a full API smoke test run `bash smoke.sh` from the repo root (requires `jq`).

## Google OAuth (production / real testing)

Dev Login is only available in `NODE_ENV=development`. For real Google sign-in:

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Create an **OAuth 2.0 Client ID** of type **Web application**.
3. Add `http://localhost:5173` to **Authorised JavaScript origins**.
4. Copy the **Client ID** (no client secret needed).
5. Set it in both env files:

```
# backend/.env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# frontend/.env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

6. Add your Google account as a test user in the OAuth consent screen.
7. Restart both servers.

Only `@iiitdmj.ac.in` accounts are allowed by default. Change `ALLOWED_EMAIL_DOMAIN` in `backend/.env` to test with a different domain.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev:backend` | Start backend on :3000 |
| `npm run dev:frontend` | Start frontend on :5173 |
| `npm run lint` | Lint all JS/JSX |
| `npm run format` | Auto-format everything |
| `npm --workspace backend run prisma:studio` | Open Prisma Studio (DB browser) |
| `npm --workspace backend run db:seed` | Re-seed dev users |
| `docker compose down -v` | Stop Postgres and wipe all data |

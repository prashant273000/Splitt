# Splitt

A better way to share autos out of campus, built for IIIT Jabalpur students.

## What it does

Students heading to the same place at the same time shouldn't each pay for a separate auto. Splitt connects them.

**Two flows:**

- **Post a ride** — you're booking an auto and have spare seats. Set the destination, time, and fare per head. Splitt finds students looking for a ride that matches yours.
- **Post an intent** — you need a ride but don't have one yet. Set where you want to go and your time window. Splitt finds existing rides that fit.

When a ride and an intent match, both the poster and the seeker get notified in real time. Both sides confirm, a seat is reserved, and WhatsApp contact details are revealed. Only `@iiitdmj.ac.in` Google accounts can sign in.

## Tech stack

React 18 · Vite · TailwindCSS · TanStack Query · Express · Prisma · PostgreSQL · Server-Sent Events

## Getting started

See **[docs/SETUP.md](docs/SETUP.md)** for the full setup guide.

Short version:

```bash
npm install
docker compose up -d
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm --workspace backend run prisma:migrate
npm --workspace backend run db:seed
npm run dev:backend   # localhost:3000
npm run dev:frontend  # localhost:5173
```

Open http://localhost:5173, click **Dev Login**, and you're in.

## Contributing

Read **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** before opening a PR.
The backlog of open issues is in **[CLEANUP.md](CLEANUP.md)**.

## Docs

| File | What's in it |
|---|---|
| [docs/SETUP.md](docs/SETUP.md) | Local setup, Google OAuth config, useful commands |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the backend works — matching, SSE, confirmation flow |
| [docs/DATA_SHAPES.md](docs/DATA_SHAPES.md) | Every API endpoint with example request/response |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Branch naming, commit format, PR process |
| [CLEANUP.md](CLEANUP.md) | Features not yet built — pick one and open an issue |

# Find Time

Find Time is a collaborative meeting availability app built with React, TanStack Router, and LiveStore.
Users create a meeting, share a link, join as participants, and mark availability across a weekly time grid.

## What this project does

- Create meetings with:
  - title
  - timezone
  - slot duration (`15`, `30`, or `60` minutes)
  - start/end availability window
  - excluded weekdays
- Share a meeting URL with participants
- Let participants join and mark/unmark available slots
- Show overlap counts and participant names per slot
- Allow meeting creators to edit meeting settings

## Tech stack

- **Frontend:** React 19 + TypeScript + Vite
- **Routing:** TanStack Router (file-based routes)
- **State / Sync:** LiveStore (event-sourced local state + realtime sync)
- **Backend sync:** Cloudflare Worker + Durable Object + D1
- **Forms / validation:** React Hook Form + Zod

## Quick start

### 1) Install dependencies

```bash
pnpm install
```

### 2) Configure local environment

Frontend variables (copy or update `.env`):

```env
VITE_LIVESTORE_SYNC_URL=ws://localhost:8787
VITE_LIVESTORE_SYNC_AUTH_TOKEN=<same-value-as-SYNC_AUTH_TOKEN-in-.dev.vars>
```

Worker local secret (copy `.dev.vars.example` to `.dev.vars`):

```env
SYNC_AUTH_TOKEN=<same-value-as-VITE_LIVESTORE_SYNC_AUTH_TOKEN>
```

### 3) Start development

```bash
pnpm dev
```

This starts Vite and automatically starts `wrangler dev` for the sync worker when needed.

## NPM scripts

- `pnpm dev` — run app locally (and auto-start local sync backend if not running)
- `pnpm build` — type-check + production build
- `pnpm preview` — preview built app
- `pnpm lint` — run ESLint
- `pnpm cf:dev` — run Worker locally via Wrangler
- `pnpm cf:deploy` — deploy Worker
- `pnpm pages:deploy` — deploy static frontend to Cloudflare Pages
- `pnpm deploy` — build + deploy Worker + deploy Pages

## Environment files

- `.env` (Vite/browser-exposed `VITE_*` values)
- `.dev.vars` (local Worker secrets for Wrangler)
- `.env.production` (frontend production values)
- `.dev.vars.example` / `.env.example` (safe templates)

> Keep auth tokens in sync between frontend and Worker:
>
> - `VITE_LIVESTORE_SYNC_AUTH_TOKEN` (frontend)
> - `SYNC_AUTH_TOKEN` (Worker)

## Key project paths

- `src/routes/` — app pages (`/`, `/create`, `/meet/:meetId`, `/meet/:meetId/edit`)
- `src/components/` — reusable UI + meeting form/grid components
- `src/livestore/schema.ts` — event/table schema and materializers
- `src/livestore/queries.ts` — query helpers
- `src/cf-worker/index.ts` — Cloudflare sync backend entry
- `wrangler.jsonc` — Worker bindings, D1, Durable Object, routes

## Deployment

For full Cloudflare deployment and troubleshooting, see:

- [`DEPLOYMENT.md`](./DEPLOYMENT.md)

## Notes

- The root route currently uses a static LiveStore `storeId` (`find-time-app`) for shared collaboration.
- The meeting page computes slot IDs deterministically as `${participantId}:${dayOfWeek}:${startTime}`.

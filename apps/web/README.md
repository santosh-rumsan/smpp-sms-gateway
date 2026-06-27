# smpp-sms-web

React 19 frontend for the SMPP SMS Gateway — built with TanStack Start, Vite, and TailwindCSS v4. Deploys to Cloudflare Pages.

## Deploying to Cloudflare Pages via GitHub

### 1. Connect the repository

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Authorize GitHub and select this repository.

### 2. Configure build settings

Use these settings in the **Set up builds and deployments** step:

| Setting | Value |
|---|---|
| **Framework preset** | None |
| **Root directory** | `/` *(leave blank / repo root)* |
| **Build command** | `pnpm --filter @rs/web build:cf` |
| **Build output directory** | `apps/web/dist` |

> The `build:cf` script runs `NITRO_PRESET=cloudflare-pages vite build`, which produces a Cloudflare Pages-compatible output bundle.

### 3. Set environment variables

Under **Settings → Environment variables**, add:

| Variable | Value | Notes |
|---|---|---|
| `VITE_API_URL` | `https://smpp-sms-api.patiyala.workers.dev` | Your deployed API Worker URL |
| `NODE_VERSION` | `23` | Required — project needs Node ≥ 23.7 |

Set these for both **Production** and **Preview** environments.

### 4. Save and deploy

Click **Save and Deploy**. Cloudflare Pages will install dependencies with pnpm, build the app, and publish it.

Every push to `main` triggers a production deployment automatically. Pull requests get preview deployments on unique URLs.

---

## Local development

```bash
pnpm dev:web      # Start frontend only (port 9515)
pnpm dev          # Start all apps concurrently
```

Requires `VITE_API_URL` in `apps/web/.env`:

```env
VITE_API_URL=https://smpp-sms-api.patiyala.workers.dev
```

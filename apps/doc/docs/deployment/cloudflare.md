# Cloudflare Workers (API)

The API runs as a Cloudflare Worker with a D1 (SQLite) database.

## Prerequisites

- Cloudflare account
- Wrangler CLI (`npx wrangler`)
- D1 database created (see [Setup](/guide/setup))

## Deploy the API

```bash
cd apps/api
npx wrangler deploy
```

This deploys the Worker and outputs the URL (e.g., `https://smpp-sms.<your-subdomain>.workers.dev`).

## Set Secrets

Secrets must be set via Wrangler (they are not in `wrangler.toml`):

```bash
npx wrangler secret put RS_OFFICE_APP_ID
npx wrangler secret put RS_OFFICE_APP_ENV_ID
npx wrangler secret put RS_OFFICE_APP_PRIVATE_KEY
```

## Run Migrations on Production D1

```bash
pnpm db:migrate --remote
```

## Deploy the Web App

The web app is a static/SSR site built with TanStack Start. It can be deployed to any hosting platform that supports Node.js or static sites.

Update the `VITE_API_URL` to point to your deployed Worker URL before building:

```bash
cd apps/web
VITE_API_URL=https://smpp-sms.your-subdomain.workers.dev pnpm build
```

## Connect the SMPP Gateway

After deploying the API:

1. Open the deployed web app
2. Sign in and go to **Admin > API Keys**
3. Generate an API key
4. Configure the SMPP gateway with the production API URL and key:

```bash
docker run -d \
  --name smpp-gateway \
  -p 9511:9511 \
  -e API_URL=https://smpp-sms.your-subdomain.workers.dev \
  -e API_KEY=<generated-key> \
  smpp-gateway
```

See the [Docker deployment guide](/deployment/docker) for details.

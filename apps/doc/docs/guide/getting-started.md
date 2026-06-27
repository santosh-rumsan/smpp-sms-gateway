# Getting Started

## Architecture Overview

The SMPP SMS Gateway consists of three main applications:

| App | Technology | Purpose |
|-----|-----------|---------|
| **API** (`apps/api`) | Cloudflare Worker (Hono + D1) | REST API, database, authentication |
| **Web** (`apps/web`) | React 19 (TanStack Start) | Chat-style UI for reading/sending SMS |
| **SMPP** (`apps/smpp`) | Node.js | SMPP protocol gateway, connects to GoIP devices |

```
Browser ── Web UI (:9515) ── API (:6061) ── SMPP Gateway (:9511) ── GoIP Devices
                                 │
                              D1 (SQLite)
```

## Prerequisites

- Node.js >= 23.7
- pnpm >= 10.19
- Cloudflare account (for D1 database and Workers)
- Google OAuth client ID (for authentication)
- RS Office app registration
- GoIP device(s) with SMPP enabled

## Quick Start

### 1. Clone and Install

```bash
git clone <repo-url>
cd smpp-sms
pnpm install
```

### 2. Set Up the API

Create a Cloudflare D1 database:

```bash
cd apps/api
npx wrangler d1 create smpp-sms
```

Update `apps/api/wrangler.toml` with the returned `database_id`.

Set Cloudflare Worker secrets:

```bash
npx wrangler secret put RS_OFFICE_APP_ID
npx wrangler secret put RS_OFFICE_APP_ENV_ID
npx wrangler secret put RS_OFFICE_APP_PRIVATE_KEY
```

### 3. Run Database Migrations

```bash
pnpm db:generate
pnpm db:migrate
```

### 4. Configure the Web App

Create `apps/web/.env`:

```
VITE_API_URL=http://localhost:6061
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

### 5. Start Development

```bash
pnpm dev
```

This starts all apps concurrently:

| App | URL |
|-----|-----|
| API | http://localhost:6061 |
| Web | http://localhost:9515 |
| SMPP Health | http://localhost:9511/health |

You can also start apps individually:

```bash
pnpm dev:api     # API only
pnpm dev:web     # Web only
pnpm dev:smpp    # SMPP gateway only
pnpm dev:doc     # Documentation site
```

### 6. First Login and Setup

1. Open http://localhost:9515
2. Sign in with your Google account
3. Complete the setup wizard (first user becomes superadmin)
4. Go to **Admin > Devices** and add your GoIP device
5. Go to **Admin > API Keys** and generate an API key

### 7. Configure the SMPP Gateway

Create `apps/smpp/.env`:

```
API_URL=http://localhost:6061
API_KEY=<the-api-key-from-step-6>
HTTP_PORT=9511
```

Restart the SMPP app. It will connect to your GoIP devices automatically.

### 8. Verify

- Check the SMPP gateway health: http://localhost:9511/health
- Send a test SMS from the Web UI
- Verify the message appears in the conversation view

## Project Structure

```
smpp-sms/
├── apps/
│   ├── api/          Cloudflare Worker REST API
│   ├── smpp/         Node.js SMPP gateway (Docker-ready)
│   ├── web/          React frontend
│   └── doc/          This documentation (VitePress)
├── packages/
│   ├── db/           Drizzle ORM schemas and migrations
│   ├── sdk/          Shared HTTP client utilities
│   ├── ui/           Shared React UI components (shadcn)
│   └── validators/   Shared Zod validation schemas
└── tooling/          Shared ESLint, Prettier, TypeScript, Tailwind configs
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Run all apps concurrently |
| `pnpm dev:api` | API only (port 6061) |
| `pnpm dev:web` | Web only (port 9515) |
| `pnpm dev:smpp` | SMPP gateway only (port 9511) |
| `pnpm dev:doc` | Documentation site |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Apply migrations to local D1 |
| `pnpm build` | Build all apps |
| `pnpm typecheck` | Run TypeScript checks |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Check Prettier formatting |

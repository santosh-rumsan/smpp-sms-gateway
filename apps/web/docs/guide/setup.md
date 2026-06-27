# Setup

## D1 Database

The API uses Cloudflare D1 (SQLite) for storage.

### Create the Database

```bash
cd apps/api
npx wrangler d1 create smpp-sms
```

Update `apps/api/wrangler.toml` with the returned `database_id`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "smpp-sms"
database_id = "<your-database-id>"
```

### Run Migrations

```bash
pnpm db:generate
pnpm db:migrate
```

To apply migrations to the remote (production) D1 database:

```bash
pnpm db:migrate --remote
```

## Authentication

Authentication uses RS Office with Google OAuth:

1. **Google OAuth** - Users sign in with Google
2. **RS Office** - Google token is exchanged for an RS Office JWT
3. **API** - All requests are authenticated with the RS Office JWT

### Required Credentials

| Secret | Where | Purpose |
|--------|-------|---------|
| `GOOGLE_CLIENT_ID` | Root `.env` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Root `.env` | Google OAuth client secret |
| `RS_OFFICE_APP_ID` | Wrangler secret | RS Office application ID |
| `RS_OFFICE_APP_ENV_ID` | Wrangler secret | RS Office environment ID |
| `RS_OFFICE_APP_PRIVATE_KEY` | Wrangler secret | RS Office private key |
| `VITE_GOOGLE_CLIENT_ID` | `apps/web/.env` | Same Google client ID for the frontend |

Set Wrangler secrets:

```bash
npx wrangler secret put RS_OFFICE_APP_ID
npx wrangler secret put RS_OFFICE_APP_ENV_ID
npx wrangler secret put RS_OFFICE_APP_PRIVATE_KEY
```

## Setup Wizard

On first access, the web app redirects to a setup wizard:

1. Sign in with Google
2. The first user is automatically assigned the **superadmin** role
3. Complete the setup wizard to mark the system as configured

After setup:

1. Add GoIP devices in **Admin > Devices**
2. Generate an API key in **Admin > API Keys** for the SMPP gateway
3. Configure `apps/smpp/.env` with the API key
4. Start or restart the SMPP gateway

## SMPP Gateway Configuration

The SMPP gateway requires three environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:6061` | URL of the API |
| `API_KEY` | (required) | API key generated from Admin panel |
| `HTTP_PORT` | `9511` | Port for the health check endpoint |

Create `apps/smpp/.env`:

```
API_URL=http://localhost:6061
API_KEY=<your-api-key>
HTTP_PORT=9511
```

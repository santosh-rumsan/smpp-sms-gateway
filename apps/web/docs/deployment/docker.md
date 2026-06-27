# Docker (SMPP Gateway)

The SMPP gateway can be built and run as a Docker container. This is the recommended way to deploy it in production, since it needs to run as a long-lived Node.js process (unlike the API which runs on Cloudflare Workers).

## Prerequisites

- Docker >= 20.10
- Access to the repository (the Dockerfile uses the monorepo root as build context)

## Building the Image

From the **repository root**:

```bash
docker build -f apps/smpp/Dockerfile -t smpp-gateway .
```

The build uses a multi-stage process:
1. Installs monorepo dependencies with pnpm
2. Deploys only the SMPP app's production dependencies
3. Creates a minimal runtime image with Node.js 23 and tsx

## Running the Container

```bash
docker run -d \
  --name smpp-gateway \
  -p 9511:9511 \
  -e API_URL=https://your-api.workers.dev \
  -e API_KEY=your-api-key \
  smpp-gateway
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_URL` | Yes | `http://localhost:6061` | URL of the deployed API (Cloudflare Worker) |
| `API_KEY` | Yes | - | API key generated from Admin > API Keys |
| `HTTP_PORT` | No | `9511` | Port for the `/health` endpoint |

### Health Check

The container exposes a health endpoint:

```bash
curl http://localhost:9511/health
```

Response:

```json
{
  "ok": true,
  "ts": 1719043200000,
  "gateways": {
    "device-id-1": true,
    "device-id-2": false
  }
}
```

Each gateway entry shows whether the SMPP connection to that GoIP device is active.

## Docker Compose

For running the SMPP gateway alongside other services:

```yaml
services:
  smpp-gateway:
    build:
      context: .
      dockerfile: apps/smpp/Dockerfile
    ports:
      - "9511:9511"
    environment:
      - API_URL=https://your-api.workers.dev
      - API_KEY=your-api-key
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:9511/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
```

Run with:

```bash
docker compose up -d
```

## Networking

The SMPP gateway needs to reach two things from within the container:

1. **The API** - HTTP requests to the Cloudflare Worker URL (internet access)
2. **GoIP devices** - SMPP connections to GoIP devices on your local network (typically port 2775)

If your GoIP devices are on a local network, use `--network host` or configure Docker networking to allow access:

```bash
# Host networking (simplest for LAN access)
docker run -d \
  --name smpp-gateway \
  --network host \
  -e API_URL=https://your-api.workers.dev \
  -e API_KEY=your-api-key \
  smpp-gateway
```

::: tip
With `--network host`, the container shares the host's network stack, so it can reach GoIP devices on the local network directly. The `HTTP_PORT` is exposed on the host without `-p` mapping.
:::

## Updating

To update the SMPP gateway:

```bash
# Pull latest code
git pull

# Rebuild the image
docker build -f apps/smpp/Dockerfile -t smpp-gateway .

# Restart the container
docker stop smpp-gateway
docker rm smpp-gateway
docker run -d \
  --name smpp-gateway \
  -p 9511:9511 \
  -e API_URL=https://your-api.workers.dev \
  -e API_KEY=your-api-key \
  smpp-gateway
```

Or with Docker Compose:

```bash
git pull
docker compose up -d --build
```

## Troubleshooting

### Container exits immediately

Check logs:

```bash
docker logs smpp-gateway
```

Common causes:
- `API_KEY` not set or invalid
- `API_URL` unreachable from the container

### Cannot connect to GoIP devices

- Verify the GoIP device IP is reachable from within the container
- Check that SMPP is enabled on the GoIP device (default port 2775)
- Try `--network host` if the device is on the local network
- Check the health endpoint to see gateway connection status

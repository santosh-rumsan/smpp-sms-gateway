# API Overview

## Base URL

- Local: `http://localhost:6061`
- Production: Your Cloudflare Worker URL

## Authentication

### User Authentication (JWT)

All user-facing endpoints require a Bearer token from RS Office:

```
Authorization: Bearer <rs-office-jwt>
```

### Internal Authentication (API Key)

The SMPP gateway app uses API key authentication:

```
X-API-Key: <api-key>
```

## Response Format

All endpoints return JSON. Error responses include an `error` field:

```json
{
  "error": "Description of what went wrong"
}
```

## Endpoints Summary

| Group | Path | Auth | Description |
|-------|------|------|-------------|
| Auth | `POST /auth/google` | None | Google OAuth login |
| Auth | `GET /auth/session` | JWT | Verify session |
| Auth | `POST /auth/refresh` | JWT | Refresh token |
| Setup | `GET /setup/status` | None | Check setup status |
| Setup | `POST /setup` | JWT (admin) | Complete setup |
| Channels | `GET /channels` | JWT | List user's channels |
| Channels | `GET /channels/:id` | JWT | Channel detail |
| Conversations | `GET /channels/:id/conversations` | JWT | List conversations |
| Conversations | `GET /channels/:id/conversations/:num/messages` | JWT | Message thread |
| Messages | `POST /channels/:id/messages` | JWT | Send SMS |
| Admin | `GET/POST /admin/devices` | JWT (admin) | Manage devices |
| Admin | `PUT/DELETE /admin/devices/:id` | JWT (admin) | Update/delete device |
| Admin | `GET/POST/DELETE /admin/users/:id/permissions` | JWT (admin) | Manage permissions |
| Admin | `GET/POST/DELETE /admin/api-keys` | JWT (admin) | Manage API keys |
| Admin | `GET/POST /admin/email-transports` | JWT (admin) | Manage email transports |
| Admin | `PUT /admin/email-transports/:id` | JWT (admin) | Update transport |
| Admin | `POST /admin/email-transports/:id/activate` | JWT (admin) | Activate transport |
| Internal | `POST /internal/messages` | API Key | Save incoming SMS |
| Internal | `GET /internal/messages/pending` | API Key | Get queued messages |
| Internal | `PATCH /internal/messages/:id/sent` | API Key | Mark sent |
| Internal | `PATCH /internal/messages/status/:smppId` | API Key | Update status |
| Internal | `GET /internal/devices` | API Key | Get device configs |
| Internal | `PATCH /internal/devices/:id/channel-status` | API Key | Update channel status |
| Internal | `PATCH /internal/devices/:id/gateway-status` | API Key | Update gateway status |
| Health | `GET /health` | None | Health check |

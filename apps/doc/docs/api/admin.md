# Admin API

All endpoints require JWT authentication with superadmin role.

## Devices

### GET /admin/devices
List all GoIP devices with their channels.

### POST /admin/devices
Create a new device.

```json
{
  "name": "Office GoIP-4",
  "smppHost": "192.168.1.100",
  "smppPort": 2775,
  "smppSystemId": "user",
  "smppPassword": "pass",
  "countryCode": "+977"
}
```

The `countryCode` field is optional. When set, incoming phone numbers without a country prefix are normalized using this code.

### PUT /admin/devices/:deviceId
Update device settings.

### DELETE /admin/devices/:deviceId
Delete a device.

## User Permissions

### GET /admin/users/:userId/permissions
List all channel permissions for a user.

### POST /admin/users/:userId/permissions
Assign or update a channel permission.

```json
{
  "channelId": "cuid...",
  "permission": "readwrite"
}
```

### DELETE /admin/users/:userId/permissions/:channelId
Remove a user's permission for a channel.

## API Keys

### GET /admin/api-keys
List API keys (without the key values).

### POST /admin/api-keys
Create a new API key. Returns the raw key once.

```json
{ "name": "SMPP Gateway" }
```

**Response:**
```json
{
  "id": "cuid...",
  "name": "SMPP Gateway",
  "key": "smpp_abc123..."
}
```

### DELETE /admin/api-keys/:keyId
Deactivate an API key.

## Email Transports

Email transports are used for forwarding incoming SMS to email. Only one transport can be active at a time.

### GET /admin/email-transports
List all configured email transports.

### POST /admin/email-transports
Create a new email transport.

```json
{
  "name": "Resend API",
  "type": "api",
  "config": {
    "url": "https://api.resend.com/emails",
    "headers": { "Authorization": "Bearer re_..." },
    "fromName": "SMS Gateway"
  }
}
```

Supported types: `api`, `smtp`, `cloudflare`.

### PUT /admin/email-transports/:id
Update an email transport's configuration.

### POST /admin/email-transports/:id/activate
Activate a transport (deactivates all others).

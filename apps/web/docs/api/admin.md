# Admin API

All endpoints require JWT authentication with admin role.

## Users

### GET /admin/users

List all app users (fetched from RS Office) with their channel permissions.

**Response:**
```json
{
  "users": [
    {
      "id": "cuid...",
      "name": "John Doe",
      "email": "john@example.com",
      "active": true,
      "role": "admin",
      "permissions": [
        {
          "channelId": "cuid...",
          "channelName": "Office Line 1",
          "channelPhone": "+977981234567",
          "permission": "readwrite"
        }
      ]
    }
  ]
}
```

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

Valid values for `permission`: `read`, `write`, `readwrite`.

### DELETE /admin/users/:userId/permissions/:channelId
Remove a user's permission for a channel.

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

## API Keys

### GET /admin/api-keys
List API keys (without the key values).

### POST /admin/api-keys
Create a new API key. Returns the raw key once — store it immediately.

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
Delete an API key.

## Settings

App settings are key/value pairs stored in the database.

### GET /admin/settings
Get all non-secret settings.

**Response:**
```json
{
  "queue_delay_seconds": "5",
  "offline_timeout_seconds": "60",
  "offline_alert_email": "ops@example.com"
}
```

### PUT /admin/settings
Update one or more settings.

```json
{
  "queue_delay_seconds": "10",
  "offline_timeout_seconds": "120",
  "offline_alert_email": "ops@example.com"
}
```

### DELETE /admin/settings/:key
Delete a specific setting key.

## Email Transports

Email transports are used for forwarding incoming SMS to email and for device offline alerts. Only one transport can be active at a time.

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

### POST /admin/email-transports/:id/deactivate
Deactivate a transport without deleting it.

### DELETE /admin/email-transports/:id
Delete a transport. The transport must be inactive first.

## Email Logs

### GET /admin/email-logs
Get the last 200 email delivery attempts (SMS forwards and device offline alerts).

**Response:**
```json
{
  "logs": [
    {
      "id": "cuid...",
      "type": "sms_forward",
      "recipient": "ops@example.com",
      "subject": "SMS from +977984567890",
      "channelId": "cuid...",
      "status": "success",
      "error": null,
      "sentAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

`type` is either `sms_forward` or `device_offline`.

## Webhook Logs

### GET /admin/webhook-logs
Get the last 200 webhook delivery attempts.

**Response:**
```json
{
  "logs": [
    {
      "id": "cuid...",
      "channelId": "cuid...",
      "channelName": "Office Line 1",
      "channelPhone": "+977981234567",
      "webhookId": "cuid...",
      "url": "https://example.com/webhook",
      "event": "sms.received",
      "status": "success",
      "statusCode": 200,
      "error": null,
      "triggeredAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

## Connection Logs

### GET /admin/connection-logs
Get the last 200 SMPP connection/disconnection events.

**Response:**
```json
{
  "logs": [
    {
      "id": "cuid...",
      "deviceId": "cuid...",
      "deviceName": "Office GoIP-4",
      "type": "connected",
      "occurredAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

`type` is either `connected` or `disconnected`.

## SMS Logs

### GET /admin/sms-logs
Get the last 500 messages across all channels.

**Response:**
```json
{
  "logs": [
    {
      "id": "cuid...",
      "channelId": "cuid...",
      "channelName": "Office Line 1",
      "channelPhone": "+977981234567",
      "direction": "inbound",
      "contactNumber": "+977984567890",
      "content": "Hello there",
      "status": "received",
      "statusDetail": null,
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

## SMS Queue

### GET /admin/sms-queue
Get all currently queued outbound messages waiting to be sent by the SMPP gateway.

**Response:**
```json
{
  "messages": [
    {
      "id": "cuid...",
      "channelId": "cuid...",
      "channelName": "Office Line 1",
      "channelPhone": "+977981234567",
      "contactNumber": "+977984567890",
      "content": "Reply message",
      "createdAt": "2025-01-15T10:30:00.000Z"
    }
  ]
}
```

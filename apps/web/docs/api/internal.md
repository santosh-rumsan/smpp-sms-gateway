# Internal API (SMPP Gateway)

These endpoints are used by the SMPP gateway app. They require API key authentication via `X-API-Key` header.

## POST /internal/messages

Save an incoming SMS message. Auto-creates the channel if the destination phone number doesn't exist yet. Triggers email forwards and webhooks configured for the channel.

**Request:**
```json
{
  "sourceAddr": "+977984567890",
  "destinationAddr": "+977981234567",
  "content": "Hello",
  "deviceId": "cuid..."
}
```

The `deviceId` field is optional. When provided, the device's `countryCode` is used to normalize the source phone number.

## GET /internal/messages/pending

Get queued outbound messages waiting to be sent (limit 50, ordered by creation time).

If the `queue_delay_seconds` setting is configured, only messages older than that delay are returned, providing a hold-off window before delivery.

**Response:**
```json
{
  "messages": [
    {
      "id": "cuid...",
      "channelId": "cuid...",
      "sourceAddr": "+977981234567",
      "destinationAddr": "+977984567890",
      "content": "Reply message",
      "deviceId": "cuid..."
    }
  ]
}
```

## PATCH /internal/messages/:messageId/sent

Mark a message as sent with the SMPP message ID.

**Request:**
```json
{
  "smppMessageId": "abc123"
}
```

## PATCH /internal/messages/:messageId/failed

Mark a message as failed with an optional detail string.

**Request:**
```json
{
  "detail": "SMPP submit_sm error: 0x00000045"
}
```

## PATCH /internal/messages/status/:smppMessageId

Update delivery status via SMPP message ID.

**Request:**
```json
{
  "status": "delivered",
  "statusDetail": "optional detail"
}
```

## GET /internal/devices

Get active device configurations for SMPP connections.

**Response:**
```json
{
  "devices": [
    {
      "id": "cuid...",
      "name": "Office GoIP-4",
      "smppHost": "192.168.1.100",
      "smppPort": 2775,
      "smppSystemId": "user",
      "smppPassword": "pass",
      "countryCode": "+977",
      "channels": [
        { "id": "cuid...", "phoneNumber": "+977981234567" }
      ]
    }
  ]
}
```

## PATCH /internal/devices/:deviceId/channel-status

Update the active status of all channels belonging to a device.

**Request:**
```json
{
  "isActive": true
}
```

## PATCH /internal/devices/:deviceId/gateway-status

Update the SMPP connection status for a device (stored in app settings).

**Request:**
```json
{
  "connected": true
}
```

## GET /internal/settings

Get gateway-relevant app settings.

**Response:**
```json
{
  "offline_timeout_seconds": "60",
  "offline_alert_email": "ops@example.com"
}
```

## POST /internal/devices/:deviceId/connection-event

Log an SMPP connect or disconnect event.

**Request:**
```json
{
  "type": "smpp_connected",
  "deviceName": "Office GoIP-4"
}
```

`type` should be `smpp_connected` for connections; any other value is recorded as `disconnected`.

## POST /internal/devices/:deviceId/offline-alert

Trigger an offline alert email for a device. Uses the active email transport and the `offline_alert_email` setting. Skipped silently if either is not configured.

No request body required.

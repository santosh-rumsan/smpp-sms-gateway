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

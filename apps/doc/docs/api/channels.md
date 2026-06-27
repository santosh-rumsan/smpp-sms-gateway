# Channels API

All endpoints require JWT authentication.

## GET /channels

List channels accessible to the current user. Superadmins see all channels.

**Response:**
```json
{
  "channels": [
    {
      "id": "cuid...",
      "deviceId": "cuid...",
      "phoneNumber": "+977981234567",
      "name": "Office Line 1",
      "description": "Main office number",
      "isActive": true,
      "createdAt": 1719043200,
      "updatedAt": 1719043200
    }
  ],
  "total": 1
}
```

## GET /channels/:channelId

Get channel details with message count. Requires read permission.

**Response:**
```json
{
  "channel": { ... },
  "messageCount": 42
}
```

## PUT /channels/:channelId

Update channel details. Admin only.

**Request:**
```json
{
  "name": "New Name",
  "description": "Updated description",
  "isActive": true
}
```

## DELETE /channels/:channelId

Delete a channel and all its messages. Admin only.

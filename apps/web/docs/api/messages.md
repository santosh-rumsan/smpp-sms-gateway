# Conversations & Messages API

## GET /channels/:channelId/conversations

List conversations (unique contact numbers) in a channel. Requires read permission.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50, max: 100)

**Response:**
```json
{
  "conversations": [
    {
      "contactNumber": "+977984567890",
      "lastMessage": "Hello there",
      "lastMessageAt": 1719043200,
      "messageCount": 15
    }
  ],
  "total": 5,
  "page": 1,
  "limit": 50
}
```

## GET /channels/:channelId/conversations/:contactNumber/messages

Get message thread with a specific contact. Requires read permission.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50, max: 100)
- `direction` (optional): `inbound` or `outbound`

**Response:**
```json
{
  "messages": [
    {
      "id": "cuid...",
      "channelId": "cuid...",
      "direction": "inbound",
      "contactNumber": "+977984567890",
      "content": "Hello there",
      "smppMessageId": null,
      "status": "received",
      "statusDetail": null,
      "createdBy": null,
      "createdAt": 1719043200,
      "updatedAt": 1719043200
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 50
}
```

## POST /channels/:channelId/messages

Send an SMS. Requires write permission.

**Request:**
```json
{
  "contactNumber": "+977984567890",
  "content": "Hello from the gateway!"
}
```

**Response (201):**
```json
{
  "message": {
    "id": "cuid...",
    "channelId": "cuid...",
    "direction": "outbound",
    "contactNumber": "+977984567890",
    "content": "Hello from the gateway!",
    "status": "queued",
    "createdBy": "user-cuid...",
    "createdAt": 1719043200
  }
}
```

# Authentication API

## POST /auth/google

Exchange a Google ID token for an RS Office JWT.

**Request:**
```json
{
  "token": "<google-id-token>"
}
```

**Response:**
```json
{
  "token": "<rs-office-jwt>",
  "user": {
    "id": "cuid...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "superadmin",
    "image": "https://..."
  }
}
```

## GET /auth/session

Verify current session validity.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "id": "cuid...",
    "email": "john@example.com",
    "role": "superadmin"
  }
}
```

## POST /auth/refresh

Refresh an expiring token.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "token": "<new-jwt>"
}
```

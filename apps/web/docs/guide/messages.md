# Sending Messages

## Via Web UI

1. Navigate to a channel
2. Click on a conversation or "New message"
3. Enter the recipient number (for new messages)
4. Type your message and press Enter or click Send

## Message Status

Outgoing messages progress through these states:

| Status | Description |
|--------|-------------|
| `queued` | Saved in database, waiting for SMPP gateway to pick up |
| `sent` | Successfully submitted to SMPP server |
| `delivered` | Delivery receipt received from carrier |
| `failed` | Send failed or undeliverable |

Incoming messages have status `received`.

## Message Flow

### Incoming
```
External Phone → GoIP SIM → SMPP → Gateway App → API → Database
```

### Outgoing
```
Web UI → API (status: queued) → Gateway polls → SMPP send (status: sent) → Delivery receipt (status: delivered)
```

The SMPP gateway polls for queued messages every 3 seconds.

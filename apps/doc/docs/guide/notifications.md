# Notifications

The gateway can forward incoming SMS messages via email and/or webhooks on a per-channel basis.

## Email Forwarding

### Configure an Email Transport

Before setting up email forwards, configure an email transport in **Admin > Email Transports**.

Three transport types are supported:

| Type | Description |
|------|-------------|
| **API** | Send emails via any HTTP email API (e.g., Resend, SendGrid) |
| **SMTP** | Send via an SMTP server |
| **Cloudflare** | Send via Cloudflare MailChannels integration |

Only one transport can be active at a time. Create a transport and click **Activate** to enable it.

### Set Up Email Forwards

Once a transport is active, configure per-channel email forwards:

1. Go to a channel's settings
2. Add one or more email addresses
3. Each incoming SMS on that channel will be forwarded to all configured addresses

The forwarded email includes the sender's phone number, channel name, and message content.

## Webhooks

Webhooks send incoming SMS data as HTTP POST requests to configured URLs.

### Set Up a Webhook

1. Go to a channel's settings
2. Add a webhook URL
3. Optionally add custom headers (e.g., for authentication)

### Webhook Payload

Each incoming SMS triggers a POST request with this JSON body:

```json
{
  "event": "sms.received",
  "channelId": "cuid...",
  "channelName": "Office Line 1",
  "channelPhone": "+977981234567",
  "from": "+977984567890",
  "content": "Hello from the phone",
  "receivedAt": "2025-01-15T10:30:00.000Z"
}
```

The `Content-Type` header is always `application/json`. Any custom headers you configure are also included in the request.

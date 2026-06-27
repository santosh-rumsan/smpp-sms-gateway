# Channels & Permissions

## Channels

A channel represents a SIM card/phone number in a GoIP device. Channels are created automatically when the first message arrives for a phone number.

Each channel has:
- **Phone Number**: The SIM card's number (unique)
- **Name**: Display name (defaults to phone number, editable by admin)
- **Device**: The GoIP device this SIM belongs to
- **Active Status**: Can be deactivated by admin

## Permissions

Users are granted per-channel access with three levels:

| Permission | Can View Messages | Can Send Messages |
|-----------|------------------|------------------|
| `read` | Yes | No |
| `write` | No | Yes |
| `readwrite` | Yes | Yes |

Superadmin users have full access to all channels regardless of permissions.

## Managing Permissions

1. Go to **Admin** > **Users**
2. Select a user
3. Assign channel permissions via the permission dialog
4. Choose the channel and permission level (read/write/readwrite)

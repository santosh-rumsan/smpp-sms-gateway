# GoIP Configuration

## Overview

GoIP devices are VoIP gateways with multiple SIM card slots. Each SIM slot becomes a "channel" in the SMS gateway. The GoIP device exposes an SMPP server that the gateway connects to.

## GoIP SMPP Settings

On your GoIP device admin panel, configure the SMPP server:

1. Navigate to **SMS** > **SMPP Server** settings
2. Enable the SMPP server
3. Set the port (default: `2775`)
4. Set a username (System ID) and password
5. Save and restart the SMPP service

## Adding a Device in the Gateway

1. Log in as admin
2. Go to **Admin** > **Devices**
3. Click **Add Device**
4. Enter:
   - **Name**: A descriptive name (e.g., "Office GoIP-4")
   - **SMPP Host**: The IP address of your GoIP device
   - **SMPP Port**: The SMPP port (default: 2775)
   - **System ID**: The username configured on the GoIP
   - **Password**: The password configured on the GoIP
5. Click **Create Device**

The SMPP gateway will automatically connect to the new device within 60 seconds.

## Channel Assignment

Channels are created automatically when the first SMS arrives on a SIM number. You can assign channels to devices in the admin panel to ensure outgoing messages route through the correct GoIP.

## Multiple Devices

The gateway supports multiple GoIP devices. Each device manages its own SMPP connection with independent reconnection logic. Add multiple devices through the admin panel.

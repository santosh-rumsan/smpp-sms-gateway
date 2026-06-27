export interface SetupStatus {
  setupComplete: boolean
}

export type ChannelPermissionLevel = "read" | "write" | "readwrite"
export type MessageDirection = "inbound" | "outbound"
export type MessageStatus = "queued" | "sent" | "delivered" | "failed" | "received"

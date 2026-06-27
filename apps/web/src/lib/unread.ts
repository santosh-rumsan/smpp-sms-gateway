const key = (channelId: string, contactNumber: string) =>
  `smpp:viewed:${channelId}:${contactNumber}`

export function markConversationRead(channelId: string, contactNumber: string) {
  try {
    localStorage.setItem(key(channelId, contactNumber), String(Date.now()))
  } catch {}
}

export function isConversationUnread(
  channelId: string,
  contactNumber: string,
  lastMessageAt: number,
): boolean {
  try {
    const stored = localStorage.getItem(key(channelId, contactNumber))
    if (!stored) return true
    // lastMessageAt is Unix seconds, stored is ms
    return lastMessageAt * 1000 > Number(stored)
  } catch {
    return false
  }
}

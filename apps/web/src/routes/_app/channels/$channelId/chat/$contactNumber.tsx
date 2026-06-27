import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Send, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { API_URL } from '../../../../../lib/api'
import { getAccessToken, useSession } from '../../../../../lib/auth-client'
import {
  findContactByPhone,
  normalizePhone,
  searchContacts,
  useContacts,
} from '../../../../../lib/contacts'
import { ConfirmDialog } from '../../../../../components/confirm-dialog'
import { markConversationRead } from '../../../../../lib/unread'

export const Route = createFileRoute(
  '/_app/channels/$channelId/chat/$contactNumber',
)({
  component: ChatPage,
})

function ChatPage() {
  const { channelId, contactNumber } = Route.useParams()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [newMessage, setNewMessage] = useState('')
  const [destNumber, setDestNumber] = useState(
    contactNumber === 'new' ? '' : contactNumber,
  )
  const [numberConfirmed, setNumberConfirmed] = useState(false)
  const [showContactPicker, setShowContactPicker] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const isNew = contactNumber === 'new'

  const session = useSession()
  const isAdmin = session.data?.user?.role.split(',').includes('admin') ?? false

  const channelQuery = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return res.json() as Promise<{
        channel: {
          device: { countryCode: string | null } | null
        }
        permission: 'read' | 'write' | 'readwrite'
      }>
    },
  })
  const canWrite = isAdmin || channelQuery.data?.permission === 'write' || channelQuery.data?.permission === 'readwrite'

  const conversationsQuery = useQuery({
    queryKey: ['conversations', channelId],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(
        `${API_URL}/channels/${channelId}/conversations?limit=100`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      return res.json() as Promise<{
        conversations: { contactNumber: string }[]
      }>
    },
    enabled: isNew,
  })

  const contacts = useContacts()
  const contact = useMemo(
    () => (isNew ? null : findContactByPhone(contactNumber)),
    [isNew, contactNumber, contacts],
  )
  const filteredPhones = useMemo(() => {
    if (!isNew || !destNumber) return []
    const results = searchContacts(destNumber)
    return results.flatMap((c) =>
      c.phones.map((phone) => ({ name: c.name, phone, photo: c.photo })),
    )
  }, [isNew, destNumber, contacts])

  const destNumberIsPhone = /\d/.test(destNumber)
  const destAlreadyInResults = filteredPhones.some((r) => r.phone === destNumber)

  const findExistingConversation = (destNum: string): string | null => {
    const convos = conversationsQuery.data?.conversations ?? []
    const countryCode = channelQuery.data?.channel?.device?.countryCode ?? null
    const normalized = normalizePhone(destNum)
    let withCountryCode = normalized
    if (countryCode && !normalized.startsWith('+')) {
      const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`
      withCountryCode = `${code}${normalized.replace(/\D/g, '')}`
    }

    for (const convo of convos) {
      const convoNorm = normalizePhone(convo.contactNumber)
      if (convoNorm === normalized || convoNorm === withCountryCode) {
        return convo.contactNumber
      }
      const convoDigits = convoNorm.replace(/\+/, '')
      const destDigits = withCountryCode.replace(/\+/, '')
      const minLen = Math.min(convoDigits.length, destDigits.length)
      if (minLen >= 7) {
        const compareLen = Math.min(minLen, 10)
        if (convoDigits.slice(-compareLen) === destDigits.slice(-compareLen)) {
          return convo.contactNumber
        }
      }
    }
    return null
  }

  const confirmNumber = (num: string) => {
    const existing = findExistingConversation(num)
    if (existing) {
      navigate({
        to: '/channels/$channelId/chat/$contactNumber',
        params: { channelId, contactNumber: existing },
      })
      return
    }
    setDestNumber(num)
    setNumberConfirmed(true)
    setShowContactPicker(false)
    setTimeout(() => messageInputRef.current?.focus(), 0)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['messages', channelId, contactNumber],
    queryFn: async () => {
      if (isNew) return { messages: [], total: 0 }
      const token = getAccessToken()
      const res = await fetch(
        `${API_URL}/channels/${channelId}/conversations/${encodeURIComponent(contactNumber)}/messages?limit=100`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      return res.json() as Promise<{
        messages: {
          id: string
          direction: string
          content: string
          status: string
          createdAt: number
        }[]
        total: number
      }>
    },
    refetchInterval: isNew ? false : 5000,
  })

  const sendMutation = useMutation({
    mutationFn: async ({
      dest,
      content,
    }: {
      dest: string
      content: string
    }) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ contactNumber: dest, content }),
      })
      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        throw new Error(err.error ?? 'Failed to send')
      }
      return res.json() as Promise<{ message: { contactNumber: string } }>
    },
    onSuccess: (data) => {
      setNewMessage('')
      void queryClient.invalidateQueries({
        queryKey: ['messages', channelId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['conversations', channelId],
      })
      const normalized = data.message?.contactNumber
      if (normalized && (isNew || normalized !== contactNumber)) {
        navigate({
          to: '/channels/$channelId/chat/$contactNumber',
          params: { channelId, contactNumber: normalized },
        })
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const token = getAccessToken()
      const res = await fetch(
        `${API_URL}/channels/${channelId}/conversations/${encodeURIComponent(contactNumber)}`,
        {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      )
      if (!res.ok) throw new Error('Failed to delete conversation')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['conversations', channelId] })
      navigate({ to: '/channels/$channelId', params: { channelId } })
    },
  })

  const messages = [...(data?.messages ?? [])].reverse()

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [messages.length])

  useEffect(() => {
    if (!isNew) markConversationRead(channelId, contactNumber)
  }, [isNew, channelId, contactNumber, messages.length])

  const handleSend = () => {
    const dest = isNew ? destNumber : contactNumber
    if (!dest.trim() || !newMessage.trim()) return
    sendMutation.mutate({ dest: dest.trim(), content: newMessage.trim() })
  }

  const statusColor: Record<string, string> = {
    queued: 'text-gray-400',
    sent: 'text-blue-400',
    delivered: 'text-green-500',
    failed: 'text-red-500',
    received: 'text-green-500',
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-gray-200 px-3 sm:px-6 py-3 sm:py-4">
        <Link
          to="/channels/$channelId"
          params={{ channelId }}
          className="text-gray-400 hover:text-gray-600"
        >
          <ArrowLeft size={18} />
        </Link>
        {!isNew && contact?.photo ? (
          <img
            src={contact.photo}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : !isNew && contact ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 flex-shrink-0">
            <span className="text-[10px] font-semibold text-accent-600">
              {(() => {
                const parts = contact.name.trim().split(/\s+/)
                return parts.length >= 2
                  ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                  : contact.name.slice(0, 2).toUpperCase()
              })()}
            </span>
          </div>
        ) : null}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#1a1a1a]">
            {isNew ? 'New Message' : (contact?.name ?? contactNumber)}
          </p>
          {!isNew && contact?.name && (
            <p className="text-xs text-gray-400">{contactNumber}</p>
          )}
        </div>
        {!isNew && canWrite && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {isNew && canWrite && !numberConfirmed && (
        <div className="relative px-3 sm:px-6 py-3 border-b border-gray-100">
          <input
            type="text"
            placeholder="Search contacts or enter number..."
            value={destNumber}
            onChange={(e) => {
              setDestNumber(e.target.value)
              setShowContactPicker(true)
            }}
            onFocus={() => setShowContactPicker(true)}
            onBlur={() => setTimeout(() => setShowContactPicker(false), 200)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && destNumber.trim() && destNumberIsPhone) {
                e.preventDefault()
                confirmNumber(destNumber.trim())
              }
            }}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
          />
          {showContactPicker && (filteredPhones.length > 0 || (destNumber.trim() && destNumberIsPhone)) && (
            <div className="absolute left-3 right-3 sm:left-6 sm:right-6 top-full z-10 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
              {destNumber.trim() && destNumberIsPhone && !destAlreadyInResults && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => confirmNumber(destNumber.trim())}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500">
                    #
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#1a1a1a]">Use "{destNumber.trim()}"</p>
                    <p className="text-xs text-gray-400">Enter number manually</p>
                  </div>
                </button>
              )}
              {filteredPhones.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => confirmNumber(r.phone)}
                >
                  {r.photo ? (
                    <img
                      src={r.photo}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-100 text-[10px] font-semibold text-accent-600">
                      {(() => {
                        const parts = r.name.trim().split(/\s+/)
                        return parts.length >= 2
                          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                          : r.name.slice(0, 2).toUpperCase()
                      })()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#1a1a1a] truncate">{r.name}</p>
                    <p className="text-xs text-gray-400 truncate">{r.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isNew && canWrite && numberConfirmed && (
        <div className="flex items-center gap-2 px-3 sm:px-6 py-3 border-b border-gray-100">
          <span className="text-sm text-gray-500">To:</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 text-sm font-medium text-accent-700">
            {destNumber}
            <button
              type="button"
              onClick={() => {
                setNumberConfirmed(false)
                setNewMessage('')
              }}
              className="ml-1 text-accent-400 hover:text-accent-600"
            >
              &times;
            </button>
          </span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3">
        {isNew && !numberConfirmed ? (
          <p className="text-gray-400 text-center mt-12">Search for a contact or enter a phone number above</p>
        ) : isNew && numberConfirmed ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-md space-y-3">
              <div className="space-y-2">
                <textarea
                  ref={messageInputRef}
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-accent-300 resize-none"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSend}
                    disabled={sendMutation.isPending || !newMessage.trim()}
                    className="flex h-10 items-center gap-2 rounded-xl bg-accent-500 px-4 text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
                  >
                    <Send size={16} />
                    <span className="text-sm font-medium">Send</span>
                  </button>
                </div>
              </div>
              {sendMutation.error && (
                <p className="text-xs text-red-500">{sendMutation.error.message}</p>
              )}
            </div>
          </div>
        ) : isLoading ? (
          <p className="text-gray-400 text-center">Loading...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-400 text-center">No messages yet</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.direction === 'outbound' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3 sm:px-4 py-2.5 ${
                  msg.direction === 'outbound'
                    ? 'bg-accent-500 text-white'
                    : 'bg-gray-100 text-[#1a1a1a]'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
              <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-gray-400">
                <span>
                  {new Date(msg.createdAt).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {msg.direction === 'outbound' && (
                  <span className={statusColor[msg.status] ?? 'text-gray-400'}>
                    &middot; {msg.status}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {canWrite && !isNew ? (
        <div className="border-t border-gray-200 px-3 sm:px-6 py-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-accent-300"
            />
            <button
              onClick={handleSend}
              disabled={sendMutation.isPending || !newMessage.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
          {sendMutation.error && (
            <p className="text-xs text-red-500 mt-2">
              {sendMutation.error.message}
            </p>
          )}
        </div>
      ) : !canWrite ? (
        <div className="border-t border-gray-200 px-3 sm:px-6 py-3">
          <p className="text-sm text-gray-400 text-center">You have read-only access to this channel</p>
        </div>
      ) : null}

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete conversation"
        description={`This will permanently delete all messages with ${contact?.name ?? contactNumber}. This action cannot be undone.`}
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  )
}

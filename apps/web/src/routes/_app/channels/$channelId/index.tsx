import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { MessageSquare, Send, Server, Settings } from 'lucide-react'
import { useMemo, useState } from 'react'

import { API_URL } from '../../../../lib/api'
import { getAccessToken, useSession } from '../../../../lib/auth-client'
import { findContactByPhone, normalizePhone, useContacts } from '../../../../lib/contacts'
import { isConversationUnread } from '../../../../lib/unread'

export const Route = createFileRoute('/_app/channels/$channelId/')({
  component: ConversationListPage,
})

function ConversationListPage() {
  const { channelId } = Route.useParams()
  const [search, setSearch] = useState('')
  const contacts = useContacts()
  const session = useSession()
  const isAdmin = session.data?.user?.role.split(',').includes('admin') ?? false

  const { data, isLoading } = useQuery({
    queryKey: ['conversations', channelId],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(
        `${API_URL}/channels/${channelId}/conversations?limit=100`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      )
      return res.json() as Promise<{
        conversations: {
          contactNumber: string
          lastMessage: string
          lastMessageAt: number
          messageCount: number
        }[]
        total: number
      }>
    },
    refetchInterval: 5000,
  })

  const channelQuery = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return res.json() as Promise<{
        channel: {
          name: string
          phoneNumber: string
          device: { id: string; name: string } | null
        }
        messageCount: number
        permission: 'read' | 'write' | 'readwrite'
      }>
    },
  })

  const canWrite = isAdmin || channelQuery.data?.permission === 'write' || channelQuery.data?.permission === 'readwrite'

  const conversations = useMemo(() => {
    const all = data?.conversations ?? []
    if (!search) return all
    const q = search.toLowerCase()
    const qDigits = normalizePhone(search)
    return all.filter((c) => {
      const contact = findContactByPhone(c.contactNumber)
      if (contact?.name.toLowerCase().includes(q)) return true
      if (qDigits && normalizePhone(c.contactNumber).includes(qDigits)) return true
      if (c.contactNumber.includes(search)) return true
      return false
    })
  }, [data?.conversations, search, contacts])

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1a1a1a]">
              {channelQuery.data?.channel?.name ?? 'Channel'}
            </h1>
            <p className="text-sm text-gray-400">
              {channelQuery.data?.channel?.phoneNumber} &middot;{' '}
              {data?.total ?? 0} conversations
            </p>
            {channelQuery.data?.channel?.device && (
              <div className="flex items-center gap-1.5 mt-1">
                <Server size={12} className="text-gray-400" />
                <span className="text-xs text-gray-400">
                  {channelQuery.data.channel.device.name}
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {canWrite && (
              <Link
                to="/channels/$channelId/chat/$contactNumber"
                params={{ channelId, contactNumber: 'new' }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-accent-500 hover:bg-accent-600 transition-colors"
              >
                <Send size={14} />
                <span className="hidden sm:inline">New Message</span>
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/channels/$channelId/settings"
                params={{ channelId }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Settings size={18} />
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-3 border-b border-gray-100">
        <input
          type="text"
          placeholder="Search by name or number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="p-6 text-gray-400 text-center">Loading...</p>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No conversations yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {conversations.map((convo) => {
              const contact = findContactByPhone(convo.contactNumber)
              const unread = isConversationUnread(channelId, convo.contactNumber, convo.lastMessageAt)
              return (
                <div
                  key={convo.contactNumber}
                  className="flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors"
                >
                  <Link
                    to="/channels/$channelId/chat/$contactNumber"
                    params={{
                      channelId,
                      contactNumber: convo.contactNumber,
                    }}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    {contact?.photo ? (
                      <img
                        src={contact.photo}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 flex-shrink-0">
                        {contact ? (
                          <span className="text-xs font-semibold text-accent-600">
                            {(() => {
                              const parts = contact.name.trim().split(/\s+/)
                              return parts.length >= 2
                                ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
                                : contact.name.slice(0, 2).toUpperCase()
                            })()}
                          </span>
                        ) : (
                          <MessageSquare size={16} className="text-accent-500" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className={`truncate ${unread ? 'font-bold text-[#1a1a1a]' : 'font-medium text-[#1a1a1a]'}`}>
                            {contact?.name ?? convo.contactNumber}
                          </p>
                          {contact?.name && (
                            <p className="text-xs text-gray-400 truncate">
                              {convo.contactNumber}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {convo.messageCount} msgs
                        </span>
                      </div>
                      <p className={`text-sm truncate mt-0.5 ${unread ? 'font-semibold text-gray-700' : 'text-gray-500'}`}>
                        {convo.lastMessage}
                      </p>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>


    </div>
  )
}

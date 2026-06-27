import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Phone, Server, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { API_URL } from '../../../lib/api'
import { getAccessToken } from '../../../lib/auth-client'
import { ConfirmDialog } from '../../../components/confirm-dialog'

interface ChannelData {
  id: string
  name: string
  phoneNumber: string
  description: string | null
  isActive: boolean
  device: { id: string; name: string } | null
}

export const Route = createFileRoute('/_app/channels/')({
  component: ChannelListPage,
})

function ChannelListPage() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return res.json() as Promise<{
        channels: ChannelData[]
        total: number
      }>
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (channelId: string) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to delete channel')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['channels'] })
      setDeleteTarget(null)
    },
  })

  const grouped = useMemo(() => {
    const channels = data?.channels ?? []
    const groups = new Map<string, { device: { id: string; name: string } | null; channels: ChannelData[] }>()

    for (const ch of channels) {
      const key = ch.device?.id ?? '_unlinked'
      let group = groups.get(key)
      if (!group) {
        group = { device: ch.device, channels: [] }
        groups.set(key, group)
      }
      group.channels.push(ch)
    }

    return [...groups.values()]
  }, [data?.channels])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Loading channels...</p>
      </div>
    )
  }

  const channels = data?.channels ?? []

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a1a]">Channels</h1>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-16">
          <Phone className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-semibold text-gray-600">No channels yet</h2>
          <p className="text-sm text-gray-400 mt-1">
            Channels are created automatically when SMS messages arrive.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.device?.id ?? '_unlinked'}>
              <div className="flex items-center gap-2 mb-3">
                <Server size={14} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500">
                  {group.device?.name ?? 'Unlinked Channels'}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.channels.map((ch) => (
                  <div
                    key={ch.id}
                    className="relative rounded-xl border border-gray-200 p-5 hover:border-accent-300 hover:shadow-sm transition-all"
                  >
                    <Link
                      to="/channels/$channelId"
                      params={{ channelId: ch.id }}
                      className="block"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
                          <Phone size={18} className="text-accent-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#1a1a1a]">{ch.name}</p>
                          <p className="text-xs text-gray-400">{ch.phoneNumber}</p>
                        </div>
                      </div>
                      {ch.description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{ch.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-3">
                        <span className={`inline-block h-2 w-2 rounded-full ${ch.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                        <span className="text-xs text-gray-400">{ch.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </Link>
                    {!ch.isActive && (
                      <button
                        onClick={() => setDeleteTarget({ id: ch.id, name: ch.name })}
                        className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete channel"
        description={`This will permanently delete "${deleteTarget?.name ?? ''}" and all its messages. This action cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

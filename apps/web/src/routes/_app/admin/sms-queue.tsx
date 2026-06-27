import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { API_URL } from '../../../lib/api'
import { getAccessToken } from '../../../lib/auth-client'
import { ConfirmDialog } from '../../../components/confirm-dialog'

export const Route = createFileRoute('/_app/admin/sms-queue')({
  component: SmsQueuePage,
})

interface QueuedMessage {
  id: string
  channelId: string
  channelName: string | null
  channelPhone: string | null
  contactNumber: string
  content: string
  createdAt: string
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function SmsQueuePage() {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<QueuedMessage | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sms-queue'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/sms-queue`, {
        headers: authHeaders(),
      })
      return res.json() as Promise<{ messages: QueuedMessage[] }>
    },
    refetchInterval: 5_000,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/admin/sms-queue/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error('Failed to delete message')
    },
    onSuccess: () => {
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'sms-queue'] })
      void queryClient.invalidateQueries({ queryKey: ['messages'] })
    },
  })

  const queued = data?.messages ?? []

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">SMS Queue</h1>
        <p className="text-sm text-gray-500 mt-1">
          Outbound messages waiting to be sent via SMPP. Refreshes every 5 seconds.
        </p>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : queued.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Clock size={32} className="mb-3 opacity-30" />
          <p className="text-sm">Queue is empty</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-3 py-1 text-xs font-semibold text-orange-700">
              {queued.length} message{queued.length !== 1 ? 's' : ''} queued
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Queued At</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {queued.map((msg) => (
                  <tr key={msg.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(msg.createdAt).toLocaleString('en-US', {
                        timeZone: 'Asia/Kathmandu',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700 text-xs font-medium block">{msg.channelName ?? '—'}</span>
                      <span className="text-gray-400 text-xs font-mono">{msg.channelPhone ?? msg.channelId}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                      {msg.contactNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs max-w-sm truncate" title={msg.content}>
                      {msg.content}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setDeleteTarget(msg)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove from queue"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Remove from queue"
        description={`Remove this queued message to "${deleteTarget?.contactNumber ?? ''}"? It will not be sent.`}
        confirmLabel="Remove"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Key, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { API_URL } from '../../../lib/api'
import { getAccessToken } from '../../../lib/auth-client'
import { ConfirmDialog } from '../../../components/confirm-dialog'

export const Route = createFileRoute('/_app/admin/api-keys')({
  component: ApiKeysPage,
})

function ApiKeysPage() {
  const queryClient = useQueryClient()
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'api-keys'],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/admin/api-keys`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return res.json() as Promise<{
        apiKeys: {
          id: string
          name: string
          lastUsedAt: number | null
          createdAt: number
        }[]
      }>
    },
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/admin/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create API key')
      return res.json() as Promise<{ id: string; name: string; key: string }>
    },
    onSuccess: (data) => {
      setCreatedKey(data.key)
      setNewKeyName('')
      void queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const token = getAccessToken()
      await fetch(`${API_URL}/admin/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'api-keys'] })
    },
  })

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">API Keys</h1>

      <div className="mb-6 flex items-center gap-2">
        <input
          placeholder="Key name (e.g., SMPP Gateway)"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
        />
        <button
          onClick={() => newKeyName && createMutation.mutate(newKeyName)}
          disabled={!newKeyName || createMutation.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
        >
          <Plus size={14} /> Create
        </button>
      </div>

      {createdKey && (
        <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4">
          <p className="text-sm font-medium text-green-800 mb-2">
            API key created. Copy it now - it won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-mono break-all border">
              {createdKey}
            </code>
            <button
              onClick={() => void navigator.clipboard.writeText(createdKey)}
              className="p-2 text-green-600 hover:text-green-800"
            >
              <Copy size={16} />
            </button>
          </div>
          <button
            onClick={() => setCreatedKey(null)}
            className="mt-2 text-xs text-green-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {(data?.apiKeys ?? []).map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-center gap-3">
                <Key size={16} className="text-gray-400" />
                <div>
                  <p className="font-medium text-sm">{key.name}</p>
                  <p className="text-xs text-gray-400">
                    {key.lastUsedAt
                      ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : 'Never used'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTarget(key.id)}
                className="p-2 text-gray-400 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete API key"
        description="This will permanently delete the API key. Any services using it will lose access."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

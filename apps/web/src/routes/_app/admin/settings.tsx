import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { useState } from 'react'

import { API_URL } from '../../../lib/api'
import { getAccessToken } from '../../../lib/auth-client'
import { ConfirmDialog } from '../../../components/confirm-dialog'

export const Route = createFileRoute('/_app/admin/settings')({
  component: SettingsPage,
})

const KNOWN_SETTINGS = [
  { key: 'EMAIL_FORWARD_API_URL', label: 'Email Forward API URL', secret: false },
  { key: 'EMAIL_FORWARD_FROM_NAME', label: 'Email Forward Sender Name', secret: false },
  { key: 'offline_timeout_seconds', label: 'Device Offline Timeout (seconds)', secret: false },
  { key: 'offline_alert_email', label: 'Device Offline Alert Email', secret: false },
]

function SettingsPage() {
  const queryClient = useQueryClient()
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addAttempted, setAddAttempted] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/admin/settings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return res.json() as Promise<Record<string, string | null>>
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ [key]: value }),
      })
      if (!res.ok) throw new Error('Failed to update setting')
    },
    onSuccess: () => {
      setEditingKey(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/admin/settings/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to delete setting')
    },
    onSuccess: () => {
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
    },
  })

  const settings = data ?? {}
  const existingKeys = new Set(Object.keys(settings))
  const missingKnown = KNOWN_SETTINGS.filter((s) => !existingKeys.has(s.key))
  const filteredSettings = Object.entries(settings).filter(
    ([key]) => key !== 'setup_completed' && !key.startsWith('gateway_connected_'),
  )

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">Application Settings</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-white hover:bg-accent-600 transition-colors"
        >
          <Plus size={14} /> Add Setting
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 rounded-xl border-2 border-gray-200 p-5 space-y-3">
          {missingKnown.length > 0 && (
            <div className="space-y-1 mb-3">
              <p className="text-xs text-gray-400">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {missingKnown.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setNewKey(s.key)}
                    className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {s.key}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <input
              placeholder="Setting key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                addAttempted && !newKey.trim() ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-accent-300'
              }`}
            />
            {addAttempted && !newKey.trim() && (
              <p className="text-xs text-red-500 mt-0.5">Setting key is required</p>
            )}
          </div>
          <div>
            <input
              placeholder="Setting value"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
                addAttempted && !newValue.trim() ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-accent-300'
              }`}
            />
            {addAttempted && !newValue.trim() && (
              <p className="text-xs text-red-500 mt-0.5">Setting value is required</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setAddAttempted(true)
                if (newKey.trim() && newValue.trim()) {
                  updateMutation.mutate({ key: newKey.trim(), value: newValue.trim() })
                  setNewKey('')
                  setNewValue('')
                  setShowAddForm(false)
                  setAddAttempted(false)
                }
              }}
              disabled={updateMutation.isPending}
              className="rounded-lg bg-[#1a1a1a] px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewKey(''); setNewValue(''); setAddAttempted(false) }}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : filteredSettings.length > 0 ? (
        <div className="space-y-3">
          {filteredSettings.map(([key, value]) => (
            <div key={key} className="rounded-xl border-2 border-gray-200 bg-white px-5 py-4 shadow-sm">
              {editingKey === key ? (
                <div className="space-y-2">
                  <span className="text-xs font-medium text-gray-500">{key}</span>
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
                    />
                    <button
                      onClick={() => updateMutation.mutate({ key, value: editValue })}
                      disabled={updateMutation.isPending || !editValue.trim()}
                      className="rounded-md p-2 text-green-500 hover:bg-green-50 hover:text-green-600 disabled:opacity-50 transition-colors"
                    >
                      <Save size={16} />
                    </button>
                    <button
                      onClick={() => setEditingKey(null)}
                      className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-gray-700 block">{key}</span>
                    <span
                      className="text-sm text-gray-400 truncate block max-w-[400px]"
                      title={value ?? undefined}
                    >
                      {value === null ? '(secret)' : value}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {value !== null && (
                      <button
                        onClick={() => { setEditingKey(key); setEditValue(value) }}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(key)}
                      className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400">No settings configured.</p>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete setting"
        description={`This will permanently delete the setting "${deleteTarget ?? ''}". This action cannot be undone.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

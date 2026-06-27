import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { API_URL } from '../../../lib/api'
import { getAccessToken } from '../../../lib/auth-client'
import { ConfirmDialog } from '../../../components/confirm-dialog'

export const Route = createFileRoute('/_app/admin/')({
  component: DevicesPage,
})

function DevicesPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    smppHost: '',
    smppPort: '2775',
    smppSystemId: '',
    smppPassword: '',
    countryCode: '',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'devices'],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/admin/devices`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return res.json() as Promise<{
        devices: {
          id: string
          name: string
          smppHost: string
          smppPort: number
          smppSystemId: string
          countryCode: string | null
          isActive: boolean
          channels: { id: string; phoneNumber: string; name: string; isActive: boolean }[]
        }[]
      }>
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/admin/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...form,
          smppPort: Number(form.smppPort),
          countryCode: form.countryCode || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create device')
      return res.json()
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'devices'] })
      setShowForm(false)
      setForm({ name: '', smppHost: '', smppPort: '2775', smppSystemId: '', smppPassword: '', countryCode: '' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const token = getAccessToken()
      await fetch(`${API_URL}/admin/devices/${deviceId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'devices'] })
    },
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">GoIP Devices</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-white hover:bg-accent-600"
        >
          <Plus size={14} /> Add Device
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Device name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300" />
            <input placeholder="SMPP Host" value={form.smppHost} onChange={(e) => setForm({ ...form, smppHost: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300" />
            <input placeholder="SMPP Port" value={form.smppPort} onChange={(e) => setForm({ ...form, smppPort: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300" />
            <input placeholder="System ID" value={form.smppSystemId} onChange={(e) => setForm({ ...form, smppSystemId: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300" />
            <input placeholder="Password" type="password" value={form.smppPassword} onChange={(e) => setForm({ ...form, smppPassword: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300" />
            <input placeholder="Country code (e.g. +977)" value={form.countryCode} onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300" />
          </div>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="rounded-lg bg-[#1a1a1a] px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Device'}
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {(data?.devices ?? []).map((device) => (
            <div key={device.id} className="rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{device.name}</h3>
                  <p className="text-sm text-gray-500">
                    {device.smppHost}:{device.smppPort} (ID: {device.smppSystemId})
                    {device.countryCode && <span className="ml-2 text-xs text-gray-400">Country: {device.countryCode}</span>}
                  </p>
                </div>
                <button
                  onClick={() => setDeleteTarget(device.id)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mt-3 border-t border-gray-100 pt-3">
                <span className="text-xs font-medium text-gray-500 mb-2 block">
                  Channels ({device.channels.length})
                </span>

                {device.channels.length > 0 ? (
                  <div className="space-y-1">
                    {device.channels.map((ch) => (
                      <div key={ch.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${ch.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
                          <span className="text-sm text-gray-700 truncate">{ch.name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">{ch.phoneNumber}</span>
                        </div>
                        <Link
                          to="/channels/$channelId/settings"
                          params={{ channelId: ch.id }}
                          className="p-1 text-gray-300 hover:text-gray-600 transition-colors"
                        >
                          <Settings size={14} />
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No channels yet — channels appear when SMS messages arrive.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete device"
        description="This will permanently delete this device. Its channels will be unlinked but not deleted. This action cannot be undone."
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

    </div>
  )
}

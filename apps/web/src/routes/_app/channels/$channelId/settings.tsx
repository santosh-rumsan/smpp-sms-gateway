import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, ChevronUp, Globe, Info, Mail, Plus, Settings, Trash2, Users, X } from 'lucide-react'
import { useState } from 'react'

import { API_URL } from '../../../../lib/api'
import { getAccessToken } from '../../../../lib/auth-client'
import { useSession } from '../../../../lib/auth-client'
import { ConfirmDialog } from '../../../../components/confirm-dialog'

interface EmailForward {
  id: string
  channelId: string
  email: string
  createdAt: number
}

interface Webhook {
  id: string
  channelId: string
  url: string
  headers: Record<string, string> | null
  createdAt: number
}

interface ChannelData {
  id: string
  name: string
  phoneNumber: string
  description: string | null
  isActive: boolean
  device: { id: string; name: string } | null
}

interface ChannelPermission {
  id: string
  channelId: string
  userId: string
  permission: string
}

interface AppUser {
  id: string
  name: string
  email: string
  role: string
}

type Tab = 'general' | 'email' | 'webhooks' | 'access'

const ROLE_LABELS: Record<string, string> = {
  reader: 'Reader',
  sender: 'Sender',
  manager: 'Manager',
  // legacy values
  read: 'Reader',
  write: 'Sender',
  readwrite: 'Sender',
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  reader: 'Can only read SMS',
  sender: 'Can read and send SMS',
  manager: 'Can read, send, and manage channel settings',
}

export const Route = createFileRoute('/_app/channels/$channelId/settings')({
  component: ChannelSettingsPage,
})

function ChannelSettingsPage() {
  const { channelId } = Route.useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useSession()
  const user = session.data?.user

  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [name, setName] = useState('')
  const [nameLoaded, setNameLoaded] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [newWebhookHeaders, setNewWebhookHeaders] = useState<{ key: string; value: string }[]>([])
  const [deleteChannelOpen, setDeleteChannelOpen] = useState(false)
  const [deleteForwardTarget, setDeleteForwardTarget] = useState<EmailForward | null>(null)
  const [deleteWebhookTarget, setDeleteWebhookTarget] = useState<Webhook | null>(null)
  const [revokeUserTarget, setRevokeUserTarget] = useState<{ userId: string; userName: string } | null>(null)
  const [editingWebhookId, setEditingWebhookId] = useState<string | null>(null)
  const [editHeaders, setEditHeaders] = useState<{ key: string; value: string }[]>([])
  const [newUserRole, setNewUserRole] = useState<'reader' | 'sender' | 'manager'>('reader')

  const channelQuery = useQuery({
    queryKey: ['channel', channelId],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return res.json() as Promise<{ channel: ChannelData; messageCount: number; permission: string }>
    },
  })

  if (channelQuery.data && !nameLoaded) {
    setName(channelQuery.data.channel.name)
    setNameLoaded(true)
  }

  const isAdmin = user?.role.split(',').includes('admin') ?? false
  const myPermission = channelQuery.data?.permission
  const canManage = isAdmin || myPermission === 'manager'

  const tabs: { key: Tab; label: string; icon: typeof Settings }[] = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'email', label: 'Email Forwarding', icon: Mail },
    { key: 'webhooks', label: 'Webhooks', icon: Globe },
    ...(isAdmin ? [{ key: 'access' as Tab, label: 'User Access', icon: Users }] : []),
  ]

  const forwardsQuery = useQuery({
    queryKey: ['channel', channelId, 'email-forwards'],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}/email-forwards`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return res.json() as Promise<{ emailForwards: EmailForward[] }>
    },
    enabled: canManage,
  })

  const webhooksQuery = useQuery({
    queryKey: ['channel', channelId, 'webhooks'],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}/webhooks`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return res.json() as Promise<{ webhooks: Webhook[] }>
    },
    enabled: canManage,
  })

  const permissionsQuery = useQuery({
    queryKey: ['channel', channelId, 'permissions'],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}/permissions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return res.json() as Promise<{ permissions: ChannelPermission[] }>
    },
    enabled: isAdmin,
  })

  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json() as Promise<{ users: AppUser[] }>
    },
    enabled: isAdmin,
  })

  const updateNameMutation = useMutation({
    mutationFn: async (newName: string) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newName }),
      })
      if (!res.ok) throw new Error('Failed to update channel')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['channel', channelId] })
      void queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })

  const addForwardMutation = useMutation({
    mutationFn: async (email: string) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}/email-forwards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email }),
      })
      if (res.status === 409) throw new Error('This email is already added')
      if (!res.ok) throw new Error('Failed to add email')
    },
    onSuccess: () => {
      setNewEmail('')
      void queryClient.invalidateQueries({ queryKey: ['channel', channelId, 'email-forwards'] })
    },
  })

  const deleteForwardMutation = useMutation({
    mutationFn: async (forwardId: string) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}/email-forwards/${forwardId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to delete email forward')
    },
    onSuccess: () => {
      setDeleteForwardTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['channel', channelId, 'email-forwards'] })
    },
  })

  const addWebhookMutation = useMutation({
    mutationFn: async ({ url, headers }: { url: string; headers?: Record<string, string> }) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url, headers }),
      })
      if (res.status === 409) throw new Error('This webhook URL is already added')
      if (res.status === 400) {
        const data = await res.json() as { error?: string }
        throw new Error(data.error || 'Failed to add webhook')
      }
      if (!res.ok) throw new Error('Failed to add webhook')
    },
    onSuccess: () => {
      setNewWebhookUrl('')
      setNewWebhookHeaders([])
      void queryClient.invalidateQueries({ queryKey: ['channel', channelId, 'webhooks'] })
    },
  })

  const updateWebhookMutation = useMutation({
    mutationFn: async ({ webhookId, headers }: { webhookId: string; headers?: Record<string, string> }) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}/webhooks/${webhookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ headers }),
      })
      if (!res.ok) throw new Error('Failed to update webhook')
    },
    onSuccess: () => {
      setEditingWebhookId(null)
      setEditHeaders([])
      void queryClient.invalidateQueries({ queryKey: ['channel', channelId, 'webhooks'] })
    },
  })

  const deleteWebhookMutation = useMutation({
    mutationFn: async (webhookId: string) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to delete webhook')
    },
    onSuccess: () => {
      setDeleteWebhookTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['channel', channelId, 'webhooks'] })
    },
  })

  const deleteChannelMutation = useMutation({
    mutationFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to delete channel')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['channels'] })
      navigate({ to: '/channels' })
    },
  })

  const grantPermissionMutation = useMutation({
    mutationFn: async ({ userId, permission }: { userId: string; permission: string }) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, permission }),
      })
      if (!res.ok) throw new Error('Failed to grant permission')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['channel', channelId, 'permissions'] })
    },
  })

  const revokePermissionMutation = useMutation({
    mutationFn: async (userId: string) => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels/${channelId}/permissions/${userId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to revoke permission')
    },
    onSuccess: () => {
      setRevokeUserTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['channel', channelId, 'permissions'] })
    },
  })

  if (channelQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  const channel = channelQuery.data?.channel

  if (!channel) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Channel not found</p>
      </div>
    )
  }

  if (!canManage) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">You don't have permission to access this page.</p>
      </div>
    )
  }

  const forwards = forwardsQuery.data?.emailForwards ?? []
  const webhooks = webhooksQuery.data?.webhooks ?? []
  const permissions = permissionsQuery.data?.permissions ?? []
  const allUsers = (usersQuery.data?.users ?? []).filter((u) => u.role !== 'admin')
  const assignedUserIds = new Set(permissions.map((p) => p.userId))
  const unassignedUsers = allUsers.filter((u) => !assignedUserIds.has(u.id))

  function headersArrayToRecord(arr: { key: string; value: string }[]): Record<string, string> | undefined {
    const filtered = arr.filter((h) => h.key.trim())
    if (filtered.length === 0) return undefined
    return Object.fromEntries(filtered.map((h) => [h.key.trim(), h.value]))
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/channels/$channelId"
          params={{ channelId }}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a]">Channel Settings</h1>
          <p className="text-sm text-gray-400">{channel.phoneNumber}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Channel Info
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
                placeholder="Channel name"
              />
              <button
                onClick={() => updateNameMutation.mutate(name)}
                disabled={updateNameMutation.isPending || name === channel.name || !name.trim()}
                className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {updateNameMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
            {updateNameMutation.isSuccess && (
              <p className="text-xs text-green-600 mt-2">Name updated successfully</p>
            )}
            {updateNameMutation.isError && (
              <p className="text-xs text-red-500 mt-2">Failed to update name</p>
            )}
          </section>

          {isAdmin && (
            <section className="rounded-xl border border-red-200 p-5">
              <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-4">
                Danger Zone
              </h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Delete this channel</p>
                  <p className="text-xs text-gray-400">
                    This will permanently delete the channel and all its messages.
                  </p>
                </div>
                <button
                  onClick={() => setDeleteChannelOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Email Forwarding Tab */}
      {activeTab === 'email' && (
        <section className="rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mail size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Email Forwarding
            </h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Inbound SMS messages on this channel will be forwarded to these email addresses.
          </p>

          {forwards.length > 0 && (
            <div className="space-y-2 mb-4">
              {forwards.map((fwd) => (
                <div
                  key={fwd.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                >
                  <span className="text-sm text-gray-700">{fwd.email}</span>
                  <button
                    onClick={() => setDeleteForwardTarget(fwd)}
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (newEmail.trim()) addForwardMutation.mutate(newEmail.trim())
            }}
            className="flex gap-3"
          >
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
              placeholder="email@example.com"
            />
            <button
              type="submit"
              disabled={addForwardMutation.isPending || !newEmail.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={14} />
              Add
            </button>
          </form>
          {addForwardMutation.isError && (
            <p className="text-xs text-red-500 mt-2">
              {addForwardMutation.error?.message ?? 'Failed to add email'}
            </p>
          )}
        </section>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          {/* Webhook List & Add */}
          <section className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Globe size={16} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Webhooks
              </h2>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              You can add up to 3 webhooks. Webhook failures will not affect SMS processing.
            </p>

            {webhooks.length > 0 && (
              <div className="space-y-3 mb-4">
                {webhooks.map((wh) => {
                  const isEditing = editingWebhookId === wh.id
                  const headerCount = wh.headers ? Object.keys(wh.headers).length : 0
                  return (
                    <div key={wh.id} className="rounded-lg border border-gray-100 overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-gray-700 truncate block">{wh.url}</span>
                          {headerCount > 0 && !isEditing && (
                            <span className="text-xs text-gray-400">
                              {headerCount} custom header{headerCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              if (isEditing) {
                                setEditingWebhookId(null)
                                setEditHeaders([])
                              } else {
                                setEditingWebhookId(wh.id)
                                const existing = wh.headers
                                  ? Object.entries(wh.headers).map(([key, value]) => ({ key, value }))
                                  : []
                                setEditHeaders(existing)
                              }
                            }}
                            className="p-1 text-gray-300 hover:text-gray-600 transition-colors"
                            title="Edit headers"
                          >
                            {isEditing ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            onClick={() => setDeleteWebhookTarget(wh)}
                            className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="border-t border-gray-100 px-3 py-3 bg-gray-50/50">
                          <p className="text-xs font-medium text-gray-500 mb-2">Custom Headers</p>
                          {editHeaders.map((h, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                              <input
                                type="text"
                                value={h.key}
                                onChange={(e) => {
                                  const updated = [...editHeaders]
                                  updated[i] = { ...updated[i], key: e.target.value }
                                  setEditHeaders(updated)
                                }}
                                className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-accent-300"
                                placeholder="Header name"
                              />
                              <input
                                type="text"
                                value={h.value}
                                onChange={(e) => {
                                  const updated = [...editHeaders]
                                  updated[i] = { ...updated[i], value: e.target.value }
                                  setEditHeaders(updated)
                                }}
                                className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-accent-300"
                                placeholder="Header value"
                              />
                              <button
                                onClick={() => setEditHeaders(editHeaders.filter((_, j) => j !== i))}
                                className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => setEditHeaders([...editHeaders, { key: '', value: '' }])}
                              className="text-xs text-accent-500 hover:text-accent-600 font-medium"
                            >
                              + Add header
                            </button>
                            <div className="flex-1" />
                            <button
                              onClick={() => {
                                setEditingWebhookId(null)
                                setEditHeaders([])
                              }}
                              className="rounded px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                updateWebhookMutation.mutate({
                                  webhookId: wh.id,
                                  headers: headersArrayToRecord(editHeaders),
                                })
                              }}
                              disabled={updateWebhookMutation.isPending}
                              className="rounded bg-accent-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-600 disabled:opacity-50 transition-colors"
                            >
                              {updateWebhookMutation.isPending ? 'Saving...' : 'Save Headers'}
                            </button>
                          </div>
                          {updateWebhookMutation.isError && (
                            <p className="text-xs text-red-500 mt-2">Failed to update headers</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {webhooks.length < 3 && (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
                    placeholder="https://example.com/webhook"
                  />
                  <button
                    onClick={() => {
                      if (newWebhookUrl.trim()) {
                        addWebhookMutation.mutate({
                          url: newWebhookUrl.trim(),
                          headers: headersArrayToRecord(newWebhookHeaders),
                        })
                      }
                    }}
                    disabled={addWebhookMutation.isPending || !newWebhookUrl.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>

                {newWebhookHeaders.length > 0 && (
                  <div className="pl-1 space-y-2">
                    <p className="text-xs font-medium text-gray-500">Custom Headers</p>
                    {newWebhookHeaders.map((h, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={h.key}
                          onChange={(e) => {
                            const updated = [...newWebhookHeaders]
                            updated[i] = { ...updated[i], key: e.target.value }
                            setNewWebhookHeaders(updated)
                          }}
                          className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-accent-300"
                          placeholder="Header name"
                        />
                        <input
                          type="text"
                          value={h.value}
                          onChange={(e) => {
                            const updated = [...newWebhookHeaders]
                            updated[i] = { ...updated[i], value: e.target.value }
                            setNewWebhookHeaders(updated)
                          }}
                          className="flex-1 rounded border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-accent-300"
                          placeholder="Header value"
                        />
                        <button
                          onClick={() => setNewWebhookHeaders(newWebhookHeaders.filter((_, j) => j !== i))}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setNewWebhookHeaders([...newWebhookHeaders, { key: '', value: '' }])}
                  className="text-xs text-accent-500 hover:text-accent-600 font-medium"
                >
                  + Add header
                </button>
              </div>
            )}

            {webhooks.length >= 3 && (
              <p className="text-xs text-gray-400">Maximum of 3 webhooks reached.</p>
            )}

            {addWebhookMutation.isError && (
              <p className="text-xs text-red-500 mt-2">
                {addWebhookMutation.error?.message ?? 'Failed to add webhook'}
              </p>
            )}
          </section>

          {/* Payload Documentation */}
          <section className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Info size={16} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Webhook Payload
              </h2>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              When an SMS is received, a <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">POST</code> request is sent to each webhook URL with the following JSON body:
            </p>
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-x-auto font-mono text-gray-600 leading-relaxed">{`{
  "event": "sms.received",
  "channelId": "abc123",
  "channelName": "My Channel",
  "channelPhone": "+1234567890",
  "from": "+9876543210",
  "content": "Hello, this is a test message",
  "receivedAt": "2025-01-15T10:30:00.000Z"
}`}</pre>
            <p className="text-xs text-gray-400 mt-3">
              The default <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">Content-Type</code> header is <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">application/json</code>. You can add custom headers below (e.g. for authentication).
            </p>
          </section>
        </div>
      )}

      {/* User Access Tab — admin only */}
      {activeTab === 'access' && isAdmin && (
        <section className="rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              User Access
            </h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Manage which users can access this channel and their permission level.
          </p>

          {/* Role legend */}
          <div className="flex flex-wrap gap-2 mb-5">
            {(['reader', 'sender', 'manager'] as const).map((role) => (
              <div key={role} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${
                  role === 'reader' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  role === 'sender' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  'bg-green-50 text-green-700 border-green-200'
                }`}>
                  {ROLE_LABELS[role]}
                </span>
                <span>{ROLE_DESCRIPTIONS[role]}</span>
              </div>
            ))}
          </div>

          {permissions.length > 0 && (
            <div className="space-y-2 mb-4">
              {permissions.map((perm) => {
                const permUser = allUsers.find((u) => u.id === perm.userId)
                return (
                  <div
                    key={perm.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="text-sm text-gray-700 truncate block">
                        {permUser?.name || permUser?.email || perm.userId}
                      </span>
                      {permUser?.name && (
                        <span className="text-xs text-gray-400">{permUser.email}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={perm.permission}
                        onChange={(e) =>
                          grantPermissionMutation.mutate({
                            userId: perm.userId,
                            permission: e.target.value,
                          })
                        }
                        className="rounded border border-gray-200 px-2 py-1 text-xs outline-none focus:border-accent-300"
                      >
                        <option value="reader">Reader</option>
                        <option value="sender">Sender</option>
                        <option value="manager">Manager</option>
                      </select>
                      <button
                        onClick={() =>
                          setRevokeUserTarget({
                            userId: perm.userId,
                            userName: permUser?.name || permUser?.email || perm.userId,
                          })
                        }
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {unassignedUsers.length > 0 ? (
            <div className="flex gap-2">
              <select
                id="add-user-select"
                defaultValue=""
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300 bg-white"
              >
                <option value="" disabled>
                  Select a user...
                </option>
                {unassignedUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as 'reader' | 'sender' | 'manager')}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300 bg-white"
              >
                <option value="reader">Reader</option>
                <option value="sender">Sender</option>
                <option value="manager">Manager</option>
              </select>
              <button
                onClick={() => {
                  const select = document.getElementById('add-user-select') as HTMLSelectElement
                  if (select?.value) {
                    grantPermissionMutation.mutate({
                      userId: select.value,
                      permission: newUserRole,
                    })
                    select.value = ''
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 transition-colors"
              >
                <Plus size={14} />
                Add
              </button>
            </div>
          ) : permissions.length === 0 ? (
            <p className="text-xs text-gray-400">No users available to assign.</p>
          ) : (
            <p className="text-xs text-gray-400">All users are assigned to this channel.</p>
          )}
        </section>
      )}

      <ConfirmDialog
        open={deleteChannelOpen}
        title="Delete channel"
        description={`This will permanently delete "${channel.name}" and all its messages. This action cannot be undone.`}
        onConfirm={() => deleteChannelMutation.mutate()}
        onCancel={() => setDeleteChannelOpen(false)}
      />

      <ConfirmDialog
        open={deleteForwardTarget !== null}
        title="Remove email forward"
        description={`Remove forwarding to "${deleteForwardTarget?.email ?? ''}"? Inbound SMS will no longer be sent to this address.`}
        confirmLabel="Remove"
        onConfirm={() => deleteForwardTarget && deleteForwardMutation.mutate(deleteForwardTarget.id)}
        onCancel={() => setDeleteForwardTarget(null)}
      />

      <ConfirmDialog
        open={deleteWebhookTarget !== null}
        title="Remove webhook"
        description={`Remove webhook "${deleteWebhookTarget?.url ?? ''}"? Incoming SMS will no longer be sent to this URL.`}
        confirmLabel="Remove"
        onConfirm={() => deleteWebhookTarget && deleteWebhookMutation.mutate(deleteWebhookTarget.id)}
        onCancel={() => setDeleteWebhookTarget(null)}
      />

      <ConfirmDialog
        open={revokeUserTarget !== null}
        title="Remove user access"
        description={`Remove access for "${revokeUserTarget?.userName ?? ''}"? They will no longer be able to view or send messages on this channel.`}
        confirmLabel="Remove"
        onConfirm={() => {
          if (revokeUserTarget) revokePermissionMutation.mutate(revokeUserTarget.userId)
        }}
        onCancel={() => setRevokeUserTarget(null)}
      />
    </div>
  )
}

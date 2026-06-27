import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ClipboardList, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState, useMemo } from 'react'

import { API_URL } from '../../../lib/api'
import { getAccessToken } from '../../../lib/auth-client'
import { ConfirmDialog } from '../../../components/confirm-dialog'

function truncateUrl(url: string, maxLen = 50): string {
  if (url.length <= maxLen) return url
  return url.slice(0, maxLen) + '…'
}

function isValidUrl(s: string): boolean {
  try {
    new URL(s)
    return true
  } catch {
    return false
  }
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

type ValidationErrors = Record<string, string>

export const Route = createFileRoute('/_app/admin/email-transports')({
  component: EmailTransportsPage,
})

type TransportType = 'api' | 'smtp' | 'cloudflare'

interface EmailTransport {
  id: string
  name: string
  type: TransportType
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

const TRANSPORT_LABELS: Record<TransportType, string> = {
  api: 'API',
  smtp: 'SMTP',
  cloudflare: 'Cloudflare',
}

function isValidJson(s: string): boolean {
  if (!s.trim()) return true
  try {
    const parsed = JSON.parse(s)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
  } catch {
    return false
  }
}

const DEFAULT_CONFIGS: Record<TransportType, Record<string, unknown>> = {
  api: { url: '', headers: {}, payloadOverrides: '' },
  smtp: {
    host: '',
    port: 587,
    secure: true,
    username: '',
    password: '',
    fromEmail: '',
    fromName: 'SMS Gateway',
  },
  cloudflare: {
    fromEmail: '',
    fromName: 'SMS Gateway',
    destinationAddress: '',
  },
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function EmailTransportsPage() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmailTransport | null>(null)
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<TransportType>('api')
  const [formConfig, setFormConfig] = useState<Record<string, unknown>>(
    DEFAULT_CONFIGS.api,
  )

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'email-transports'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/email-transports`, {
        headers: authHeaders(),
      })
      return res.json() as Promise<{ transports: EmailTransport[] }>
    },
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_URL}/admin/email-transports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          name: formName,
          type: formType,
          config: formConfig,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Failed to create transport')
      }
    },
    onSuccess: () => {
      resetForm()
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'email-transports'],
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, config }: { id: string; name: string; config: Record<string, unknown> }) => {
      const res = await fetch(`${API_URL}/admin/email-transports/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name, config }),
      })
      if (!res.ok) throw new Error('Failed to update transport')
    },
    onSuccess: () => {
      setEditingId(null)
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'email-transports'],
      })
    },
  })

  const activateMutation = useMutation({
    mutationFn: async ({ id, activate }: { id: string; activate: boolean }) => {
      const endpoint = activate ? 'activate' : 'deactivate'
      const res = await fetch(
        `${API_URL}/admin/email-transports/${id}/${endpoint}`,
        { method: 'POST', headers: authHeaders() },
      )
      if (!res.ok) throw new Error(`Failed to ${endpoint} transport`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'email-transports'],
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_URL}/admin/email-transports/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || 'Failed to delete transport')
      }
    },
    onSuccess: () => {
      setDeleteTarget(null)
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'email-transports'],
      })
    },
  })

  function resetForm() {
    setShowForm(false)
    setFormName('')
    setFormType('api')
    setFormConfig(DEFAULT_CONFIGS.api)
  }

  function startEdit(transport: EmailTransport) {
    setEditingId(transport.id)
    setFormName(transport.name)
    setFormType(transport.type)
    setFormConfig(transport.config)
  }

  const transports = data?.transports ?? []

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Email Transports</h1>
          <Link
            to="/admin/email-logs"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <ClipboardList size={14} /> Email Logs
          </Link>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowForm(true)
          }}
          className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-sm font-medium text-white hover:bg-accent-600 transition-colors"
        >
          <Plus size={14} /> Add Transport
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Configure how email forwards are sent. Only one transport can be active
        at a time.
      </p>

      {showForm && (
        <TransportForm
          name={formName}
          type={formType}
          config={formConfig}
          onNameChange={setFormName}
          onTypeChange={(t) => {
            setFormType(t)
            setFormConfig(DEFAULT_CONFIGS[t])
          }}
          onConfigChange={setFormConfig}
          onSave={() => createMutation.mutate()}
          onCancel={resetForm}
          isPending={createMutation.isPending}
          error={createMutation.error?.message}
          isNew
        />
      )}

      {isLoading ? (
        <p className="text-gray-400">Loading...</p>
      ) : transports.length > 0 ? (
        <div className="space-y-4">
          {transports.map((transport) => (
            <div
              key={transport.id}
              className={`rounded-xl border-2 px-6 py-5 shadow-sm transition-colors ${
                transport.isActive
                  ? 'border-green-300 bg-green-50/40'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {editingId === transport.id ? (
                <div>
                  <TransportForm
                    name={formName}
                    type={formType}
                    config={formConfig}
                    onNameChange={setFormName}
                    onTypeChange={() => {}}
                    onConfigChange={setFormConfig}
                    onSave={() =>
                      updateMutation.mutate({
                        id: transport.id,
                        name: formName,
                        config: formConfig,
                      })
                    }
                    onCancel={() => setEditingId(null)}
                    isPending={updateMutation.isPending}
                    error={updateMutation.error?.message}
                    isNew={false}
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <h3 className="font-semibold text-gray-800">
                        {transport.name}
                      </h3>
                      <span className="rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {TRANSPORT_LABELS[transport.type]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          activateMutation.mutate({
                            id: transport.id,
                            activate: !transport.isActive,
                          })
                        }
                        disabled={activateMutation.isPending}
                        style={{
                          backgroundColor: transport.isActive ? '#22c55e' : '#ef4444',
                        }}
                        className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out disabled:opacity-50"
                        role="switch"
                        aria-checked={transport.isActive}
                        title={transport.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <span
                          className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out"
                          style={{
                            marginTop: '4px',
                            transform: transport.isActive ? 'translateX(22px)' : 'translateX(4px)',
                          }}
                        />
                      </button>
                      <button
                        onClick={() => startEdit(transport)}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(transport)}
                        disabled={transport.isActive}
                        className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={
                          transport.isActive
                            ? 'Deactivate before deleting'
                            : 'Delete'
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <ConfigSummary type={transport.type} config={transport.config} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400">No email transports configured.</p>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete email transport"
        description={`This will permanently delete "${deleteTarget?.name ?? ''}". This action cannot be undone.`}
        onConfirm={() =>
          deleteTarget && deleteMutation.mutate(deleteTarget.id)
        }
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function ConfigSummary({
  type,
  config,
}: {
  type: TransportType
  config: Record<string, unknown>
}) {
  const items: { label: string; value: string; full?: string }[] = []

  if (type === 'api') {
    const url = (config.url as string) || '-'
    items.push({ label: 'URL', value: truncateUrl(url), full: url })
    const overrides = (config.payloadOverrides as string) || ''
    if (overrides.trim()) {
      try {
        const keys = Object.keys(JSON.parse(overrides))
        if (keys.length > 0) items.push({ label: 'Overrides', value: keys.join(', ') })
      } catch { /* skip */ }
    }
  } else if (type === 'smtp') {
    items.push({
      label: 'Server',
      value: `${config.host}:${config.port}`,
    })
    items.push({ label: 'From', value: (config.fromEmail as string) || '-' })
  } else if (type === 'cloudflare') {
    items.push({
      label: 'From',
      value: (config.fromEmail as string) || '-',
    })
    const dest = (config.destinationAddress as string) || '-'
    items.push({
      label: 'Destination',
      value: truncateUrl(dest),
      full: dest,
    })
  }

  return (
    <div className="mt-3 space-y-1.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-2 text-xs">
          <span className="font-medium text-gray-500 shrink-0">{item.label}</span>
          <span
            className="text-gray-400 font-mono truncate"
            title={item.full && item.full !== item.value ? item.full : undefined}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function validateTransportForm(
  name: string,
  type: TransportType,
  config: Record<string, unknown>,
): ValidationErrors {
  const errors: ValidationErrors = {}

  if (!name.trim()) errors.name = 'Transport name is required'

  if (type === 'api') {
    const url = (config.url as string) || ''
    if (!url.trim()) errors.url = 'API URL is required'
    else if (!isValidUrl(url)) errors.url = 'Must be a valid URL'
    const overrides = (config.payloadOverrides as string) || ''
    if (overrides.trim() && !isValidJson(overrides)) errors.payloadOverrides = 'Must be valid JSON object'
  } else if (type === 'smtp') {
    if (!(config.host as string)?.trim()) errors.host = 'SMTP host is required'
    if (!(config.username as string)?.trim()) errors.username = 'Username is required'
    if (!(config.password as string)?.trim()) errors.password = 'Password is required'
    const fromEmail = (config.fromEmail as string) || ''
    if (!fromEmail.trim()) errors.fromEmail = 'From email is required'
    else if (!isValidEmail(fromEmail)) errors.fromEmail = 'Must be a valid email'
  } else if (type === 'cloudflare') {
    const fromEmail = (config.fromEmail as string) || ''
    if (!fromEmail.trim()) errors.fromEmail = 'From email is required'
    else if (!isValidEmail(fromEmail)) errors.fromEmail = 'Must be a valid email'
    const dest = (config.destinationAddress as string) || ''
    if (!dest.trim()) errors.destinationAddress = 'Destination email is required'
    else if (!isValidEmail(dest)) errors.destinationAddress = 'Must be a valid email'
  }

  return errors
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null
  return <p className="text-xs text-red-500 mt-0.5">{error}</p>
}

function inputClass(hasError: boolean) {
  return `rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${
    hasError
      ? 'border-red-300 focus:border-red-400'
      : 'border-gray-200 focus:border-accent-300'
  }`
}

function TransportForm({
  name,
  type,
  config,
  onNameChange,
  onTypeChange,
  onConfigChange,
  onSave,
  onCancel,
  isPending,
  error,
  isNew,
}: {
  name: string
  type: TransportType
  config: Record<string, unknown>
  onNameChange: (v: string) => void
  onTypeChange: (t: TransportType) => void
  onConfigChange: (c: Record<string, unknown>) => void
  onSave: () => void
  onCancel: () => void
  isPending: boolean
  error?: string
  isNew: boolean
}) {
  const [submitted, setSubmitted] = useState(false)
  const setField = (key: string, value: unknown) =>
    onConfigChange({ ...config, [key]: value })

  const errors = useMemo(
    () => (submitted ? validateTransportForm(name, type, config) : {}),
    [submitted, name, type, config],
  )
  const hasErrors = Object.keys(errors).length > 0

  function handleSave() {
    setSubmitted(true)
    const errs = validateTransportForm(name, type, config)
    if (Object.keys(errs).length > 0) return
    onSave()
  }

  return (
    <div className={isNew ? 'mb-6 rounded-xl border-2 border-gray-200 p-5 space-y-4' : 'space-y-4'}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <input
            placeholder="Transport name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className={`w-full ${inputClass(!!errors.name)}`}
          />
          <FieldError error={errors.name} />
        </div>
        {isNew ? (
          <select
            value={type}
            onChange={(e) => onTypeChange(e.target.value as TransportType)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300 bg-white"
          >
            <option value="api">API (HTTP POST)</option>
            <option value="smtp">SMTP</option>
            <option value="cloudflare">Cloudflare Email</option>
          </select>
        ) : (
          <div className="flex items-center rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500">
            {TRANSPORT_LABELS[type]}
          </div>
        )}
      </div>

      {type === 'api' && (
        <div className="space-y-3">
          <div>
            <input
              placeholder="API URL (e.g. https://email-service.com/send)"
              value={(config.url as string) || ''}
              onChange={(e) => setField('url', e.target.value)}
              className={`w-full ${inputClass(!!errors.url)}`}
            />
            <FieldError error={errors.url} />
          </div>
          <HeadersEditor
            headers={(config.headers as Record<string, string>) ?? {}}
            onChange={(h) => setField('headers', h)}
          />
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500">Payload Overrides</span>
              <span className="text-[10px] text-gray-400">JSON — overrides: fromName, to, subject, html</span>
            </div>
            <textarea
              placeholder='e.g. {"fromName": "Cool Dude", "subject": "Custom Subject"}'
              value={(config.payloadOverrides as string) || ''}
              onChange={(e) => setField('payloadOverrides', e.target.value)}
              rows={3}
              className={`w-full font-mono text-xs ${inputClass(!!errors.payloadOverrides)}`}
            />
            <FieldError error={errors.payloadOverrides} />
          </div>
        </div>
      )}

      {type === 'smtp' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <input
                placeholder="SMTP Host"
                value={(config.host as string) || ''}
                onChange={(e) => setField('host', e.target.value)}
                className={`w-full ${inputClass(!!errors.host)}`}
              />
              <FieldError error={errors.host} />
            </div>
            <input
              placeholder="Port"
              type="number"
              value={(config.port as number) || 587}
              onChange={(e) => setField('port', Number(e.target.value))}
              className={inputClass(false)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                placeholder="Username"
                value={(config.username as string) || ''}
                onChange={(e) => setField('username', e.target.value)}
                className={`w-full ${inputClass(!!errors.username)}`}
              />
              <FieldError error={errors.username} />
            </div>
            <div>
              <input
                placeholder="Password"
                type="password"
                value={(config.password as string) || ''}
                onChange={(e) => setField('password', e.target.value)}
                className={`w-full ${inputClass(!!errors.password)}`}
              />
              <FieldError error={errors.password} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <input
                placeholder="From email"
                value={(config.fromEmail as string) || ''}
                onChange={(e) => setField('fromEmail', e.target.value)}
                className={`w-full ${inputClass(!!errors.fromEmail)}`}
              />
              <FieldError error={errors.fromEmail} />
            </div>
            <input
              placeholder="From name (default: SMS Gateway)"
              value={(config.fromName as string) || ''}
              onChange={(e) => setField('fromName', e.target.value)}
              className={`w-full ${inputClass(false)}`}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={(config.secure as boolean) ?? true}
              onChange={(e) => setField('secure', e.target.checked)}
              className="rounded"
            />
            Use TLS/SSL
          </label>
        </div>
      )}

      {type === 'cloudflare' && (
        <div className="space-y-3">
          <div>
            <input
              placeholder="From email"
              value={(config.fromEmail as string) || ''}
              onChange={(e) => setField('fromEmail', e.target.value)}
              className={`w-full ${inputClass(!!errors.fromEmail)}`}
            />
            <FieldError error={errors.fromEmail} />
          </div>
          <input
            placeholder="From name (default: SMS Gateway)"
            value={(config.fromName as string) || ''}
            onChange={(e) => setField('fromName', e.target.value)}
            className={`w-full ${inputClass(false)}`}
          />
          <div>
            <input
              placeholder="Destination address (verified email)"
              value={(config.destinationAddress as string) || ''}
              onChange={(e) => setField('destinationAddress', e.target.value)}
              className={`w-full ${inputClass(!!errors.destinationAddress)}`}
            />
            <FieldError error={errors.destinationAddress} />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isPending || (submitted && hasErrors)}
          className="flex items-center gap-1.5 rounded-lg bg-[#1a1a1a] px-4 py-2 text-sm text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Check size={14} />
          {isPending ? 'Saving...' : isNew ? 'Create' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  )
}

function HeadersEditor({
  headers,
  onChange,
}: {
  headers: Record<string, string>
  onChange: (h: Record<string, string>) => void
}) {
  const entries = Object.entries(headers)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  return (
    <div className="space-y-3">
      <span className="text-xs font-medium text-gray-500">
        Custom Headers
      </span>
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <span className="text-xs text-gray-600 font-mono bg-gray-50 rounded px-2 py-1.5">
            {key}: {value}
          </span>
          <button
            onClick={() => {
              const next = { ...headers }
              delete next[key]
              onChange(next)
            }}
            className="p-1 text-gray-300 hover:text-red-500"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          placeholder="Header name"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-accent-300"
        />
        <input
          placeholder="Header value"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-accent-300"
        />
        <button
          onClick={() => {
            if (newKey.trim() && newValue.trim()) {
              onChange({ ...headers, [newKey.trim()]: newValue.trim() })
              setNewKey('')
              setNewValue('')
            }
          }}
          disabled={!newKey.trim() || !newValue.trim()}
          className="rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-50"
        >
          <Plus size={12} />
        </button>
      </div>
    </div>
  )
}

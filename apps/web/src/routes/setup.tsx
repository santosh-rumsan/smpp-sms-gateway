import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Check, Copy, Loader2, ShieldAlert } from 'lucide-react'

import { api, API_URL } from '../lib/api'
import { authClient, getAccessToken, type AuthUser } from '../lib/auth-client'

export const Route = createFileRoute('/setup')({
  beforeLoad: async () => {
    const setupRes = await api.setup.status.$get()
    const setupData = await setupRes.json()

    if (setupData.setupComplete) {
      throw redirect({ to: '/channels' })
    }

    const session = await authClient.getSession()
    if (!session.data?.user) {
      throw redirect({ to: '/login' })
    }

    return { user: session.data.user }
  },
  component: SetupPage,
})

const STEPS = [
  'Add Device',
  'API Key',
  'Configure',
  'Start Gateway',
  'Send Message',
]

function SetupPage() {
  const { user } = Route.useRouteContext()
  if (!user.role.split(',').includes('admin')) return <NotAdmin user={user} />
  return <SetupWizard />
}

// ── Not Admin ───────────────────────────────────────────────────────────────

function NotAdmin({ user }: { user: AuthUser }) {
  const handleSignOut = async () => {
    await authClient.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f0f0]">
      <div className="w-[440px] rounded-2xl bg-white p-10 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <ShieldAlert size={20} className="text-amber-600" />
          </div>
          <h1 className="text-2xl font-black text-[#1a1a1a]">Setup Required</h1>
        </div>

        <p className="mb-4 text-sm text-gray-500">
          This application needs to be set up by an <strong className="text-gray-700">admin</strong> before it can be used.
        </p>

        <div className="mb-6 rounded-xl bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-400">Signed in as</p>
          <p className="text-sm font-medium text-gray-700">{user.email}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            Role: <span className="text-gray-500">{user.role}</span>
          </p>
        </div>

        <p className="mb-6 text-sm text-gray-400">
          Please ask an admin to sign in and complete the initial setup, or contact your RS Office administrator to update your role.
        </p>

        <button
          onClick={handleSignOut}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

// ── Setup Wizard ────────────────────────────────────────────────────────────

function SetupWizard() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [deviceId, setDeviceId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')

  const handleComplete = async () => {
    setCompleting(true)
    setError('')
    try {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const body = await res.json()
        setError((body as { error?: string }).error ?? 'Setup failed')
        return
      }
      navigate({ to: '/channels' })
    } catch {
      setError('Setup failed. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f0f0]">
      <div className="w-[560px] rounded-2xl bg-white p-10 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1a1a]">
            <span className="text-xs font-bold text-white">SMS</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1a1a1a]">{STEPS[step]}</h1>
            <p className="text-xs text-gray-400">Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>

        <div className="mb-8 flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#1a1a1a]' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {step === 0 && (
          <AddDeviceStep
            onComplete={(id) => {
              setDeviceId(id)
              setStep(1)
            }}
          />
        )}
        {step === 1 && (
          <CreateApiKeyStep
            onComplete={(key) => {
              setApiKey(key)
              setStep(2)
            }}
          />
        )}
        {step === 2 && <ConfigureStep apiKey={apiKey} onNext={() => setStep(3)} />}
        {step === 3 && <StartGatewayStep deviceId={deviceId} onNext={() => setStep(4)} />}
        {step === 4 && (
          <TestMessageStep
            deviceId={deviceId}
            onComplete={handleComplete}
            completing={completing}
            error={error}
          />
        )}
      </div>
    </div>
  )
}

// ── Step 1: Add Device ──────────────────────────────────────────────────────

function AddDeviceStep({ onComplete }: { onComplete: (deviceId: string) => void }) {
  const [form, setForm] = useState({
    name: '',
    smppHost: '',
    smppPort: '2775',
    smppSystemId: '',
    smppPassword: '',
    countryCode: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/setup/device`, {
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
      const data = (await res.json()) as { device: { id: string } }
      onComplete(data.device.id)
    } catch {
      setError('Failed to create device. Please check your inputs.')
    } finally {
      setSubmitting(false)
    }
  }

  const isValid = form.name && form.smppHost && form.smppPort && form.smppSystemId && form.smppPassword

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Add your GoIP device's SMPP connection details.
      </p>

      <div className="space-y-3 mb-6">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Device Name</label>
          <input
            placeholder="e.g., GoIP-4"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">SMPP Host</label>
            <input
              placeholder="e.g., 192.168.1.100"
              value={form.smppHost}
              onChange={(e) => setForm({ ...form, smppHost: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">SMPP Port</label>
            <input
              placeholder="2775"
              value={form.smppPort}
              onChange={(e) => setForm({ ...form, smppPort: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">System ID</label>
            <input
              placeholder="SMPP system ID"
              value={form.smppSystemId}
              onChange={(e) => setForm({ ...form, smppSystemId: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Password</label>
            <input
              type="password"
              placeholder="SMPP password"
              value={form.smppPassword}
              onChange={(e) => setForm({ ...form, smppPassword: e.target.value })}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">
            Country Code <span className="text-gray-300">(optional)</span>
          </label>
          <input
            placeholder="e.g., +977"
            value={form.countryCode}
            onChange={(e) => setForm({ ...form, countryCode: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!isValid || submitting}
        className="w-full rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-50"
      >
        {submitting ? 'Creating...' : 'Add Device & Continue'}
      </button>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

// ── Step 2: Create API Key ──────────────────────────────────────────────────

function CreateApiKeyStep({ onComplete }: { onComplete: (key: string) => void }) {
  const [name, setName] = useState('SMPP Gateway')
  const [submitting, setSubmitting] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleCreate = async () => {
    setSubmitting(true)
    setError('')
    try {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/setup/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create API key')
      const data = (await res.json()) as { key: string }
      setCreatedKey(data.key)
    } catch {
      setError('Failed to create API key.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Create an API key for the SMPP gateway to authenticate with the API.
      </p>

      {!createdKey ? (
        <>
          <div className="mb-4">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Key Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={!name || submitting}
            className="w-full rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create API Key'}
          </button>
        </>
      ) : (
        <>
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm font-medium text-amber-800">
              Save this key now — it won't be shown again.
            </p>
          </div>

          <div className="mb-6 flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-3">
            <code className="flex-1 font-mono text-xs break-all text-gray-700">{createdKey}</code>
            <CopyButton value={createdKey} />
          </div>

          <button
            onClick={() => onComplete(createdKey)}
            className="w-full rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
          >
            I've saved the key — Continue
          </button>
        </>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

// ── Step 3: Configure SMPP App ──────────────────────────────────────────────

function ConfigureStep({ apiKey, onNext }: { apiKey: string; onNext: () => void }) {
  const [copiedAll, setCopiedAll] = useState(false)

  const envLines = [
    { key: 'API_URL', value: API_URL },
    { key: 'API_KEY', value: apiKey },
    { key: 'HTTP_PORT', value: '9511' },
  ]

  const envContent = envLines.map((l) => `${l.key}=${l.value}`).join('\n')

  const handleCopyAll = () => {
    void navigator.clipboard.writeText(envContent)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 2000)
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Add these values to your{' '}
        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">apps/smpp/.env</code>{' '}
        file:
      </p>

      <div className="space-y-2 mb-3">
        {envLines.map(({ key, value }) => (
          <div key={key} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
            <code className="flex-1 font-mono text-sm break-all">
              <span className="text-gray-400">{key}=</span>
              <span className="text-gray-700">{value}</span>
            </code>
            <CopyButton value={`${key}=${value}`} />
          </div>
        ))}
      </div>

      <button
        onClick={handleCopyAll}
        className="mb-6 flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600"
      >
        <Copy size={12} />
        {copiedAll ? 'Copied!' : 'Copy all as .env'}
      </button>

      <button
        onClick={onNext}
        className="w-full rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333]"
      >
        I've configured the .env file
      </button>
    </div>
  )
}

// ── Step 4: Start Gateway ───────────────────────────────────────────────────

function StartGatewayStep({ deviceId, onNext }: { deviceId: string; onNext: () => void }) {
  const [status, setStatus] = useState<'checking' | 'running' | 'waiting'>('checking')
  const [gatewayConnected, setGatewayConnected] = useState(false)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const res = await api.setup['gateway-status'][':deviceId'].$get({
          param: { deviceId },
        })
        if (cancelled) return
        const data = await res.json()
        if (data.connected) {
          setStatus('running')
          setGatewayConnected(true)
        } else {
          setStatus('waiting')
        }
      } catch {
        if (!cancelled) setStatus('waiting')
      }
    }

    void check()
    const interval = setInterval(() => void check(), 3000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [deviceId])

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Start the SMPP gateway to connect to your GoIP device.
      </p>

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-3">
        <code className="flex-1 font-mono text-sm text-green-400">pnpm dev:smpp</code>
        <CopyButton value="pnpm dev:smpp" dark />
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          {status === 'checking' && <Loader2 size={16} className="animate-spin text-gray-400" />}
          {status === 'running' && <div className="h-2.5 w-2.5 rounded-full bg-green-400" />}
          {status === 'waiting' && <div className="h-2.5 w-2.5 rounded-full bg-gray-300 animate-pulse" />}
          <span className="text-sm font-medium text-gray-700">
            {status === 'checking' && 'Detecting SMPP Gateway...'}
            {status === 'running' && 'SMPP Gateway is running'}
            {status === 'waiting' && 'Waiting for SMPP Gateway...'}
          </span>
        </div>

        {status === 'running' && (
          <div className="mt-2 ml-[22px] flex items-center gap-2">
            <div
              className={`h-1.5 w-1.5 rounded-full ${gatewayConnected ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`}
            />
            <span className="text-xs text-gray-500">
              {gatewayConnected ? 'Device connected' : 'Connecting to device...'}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={status !== 'running'}
        className="w-full rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-50"
      >
        Continue
      </button>

      {status !== 'running' && (
        <button
          onClick={onNext}
          className="mt-2 w-full py-2 text-center text-xs text-gray-400 hover:text-gray-600"
        >
          Skip — I'll start it later
        </button>
      )}
    </div>
  )
}

// ── Step 5: Send Test Message ───────────────────────────────────────────────

function TestMessageStep({
  deviceId,
  onComplete,
  completing,
  error: completeError,
}: {
  deviceId: string
  onComplete: () => void
  completing: boolean
  error: string
}) {
  const [form, setForm] = useState({
    phoneNumber: '',
    contactNumber: '',
    content: 'Hello! This is a test message from SMPP SMS Gateway.',
  })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [messageId, setMessageId] = useState<string | null>(null)
  const [messageStatus, setMessageStatus] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleSend = async () => {
    setSending(true)
    setError('')
    try {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/setup/test-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...form, deviceId }),
      })
      if (!res.ok) throw new Error('Failed to send')
      const data = (await res.json()) as { message: { id: string; status: string } }
      setMessageId(data.message.id)
      setMessageStatus(data.message.status)
      setSent(true)
    } catch {
      setError('Failed to send test message.')
    } finally {
      setSending(false)
    }
  }

  useEffect(() => {
    if (!messageId || messageStatus === 'sent' || messageStatus === 'delivered' || messageStatus === 'failed') return

    const interval = setInterval(async () => {
      try {
        const token = getAccessToken()
        const res = await fetch(`${API_URL}/setup/test-message/${messageId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const data = (await res.json()) as { status: string }
          setMessageStatus(data.status)
        }
      } catch {
        // ignore polling errors
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [messageId, messageStatus])

  const isValid = form.phoneNumber && form.contactNumber && form.content

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Send a test SMS to verify everything is working.
      </p>

      {!sent ? (
        <>
          <div className="space-y-3 mb-6">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">SIM Phone Number</label>
              <input
                placeholder="Phone number of your GoIP SIM"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
              />
              <p className="mt-1 text-[11px] text-gray-400">The number of the SIM card in your GoIP device</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Recipient Number</label>
              <input
                placeholder="Number to send the test SMS to"
                value={form.contactNumber}
                onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Message</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-accent-300 resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={!isValid || sending}
            className="w-full rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Test Message'}
          </button>

          <button
            onClick={onComplete}
            disabled={completing}
            className="mt-2 w-full py-2 text-center text-xs text-gray-400 hover:text-gray-600"
          >
            {completing ? 'Completing...' : 'Skip & Complete Setup'}
          </button>
        </>
      ) : (
        <>
          <div className="mb-4 rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-1">
              {(messageStatus === 'sent' || messageStatus === 'delivered') && (
                <Check size={16} className="text-green-500" />
              )}
              {messageStatus === 'queued' && <Loader2 size={16} className="animate-spin text-gray-400" />}
              {messageStatus === 'failed' && <span className="text-red-500 text-sm font-bold">!</span>}
              <span className="text-sm font-medium text-gray-700">
                {messageStatus === 'queued' && 'Message queued — waiting for gateway...'}
                {messageStatus === 'sent' && 'Message sent!'}
                {messageStatus === 'delivered' && 'Message delivered!'}
                {messageStatus === 'failed' && 'Message failed to send'}
              </span>
            </div>
            <p className="text-xs text-gray-400 ml-6">
              To: {form.contactNumber}
            </p>
          </div>

          <button
            onClick={onComplete}
            disabled={completing}
            className="w-full rounded-xl bg-[#1a1a1a] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-50"
          >
            {completing ? 'Completing setup...' : 'Complete Setup'}
          </button>
        </>
      )}

      {(error || completeError) && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          {error || completeError}
        </p>
      )}
    </div>
  )
}

// ── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ value, dark }: { value: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    void navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`shrink-0 p-1.5 ${dark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
      title="Copy"
    >
      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
    </button>
  )
}

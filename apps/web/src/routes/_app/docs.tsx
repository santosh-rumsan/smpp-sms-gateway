import { createFileRoute } from '@tanstack/react-router'
import {
  BookOpen,
  Cable,
  Globe,
  Key,
  Mail,
  MessageSquare,
  Shield,
  Smartphone,
  Terminal,
  Users,
  Wifi,
  Zap,
} from 'lucide-react'

export const Route = createFileRoute('/_app/docs')({
  component: DocsPage,
})

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-[#1a1a1a] mb-4 pb-2 border-b border-gray-100">{title}</h2>
      {children}
    </section>
  )
}

function Card({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 flex gap-3">
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center text-accent-600">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  )
}

function Code({ children }: { children: string }) {
  return (
    <code className="inline-block bg-gray-100 text-gray-700 font-mono text-xs px-1.5 py-0.5 rounded">
      {children}
    </code>
  )
}

function DocsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen size={20} className="text-accent-500" />
            <span className="text-xs font-medium text-accent-600 uppercase tracking-wider">Documentation</span>
          </div>
          <h1 className="text-2xl font-black text-[#1a1a1a]">SMPP SMS Gateway</h1>
          <p className="text-sm text-gray-500 mt-1">
            Receive and send SMS via GoIP devices through the SMPP protocol.
          </p>
        </div>

        {/* Overview */}
        <Section title="Overview">
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            This gateway connects GoIP hardware devices to a web interface via the SMPP protocol. Each GoIP device
            contains SIM cards (channels). Incoming SMS are stored, displayed in a chat-style interface, and can be
            forwarded via email or webhook. Outbound SMS can be sent from the web UI or via the REST API.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card icon={<Smartphone size={16} />} title="Multi-Device Support" description="Connect multiple GoIP devices, each with its own SMPP connection and SIM channels." />
            <Card icon={<MessageSquare size={16} />} title="Chat Interface" description="WhatsApp-style conversation view grouped by contact within each channel." />
            <Card icon={<Shield size={16} />} title="Role-Based Access" description="Admin and user roles with per-channel reader/sender/manager permissions." />
            <Card icon={<Zap size={16} />} title="Real-Time Status" description="Track message status from queued → sent → delivered with SMPP delivery receipts." />
            <Card icon={<Mail size={16} />} title="Email & Webhook" description="Forward incoming SMS to emails or trigger webhook URLs per channel." />
            <Card icon={<Globe size={16} />} title="REST API" description="Full REST API with API key auth for external integrations." />
          </div>
        </Section>

        {/* Architecture */}
        <Section title="Architecture">
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            A pnpm + Turborepo monorepo with three main services:
          </p>
          <div className="space-y-3">
            {[
              { label: 'apps/api', desc: 'Cloudflare Worker (Hono + D1) — SMS storage, auth, REST API. Runs on port 6061 via Wrangler.' },
              { label: 'apps/smpp', desc: 'Node.js SMPP gateway — connects to GoIP devices. Polls the API every 3s for queued outbound messages.' },
              { label: 'apps/web', desc: 'React 19 frontend (TanStack Start + Router). Chat-style UI for reading and sending SMS.' },
            ].map((item) => (
              <div key={item.label} className="flex gap-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                <Code>{item.label}</Code>
                <p className="text-xs text-gray-600 leading-relaxed flex-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Key Concepts */}
        <Section title="Key Concepts">
          <div className="space-y-3">
            {[
              { term: 'Device', def: 'A physical GoIP hardware unit. Each device has SMPP connection settings (host, port, system ID, password).' },
              { term: 'Channel', def: 'A SIM card slot in a GoIP device, associated with a phone number. SMS are sent/received per channel.' },
              { term: 'Conversation', def: 'All messages between a channel and a specific contact number, displayed as a chat thread.' },
              { term: 'SMS Queue', def: 'Outbound messages waiting to be sent. The SMPP gateway polls this every 3 seconds and dispatches them.' },
            ].map((item) => (
              <div key={item.term} className="flex gap-3">
                <span className="text-xs font-bold text-gray-700 w-28 shrink-0 pt-0.5">{item.term}</span>
                <p className="text-xs text-gray-500 leading-relaxed">{item.def}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* User Permissions */}
        <Section title="User Permissions">
          <p className="text-sm text-gray-600 mb-4">
            Admins can grant per-channel access to users with three permission levels:
          </p>
          <div className="space-y-2">
            {[
              { role: 'Reader', badge: 'bg-blue-50 text-blue-700 border-blue-200', desc: 'Can read SMS messages on the channel. Cannot send or change settings.' },
              { role: 'Sender', badge: 'bg-purple-50 text-purple-700 border-purple-200', desc: 'Can read and send SMS messages. Cannot access channel settings.' },
              { role: 'Manager', badge: 'bg-green-50 text-green-700 border-green-200', desc: 'Can read, send, and manage channel settings (email forwards, webhooks). Cannot manage user access.' },
            ].map((item) => (
              <div key={item.role} className="flex items-start gap-3 rounded-lg border border-gray-100 px-4 py-3">
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold shrink-0 mt-0.5 ${item.badge}`}>
                  {item.role}
                </span>
                <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* REST API */}
        <Section title="REST API">
          <p className="text-sm text-gray-600 mb-4">
            The API is available at the Worker URL. Authenticate with an API key or a Bearer JWT token.
          </p>
          <div className="space-y-2">
            {[
              { method: 'GET', path: '/channels', desc: 'List all channels accessible to the user' },
              { method: 'GET', path: '/channels/:id/conversations', desc: 'List conversations for a channel' },
              { method: 'GET', path: '/channels/:id/conversations/:contact/messages', desc: 'Get messages for a conversation' },
              { method: 'POST', path: '/channels/:id/conversations/:contact/messages', desc: 'Send an SMS to a contact' },
              { method: 'GET', path: '/admin/devices', desc: 'List GoIP devices (admin only)' },
              { method: 'GET', path: '/admin/sms-queue', desc: 'View pending outbound SMS (admin only)' },
            ].map((item) => (
              <div key={item.path} className="flex items-center gap-3 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${item.method === 'GET' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {item.method}
                </span>
                <span className="text-gray-700 font-mono">{item.path}</span>
                <span className="text-gray-400 text-[11px] font-sans ml-auto hidden sm:block">{item.desc}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            API keys can be created in <strong>Admin → API Keys</strong>. Pass them as <Code>Authorization: Bearer &lt;key&gt;</Code>.
          </p>
        </Section>

        {/* Dev Commands */}
        <Section title="Development">
          <div className="rounded-xl bg-[#1a1a1a] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={14} className="text-gray-400" />
              <span className="text-xs text-gray-400 font-medium">Commands</span>
            </div>
            <div className="space-y-2 font-mono text-xs">
              {[
                { cmd: 'pnpm dev', desc: '# Run all services concurrently' },
                { cmd: 'pnpm dev:web', desc: '# Frontend only (port 9515)' },
                { cmd: 'pnpm dev:api', desc: '# API only (port 6061 via Wrangler)' },
                { cmd: 'pnpm dev:smpp', desc: '# SMPP gateway only' },
                { cmd: 'pnpm db:generate', desc: '# Generate Drizzle migrations' },
                { cmd: 'pnpm db:migrate', desc: '# Apply migrations to local D1' },
              ].map((item) => (
                <div key={item.cmd} className="flex gap-3">
                  <span className="text-green-400">{item.cmd}</span>
                  <span className="text-gray-500">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Links */}
        <Section title="More">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Wifi size={14} />, title: 'Connection Logs', href: '/admin/connection-logs', desc: 'SMPP device connect/disconnect events' },
              { icon: <MessageSquare size={14} />, title: 'SMS Logs', href: '/admin/sms-logs', desc: 'All inbound and outbound messages' },
              { icon: <Mail size={14} />, title: 'Email Logs', href: '/admin/email-logs', desc: 'Email forwards and alert delivery' },
              { icon: <Cable size={14} />, title: 'Webhook Logs', href: '/admin/webhook-logs', desc: 'Outbound webhook delivery status' },
              { icon: <Key size={14} />, title: 'API Keys', href: '/admin/api-keys', desc: 'Manage API access keys' },
              { icon: <Users size={14} />, title: 'Users', href: '/admin/users', desc: 'User roles and channel permissions' },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex gap-3 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-accent-50 flex items-center justify-center text-gray-400 group-hover:text-accent-600 transition-colors">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 group-hover:text-accent-600 transition-colors">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}

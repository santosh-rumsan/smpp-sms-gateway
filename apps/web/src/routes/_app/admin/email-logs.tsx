import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, X, XCircle } from 'lucide-react'
import { useState } from 'react'

import { API_URL } from '../../../lib/api'
import { getAccessToken } from '../../../lib/auth-client'

export const Route = createFileRoute('/_app/admin/email-logs')({
  component: EmailLogsPage,
})

interface EmailLog {
  id: string
  type: 'sms_forward' | 'device_offline' | 'smpp_connected' | 'smpp_disconnected'
  recipient: string
  subject: string
  deviceId: string | null
  channelId: string | null
  status: 'success' | 'error'
  error: string | null
  sentAt: string
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const TYPE_LABELS: Record<string, string> = {
  sms_forward: 'SMS Forward',
  device_offline: 'Device Offline Alert',
  smpp_connected: 'SMPP Connected',
  smpp_disconnected: 'SMPP Disconnected',
}

const TYPE_COLORS: Record<string, string> = {
  device_offline: 'bg-orange-50 text-orange-700 border border-orange-200',
  smpp_disconnected: 'bg-red-50 text-red-700 border border-red-200',
  smpp_connected: 'bg-green-50 text-green-700 border border-green-200',
}

function DetailPanel({ log, onClose }: { log: EmailLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-96 bg-white shadow-xl flex flex-col border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Email Log Detail</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Field label="Status">
            {log.status === 'success' ? (
              <span className="flex items-center gap-1.5 text-green-600 text-sm">
                <CheckCircle size={14} /> Sent
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-red-500 text-sm">
                <XCircle size={14} /> Error
              </span>
            )}
          </Field>
          <Field label="Type">
            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[log.type] ?? 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
              {TYPE_LABELS[log.type] ?? log.type}
            </span>
          </Field>
          <Field label="Sent At">
            <span className="text-sm text-gray-700">{new Date(log.sentAt).toLocaleString()}</span>
          </Field>
          <Field label="Recipient">
            <span className="text-sm font-mono text-gray-700">{log.recipient === 'gateway' ? '—' : log.recipient}</span>
          </Field>
          <Field label="Subject">
            <span className="text-sm text-gray-700">{log.subject || '—'}</span>
          </Field>
          {log.channelId && (
            <Field label="Channel ID">
              <span className="text-xs font-mono text-gray-500">{log.channelId}</span>
            </Field>
          )}
          {log.deviceId && (
            <Field label="Device ID">
              <span className="text-xs font-mono text-gray-500">{log.deviceId}</span>
            </Field>
          )}
          {log.error && (
            <Field label="Error">
              <p className="text-sm text-red-600 font-mono bg-red-50 rounded-lg p-3 break-all">{log.error}</p>
            </Field>
          )}
          <Field label="Log ID">
            <span className="text-xs font-mono text-gray-400">{log.id}</span>
          </Field>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      {children}
    </div>
  )
}

function EmailLogsPage() {
  const [selected, setSelected] = useState<EmailLog | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'email-logs'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/email-logs`, {
        headers: authHeaders(),
      })
      return res.json() as Promise<{ logs: EmailLog[] }>
    },
    refetchInterval: 30_000,
  })

  const logs = data?.logs ?? []

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Email Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Emails sent by the gateway — SMS forwards and device offline alerts.
        </p>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-400 text-sm">No emails sent yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelected(log)}
                >
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(log.sentAt).toLocaleString('en-US', {
                      timeZone: 'Asia/Kathmandu',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        TYPE_COLORS[log.type] ?? 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {TYPE_LABELS[log.type] ?? log.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                    {log.recipient === 'gateway' ? (
                      <span className="text-gray-400 italic not-italic font-sans">—</span>
                    ) : (
                      log.recipient
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={log.subject}>
                    {log.subject}
                  </td>
                  <td className="px-4 py-3">
                    {log.status === 'success' ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={14} />
                        <span className="text-xs">Sent</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle size={14} />
                        <span className="text-xs">Error</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <DetailPanel log={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

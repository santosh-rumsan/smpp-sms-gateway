import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, X, XCircle } from 'lucide-react'
import { useState } from 'react'

import { API_URL } from '../../../lib/api'
import { getAccessToken } from '../../../lib/auth-client'

export const Route = createFileRoute('/_app/admin/webhook-logs')({
  component: WebhookLogsPage,
})

interface WebhookLog {
  id: string
  channelId: string
  channelName: string | null
  channelPhone: string | null
  webhookId: string | null
  url: string
  event: string
  status: 'success' | 'error'
  statusCode: number | null
  error: string | null
  triggeredAt: string
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function truncateUrl(url: string, max = 48): string {
  return url.length > max ? url.slice(0, max) + '…' : url
}

function DetailPanel({ log, onClose }: { log: WebhookLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-96 bg-white shadow-xl flex flex-col border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Webhook Log Detail</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Field label="Status">
            {log.status === 'success' ? (
              <span className="flex items-center gap-1.5 text-green-600 text-sm">
                <CheckCircle size={14} /> {log.statusCode ?? 'Success'}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-red-500 text-sm">
                <XCircle size={14} /> {log.statusCode ? `HTTP ${log.statusCode}` : 'Error'}
              </span>
            )}
          </Field>
          <Field label="Event">
            <span className="inline-flex items-center rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700">
              {log.event}
            </span>
          </Field>
          <Field label="Triggered At">
            <span className="text-sm text-gray-700">{new Date(log.triggeredAt).toLocaleString()}</span>
          </Field>
          <Field label="URL">
            <p className="text-xs font-mono text-gray-700 break-all bg-gray-50 rounded-lg p-3">{log.url}</p>
          </Field>
          <Field label="Channel">
            {log.channelName ? (
              <div>
                <p className="text-sm text-gray-700 font-medium">{log.channelName}</p>
                <p className="text-xs font-mono text-gray-400">{log.channelPhone}</p>
              </div>
            ) : (
              <span className="text-xs font-mono text-gray-500">{log.channelId}</span>
            )}
          </Field>
          {log.webhookId && (
            <Field label="Webhook ID">
              <span className="text-xs font-mono text-gray-400">{log.webhookId}</span>
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

function WebhookLogsPage() {
  const [selected, setSelected] = useState<WebhookLog | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'webhook-logs'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/webhook-logs`, {
        headers: authHeaders(),
      })
      return res.json() as Promise<{ logs: WebhookLog[] }>
    },
    refetchInterval: 30_000,
  })

  const logs = data?.logs ?? []

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Webhook Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Delivery status for all outbound webhook calls triggered by incoming SMS.
        </p>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-400 text-sm">No webhook deliveries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">URL</th>
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
                    {new Date(log.triggeredAt).toLocaleString('en-US', {
                      timeZone: 'Asia/Kathmandu',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {log.channelName ? (
                      <div>
                        <span className="text-gray-700 text-xs font-medium">{log.channelName}</span>
                        <span className="block text-gray-400 text-xs font-mono">{log.channelPhone}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs font-mono">{log.channelId}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {log.event}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs" title={log.url}>
                    {truncateUrl(log.url)}
                  </td>
                  <td className="px-4 py-3">
                    {log.status === 'success' ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle size={14} />
                        <span className="text-xs">{log.statusCode ?? 'OK'}</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-500">
                        <XCircle size={14} />
                        <span className="text-xs">{log.statusCode ? `HTTP ${log.statusCode}` : 'Error'}</span>
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

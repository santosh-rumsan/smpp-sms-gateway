import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle } from 'lucide-react'

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

function WebhookLogsPage() {
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
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
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
                      <div>
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle size={14} />
                          <span className="text-xs">{log.statusCode ? `HTTP ${log.statusCode}` : 'Error'}</span>
                        </span>
                        {log.error && (
                          <p
                            className="mt-0.5 text-xs text-red-400 font-mono max-w-xs truncate"
                            title={log.error}
                          >
                            {log.error}
                          </p>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

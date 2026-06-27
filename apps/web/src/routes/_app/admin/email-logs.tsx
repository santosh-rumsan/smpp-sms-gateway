import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'

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

function EmailLogsPage() {
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
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/admin/email-transports"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </Link>
        <h1 className="text-xl font-bold">Email Logs</h1>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        All emails sent by the gateway — SMS forwards and device offline alerts.
      </p>

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
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
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
                      <div>
                        <span className="flex items-center gap-1 text-red-500">
                          <XCircle size={14} />
                          <span className="text-xs">Error</span>
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

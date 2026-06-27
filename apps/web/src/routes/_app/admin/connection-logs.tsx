import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Wifi, WifiOff } from 'lucide-react'

import { API_URL } from '../../../lib/api'
import { getAccessToken } from '../../../lib/auth-client'

export const Route = createFileRoute('/_app/admin/connection-logs')({
  component: ConnectionLogsPage,
})

interface ConnectionLog {
  id: string
  deviceId: string | null
  deviceName: string | null
  type: 'connected' | 'disconnected'
  occurredAt: string
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function ConnectionLogsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'connection-logs'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/connection-logs`, {
        headers: authHeaders(),
      })
      return res.json() as Promise<{ logs: ConnectionLog[] }>
    },
    refetchInterval: 15_000,
  })

  const logs = data?.logs ?? []

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Connection Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          SMPP connect and disconnect events for all devices.
        </p>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-400 text-sm">No connection events recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(log.occurredAt).toLocaleString('en-US', {
                      timeZone: 'Asia/Kathmandu',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {log.type === 'connected' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-medium text-green-700">
                        <Wifi size={11} /> Online
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-medium text-red-600">
                        <WifiOff size={11} /> Offline
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {log.deviceName ?? log.deviceId ?? '—'}
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

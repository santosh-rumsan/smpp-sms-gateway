import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, X } from 'lucide-react'
import { useState } from 'react'

import { API_URL } from '../../../lib/api'
import { getAccessToken } from '../../../lib/auth-client'

export const Route = createFileRoute('/_app/admin/sms-logs')({
  component: SmsLogsPage,
})

interface SmsLog {
  id: string
  channelId: string
  channelName: string | null
  channelPhone: string | null
  direction: 'inbound' | 'outbound'
  contactNumber: string
  content: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received'
  statusDetail: string | null
  createdAt: string
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-gray-50 text-gray-500 border-gray-200',
  sent: 'bg-blue-50 text-blue-600 border-blue-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  received: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
}

function DetailPanel({ log, onClose }: { log: SmsLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-96 bg-white shadow-xl flex flex-col border-l border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">SMS Log Detail</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Field label="Direction">
            {log.direction === 'inbound' ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700">
                <ArrowDownLeft size={11} /> Inbound
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-xs font-medium text-purple-700">
                <ArrowUpRight size={11} /> Outbound
              </span>
            )}
          </Field>
          <Field label="Status">
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[log.status] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
              {log.status}
            </span>
          </Field>
          <Field label="Created At">
            <span className="text-sm text-gray-700">{new Date(log.createdAt).toLocaleString()}</span>
          </Field>
          <Field label="Contact Number">
            <span className="text-sm font-mono text-gray-700">{log.contactNumber}</span>
          </Field>
          <Field label="Channel">
            {log.channelName ? (
              <div>
                <p className="text-sm font-medium text-gray-700">{log.channelName}</p>
                <p className="text-xs font-mono text-gray-400">{log.channelPhone}</p>
              </div>
            ) : (
              <span className="text-xs font-mono text-gray-500">{log.channelId}</span>
            )}
          </Field>
          <Field label="Message">
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed">{log.content}</p>
          </Field>
          {log.statusDetail && (
            <Field label="Status Detail">
              <p className="text-sm text-red-600 font-mono bg-red-50 rounded-lg p-3 break-all">{log.statusDetail}</p>
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

function SmsLogsPage() {
  const [selected, setSelected] = useState<SmsLog | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sms-logs'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/sms-logs`, {
        headers: authHeaders(),
      })
      return res.json() as Promise<{ logs: SmsLog[] }>
    },
    refetchInterval: 15_000,
  })

  const logs = data?.logs ?? []

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">SMS Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          All inbound and outbound SMS messages across every channel.
        </p>
      </div>

      {isLoading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-400 text-sm">No SMS messages yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Dir</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Message</th>
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
                    {new Date(log.createdAt).toLocaleString('en-US', {
                      timeZone: 'Asia/Kathmandu',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {log.direction === 'inbound' ? (
                      <span title="Inbound" className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-600">
                        <ArrowDownLeft size={13} />
                      </span>
                    ) : (
                      <span title="Outbound" className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-50 text-purple-600">
                        <ArrowUpRight size={13} />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700 text-xs font-medium block">{log.channelName ?? '—'}</span>
                    <span className="text-gray-400 text-xs font-mono">{log.channelPhone ?? log.channelId}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs whitespace-nowrap">
                    {log.contactNumber}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate" title={log.content}>
                    {log.content}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[log.status] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}
                    >
                      {log.status}
                    </span>
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

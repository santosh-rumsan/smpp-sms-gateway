import { createFileRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { Activity, Clock, Mail, MessageSquare, Monitor, Key, Settings, Users, Webhook } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '@rs/ui'

import { useSession } from '../../lib/auth-client'

export const Route = createFileRoute('/_app/admin')({
  component: AdminLayout,
})

const navGroups = [
  {
    label: null,
    items: [
      { to: '/admin', label: 'Devices', icon: Monitor },
      { to: '/admin/users', label: 'Users', icon: Users },
      { to: '/admin/api-keys', label: 'API Keys', icon: Key },
      { to: '/admin/email-transports', label: 'Email', icon: Mail },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    label: 'Logs',
    items: [
      { to: '/admin/email-logs', label: 'Email Logs', icon: Mail },
      { to: '/admin/webhook-logs', label: 'Webhook Logs', icon: Webhook },
      { to: '/admin/connection-logs', label: 'Connection Logs', icon: Activity },
      { to: '/admin/sms-logs', label: 'SMS Logs', icon: MessageSquare },
    ],
  },
  {
    label: 'Queue',
    items: [
      { to: '/admin/sms-queue', label: 'SMS Queue', icon: Clock },
    ],
  },
]

const allNavItems = navGroups.flatMap((g) => g.items)

function AdminLayout() {
  const session = useSession()
  const navigate = useNavigate()
  const user = session.data?.user

  useEffect(() => {
    if (user && !user.role.split(',').includes('admin')) {
      navigate({ to: '/channels' })
    }
  }, [user, navigate])

  if (!user || !user.role.split(',').includes('admin')) return null

  return (
    <div className="flex h-full flex-col sm:flex-row">
      {/* Mobile: horizontal scrollable tab bar */}
      <div className="sm:hidden flex overflow-x-auto border-b border-gray-200 flex-shrink-0 bg-white">
        {allNavItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-sm text-gray-500 whitespace-nowrap border-b-2 border-transparent transition-colors flex-shrink-0',
            )}
            activeProps={{ className: 'border-accent-500 text-accent-600 font-medium' }}
            activeOptions={{ exact: item.to === '/admin' }}
          >
            <item.icon size={14} />
            {item.label}
          </Link>
        ))}
      </div>

      {/* Desktop: vertical sidebar */}
      <div className="hidden sm:block w-52 border-r border-gray-200 p-4 flex-shrink-0 space-y-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2">
          Admin
        </h2>
        {navGroups.map((group, gi) => (
          <div key={gi}>
            {group.label && (
              <p className="px-2 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors',
                  )}
                  activeProps={{ className: 'bg-accent-50 text-accent-600 font-medium' }}
                  activeOptions={{ exact: item.to === '/admin' }}
                >
                  <item.icon size={16} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}

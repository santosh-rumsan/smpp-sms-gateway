import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Shield, User } from 'lucide-react'
import { useState } from 'react'

import { API_URL } from '../../../lib/api'
import { getAccessToken } from '../../../lib/auth-client'

export const Route = createFileRoute('/_app/admin/users')({
  component: UsersPage,
})

interface UserPermission {
  channelId: string
  channelName: string
  channelPhone: string
  permission: string
}

interface AppUser {
  id: string
  name: string
  email: string
  active: boolean
  role: string
  permissions: UserPermission[]
}

function UsersPage() {
  const [expandedUser, setExpandedUser] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error('Failed to fetch users')
      return res.json() as Promise<{ users: AppUser[] }>
    },
  })

  const users = data?.users ?? []

  const permissionLabel = (p: string) => {
    if (p === 'readwrite') return 'Read & Write'
    return p.charAt(0).toUpperCase() + p.slice(1)
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">User Management</h1>

      {isLoading ? (
        <p className="text-gray-400">Loading users...</p>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          Failed to load users. Make sure RS Office is configured correctly.
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
          No users found for this app.
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const isExpanded = expandedUser === user.id
            const userRoles = user.role.split(',').map((r) => r.trim())
            const isAdmin = userRoles.includes('admin')
            const isRsUser = !isAdmin

            return (
              <div
                key={user.id}
                className="rounded-xl border border-gray-200 overflow-hidden"
              >
                <div
                  className={`flex items-center justify-between p-4 ${isRsUser ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                  onClick={() => {
                    if (isRsUser) setExpandedUser(isExpanded ? null : user.id)
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isRsUser && (
                      <span className="text-gray-400 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {user.name || user.email}
                        </span>
                        {userRoles.map((role) => (
                          <span
                            key={role}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {role === 'admin' ? (
                              <Shield size={10} />
                            ) : (
                              <User size={10} />
                            )}
                            {role}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isRsUser && user.permissions.length > 0 && (
                      <span className="text-xs text-gray-400">
                        {user.permissions.length} channel
                        {user.permissions.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${user.active ? 'bg-green-400' : 'bg-gray-300'}`}
                      title={user.active ? 'Active' : 'Inactive'}
                    />
                  </div>
                </div>

                {isRsUser && isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                    <span className="text-xs font-medium text-gray-500 mb-3 block">
                      Channel Access
                    </span>

                    {user.permissions.length > 0 ? (
                      <div className="space-y-1.5">
                        {user.permissions.map((perm) => (
                          <div
                            key={perm.channelId}
                            className="flex items-center justify-between rounded-lg bg-white px-3 py-2 border border-gray-100"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm text-gray-700 truncate">
                                {perm.channelName}
                              </span>
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                {perm.channelPhone}
                              </span>
                            </div>
                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              {permissionLabel(perm.permission)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">
                        No channel access. Assign channels from the channel settings page.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

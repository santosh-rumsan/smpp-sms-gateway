import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

import { api } from '../lib/api'
import { authClient } from '../lib/auth-client'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    if (typeof window === 'undefined') return {}

    const setupRes = await api.setup.status.$get()
    const setupData = await setupRes.json()

    if (!setupData.setupComplete) {
      const session = await authClient.getSession()
      if (!session.data?.user) {
        throw redirect({ to: '/login' })
      }
      throw redirect({ to: '/setup' })
    }

    const session = await authClient.getSession()
    if (!session.data?.user) {
      throw redirect({ to: '/login' })
    }

    throw redirect({ to: '/channels' })
  },
  component: RootRedirect,
})

function RootRedirect() {
  const navigate = useNavigate()

  useEffect(() => {
    authClient.getSession().then((s) => {
      if (!s.data?.user) {
        navigate({ to: '/login' })
      } else {
        navigate({ to: '/channels' })
      }
    })
  }, [navigate])

  return (
    <div className="flex h-screen items-center justify-center bg-[#f0f0f0]">
      <div className="animate-pulse text-gray-400">Loading...</div>
    </div>
  )
}

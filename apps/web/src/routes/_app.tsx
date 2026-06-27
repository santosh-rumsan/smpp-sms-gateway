import { createFileRoute, Link, Outlet, useNavigate } from '@tanstack/react-router'
import { BookOpen, BookUser, MessageSquare, Shield, UserCircle } from 'lucide-react'
import { cn } from '@rs/ui'
import { useEffect, useState } from 'react'

import { authClient, useSession } from '../lib/auth-client'
import { AppShell, IconSidebar } from '../components/layout'
import { initAccentColor } from '../lib/accent-color'

export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

interface MobileNavItem {
  icon: React.ReactNode
  to: string
  label: string
  exact?: boolean
}

function MobileBottomNav({
  items,
  avatar,
}: {
  items: MobileNavItem[]
  avatar?: string
}) {
  return (
    <nav
      className="flex items-stretch justify-around bg-white px-1"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.exact }}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-gray-400 transition-colors',
          )}
          activeProps={{ className: 'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-accent-500 transition-colors' }}
        >
          {item.icon}
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}

      <Link
        to="/profile"
        className={cn(
          'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-gray-400 transition-colors',
        )}
        activeProps={{ className: 'flex flex-col items-center justify-center gap-0.5 flex-1 py-2.5 text-accent-500 transition-colors' }}
      >
        {avatar ? (
          <img src={avatar} alt="profile" className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <UserCircle size={20} />
        )}
        <span className="text-[10px] font-medium">Profile</span>
      </Link>
    </nav>
  )
}

function AppLayout() {
  const [mounted, setMounted] = useState(false)
  const session = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    setMounted(true)
    initAccentColor()
    authClient.getSession().then((s) => {
      if (!s.data?.user) {
        navigate({ to: '/login' })
      }
    })
  }, [navigate])

  if (!mounted || !session.data?.user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f0f0f0]">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  const user = session.data.user
  const isAdmin = user.role.split(',').includes('admin')

  const navItems = [
    { icon: <MessageSquare size={18} />, to: '/channels' as const },
    { icon: <BookUser size={18} />, to: '/contacts' as const },
    ...(isAdmin ? [{ icon: <Shield size={18} />, to: '/admin' as const }] : []),
    { icon: <BookOpen size={18} />, href: '/docs/' },
  ]

  const mobileNavItems: MobileNavItem[] = [
    { icon: <MessageSquare size={20} />, to: '/channels', label: 'Channels' },
    { icon: <BookUser size={20} />, to: '/contacts', label: 'Contacts' },
    ...(isAdmin ? [{ icon: <Shield size={20} />, to: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <AppShell
      sidebar={
        <IconSidebar
          navItems={navItems}
          avatar={user.image ?? undefined}
          userName={user.name}
        />
      }
      mobileNav={
        <MobileBottomNav
          items={mobileNavItems}
          avatar={user.image ?? undefined}
        />
      }
    >
      <Outlet />
    </AppShell>
  )
}

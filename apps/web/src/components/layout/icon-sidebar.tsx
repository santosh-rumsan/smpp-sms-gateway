import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { cn } from '@rs/ui'

export interface SidebarNavItem {
  icon: React.ReactNode
  to?: string
  href?: string
  badge?: number
  onClick?: () => void
}

export interface IconSidebarProps {
  navItems?: SidebarNavItem[]
  avatar?: string
  userName?: string
  className?: string
}

const activeClass = 'text-white bg-accent-500'
const inactiveClass = 'text-gray-400 hover:text-white'

export function IconSidebar({
  navItems = [],
  avatar,
  userName,
  className,
}: IconSidebarProps) {
  return (
    <div
      className={cn(
        'w-16 bg-[#1a1a1a] flex flex-col items-center py-4 gap-2 flex-shrink-0',
        className,
      )}
    >
      <div className="text-white mb-4 flex h-10 w-10 items-center justify-center">
        <svg viewBox="0 0 40 40" fill="none" className="h-8 w-8 text-white" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="currentColor" opacity="0.15" />
          <text
            x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
            fill="currentColor" fontSize="12" fontWeight="bold" fontFamily="Inter, sans-serif"
          >
            SMS
          </text>
        </svg>
      </div>

      {navItems.map((item, i) =>
        item.to ? (
          <Link
            key={i}
            to={item.to}
            className={cn('relative p-2.5 rounded-xl transition-colors', inactiveClass)}
            activeProps={{
              className: cn('relative p-2.5 rounded-xl transition-colors', activeClass),
            }}
          >
            {item.icon}
            {item.badge != null && item.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-500 border border-[#1a1a1a] rounded-full text-[10px] flex items-center justify-center text-white">
                {item.badge}
              </span>
            )}
          </Link>
        ) : item.href ? (
          <a
            key={i}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('relative p-2.5 rounded-xl transition-colors', inactiveClass)}
          >
            {item.icon}
          </a>
        ) : (
          <button
            key={i}
            onClick={item.onClick}
            className={cn('relative p-2.5 rounded-xl transition-colors', inactiveClass)}
          >
            {item.icon}
          </button>
        ),
      )}

      <div className="mt-auto flex flex-col items-center gap-4">
        <Link to="/profile" className="block" title="Profile">
          {avatar ? (
            <img src={avatar} alt="user" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-600 text-white text-xs font-semibold">
              {userName ? getInitials(userName) : '?'}
            </div>
          )}
        </Link>
      </div>
    </div>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

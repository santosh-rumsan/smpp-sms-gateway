import * as React from 'react'
import { cn } from '@rs/ui'

export interface AppShellProps {
  sidebar: React.ReactNode
  mobileNav?: React.ReactNode
  panel?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function AppShell({ sidebar, mobileNav, panel, children, className }: AppShellProps) {
  return (
    <div className={cn('flex h-[100dvh] bg-[#f0f0f0] font-[Inter,sans-serif] overflow-hidden', className)}>
      {/* Desktop sidebar */}
      <div className="hidden sm:flex flex-shrink-0">
        {sidebar}
      </div>

      {panel}

      <div className="flex-1 bg-white sm:rounded-l-3xl overflow-hidden flex flex-col min-w-0">
        <div className="flex-1 min-h-0 overflow-hidden">
          {children}
        </div>
        {mobileNav && (
          <div className="sm:hidden flex-shrink-0 border-t border-gray-100">
            {mobileNav}
          </div>
        )}
      </div>
    </div>
  )
}

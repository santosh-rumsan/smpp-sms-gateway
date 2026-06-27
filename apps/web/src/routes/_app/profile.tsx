import { createFileRoute } from '@tanstack/react-router'
import { Check, LogOut } from 'lucide-react'
import { useState } from 'react'

import { useSession, signOut } from '../../lib/auth-client'
import {
  ACCENT_PRESETS,
  getSavedAccentColor,
  saveAccentColor,
} from '../../lib/accent-color'

export const Route = createFileRoute('/_app/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const session = useSession()
  const user = session.data?.user
  const [activeColor, setActiveColor] = useState(getSavedAccentColor)
  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    window.location.assign('/login')
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold text-[#1a1a1a] mb-8">Profile</h1>

      <div className="flex items-center gap-5 mb-10">
        {user.image ? (
          <img
            src={user.image}
            alt=""
            className="h-16 w-16 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
            <span className="text-xl font-semibold text-accent-600">
              {getInitials(user.name)}
            </span>
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold text-[#1a1a1a]">{user.name}</h2>
          <p className="text-sm text-gray-500">{user.email}</p>
          <span className="mt-1 inline-block rounded-full bg-accent-50 px-2.5 py-0.5 text-xs font-medium text-accent-600 capitalize">
            {user.role}
          </span>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[#1a1a1a] mb-1">Accent Color</h2>
        <p className="text-sm text-gray-500 mb-5">Choose an accent color for the interface.</p>
        <div className="flex flex-wrap gap-6">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => {
                saveAccentColor(preset.name)
                setActiveColor(preset.name)
              }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                style={{ backgroundColor: preset.color }}
              >
                {activeColor === preset.name && (
                  <Check size={20} className="text-white" strokeWidth={3} />
                )}
              </div>
              <span className="text-xs font-medium text-gray-600">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </div>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

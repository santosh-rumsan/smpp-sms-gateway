import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { authClient } from '../lib/auth-client'
import { type Contact, setContacts } from '../lib/contacts'
import { initAccentColor } from '../lib/accent-color'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string
            scope: string
            ux_mode: string
            callback: (response: { code?: string; error?: string }) => void
            error_callback?: () => void
          }) => {
            requestCode: () => void
          }
        }
      }
    }
  }
}

let googleScriptPromise: Promise<void> | null = null

function loadGoogleScript() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity="true"]',
    )

    if (existing) {
      if (existing.dataset.loaded === 'true') { resolve(); return }
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google sign-in')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.googleIdentity = 'true'
    script.onload = () => { script.dataset.loaded = 'true'; resolve() }
    script.onerror = () => reject(new Error('Failed to load Google sign-in'))
    document.head.appendChild(script)
  })

  return googleScriptPromise
}

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    if (typeof window === 'undefined') return
    const session = await authClient.getSession()
    if (session.data?.user) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scriptReady, setScriptReady] = useState(false)

  useEffect(() => {
    initAccentColor()
  }, [])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google sign-in is not configured.')
      return
    }

    void loadGoogleScript()
      .then(() => setScriptReady(true))
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load Google sign-in')
      })
  }, [])

  const handleSignIn = () => {
    if (!window.google?.accounts?.oauth2 || !GOOGLE_CLIENT_ID) return

    setError('')

    const codeClient = window.google.accounts.oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile https://www.googleapis.com/auth/contacts',
      ux_mode: 'popup',
      callback: async (response) => {
        if (!response.code) {
          setError('Google sign-in was cancelled.')
          return
        }

        setLoading(true)
        try {
          const result = await authClient.signInWithGoogleCode(response.code)
          if (result.contacts) {
            setContacts(result.contacts as Contact[])
          }
          navigate({ to: '/' })
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Sign-in failed')
          setLoading(false)
        }
      },
      error_callback: () => {
        setError('Google sign-in was cancelled.')
      },
    })

    codeClient.requestCode()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f0f0f0]">
        <div className="w-[400px] rounded-2xl bg-white p-10 shadow-sm text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-accent-500" />
          </div>
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-2">Signing In</h2>
          <p className="text-sm text-gray-400">
            Authenticating and syncing contacts...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f0f0f0]">
      <div className="w-[400px] rounded-2xl bg-white p-10 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1a1a1a]">
            <span className="text-xs font-bold text-white">SMS</span>
          </div>
          <h1 className="text-2xl font-black text-[#1a1a1a]">SMPP Gateway</h1>
        </div>

        <p className="mb-8 text-sm text-gray-400">
          Sign in to manage your SMS channels and messages.
        </p>

        <div className="flex justify-center">
          <button
            onClick={handleSignIn}
            disabled={!scriptReady}
            className="flex w-[320px] items-center justify-center gap-3 rounded-full bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-white hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google
          </button>
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

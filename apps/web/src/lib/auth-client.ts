import { useEffect, useSyncExternalStore } from 'react'

import { getResponseError } from './http'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6061'
const STORAGE_KEY = 'rs.smpp-sms.auth'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  image?: string | null
}

interface AuthSession {
  user: AuthUser
}

interface AuthSessionResponse {
  data: AuthSession | null
}

interface StoredAuthState {
  token: string
  user: AuthUser
}

let currentToken: string | null = null
let currentSnapshot: AuthSessionResponse = { data: null }
let hydratedFromStorage = false
let pendingSessionRequest: Promise<AuthSessionResponse> | null = null
let validatedToken: string | null = null

const listeners = new Set<() => void>()

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function emitChange() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function readStoredAuthState(): StoredAuthState | null {
  if (!canUseStorage()) return null

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthState>
    if (
      typeof parsed.token === 'string' &&
      parsed.token &&
      parsed.user &&
      typeof parsed.user.id === 'string' &&
      typeof parsed.user.email === 'string' &&
      typeof parsed.user.name === 'string' &&
      typeof parsed.user.role === 'string'
    ) {
      return {
        token: parsed.token,
        user: parsed.user as AuthUser,
      }
    }
  } catch {
    // Ignore invalid stored auth state and treat as signed out.
  }

  window.localStorage.removeItem(STORAGE_KEY)
  return null
}

function ensureLoadedFromStorage() {
  if (hydratedFromStorage) return
  hydratedFromStorage = true

  const stored = readStoredAuthState()
  currentToken = stored?.token ?? null
  currentSnapshot = stored ? { data: { user: stored.user } } : { data: null }
}

function setAuthState(state: StoredAuthState | null) {
  hydratedFromStorage = true
  currentToken = state?.token ?? null
  currentSnapshot = state ? { data: { user: state.user } } : { data: null }
  validatedToken = null

  if (canUseStorage()) {
    if (state) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } else {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  }

  emitChange()
}

async function fetchSession(token: string): Promise<AuthSessionResponse> {
  const existingUser = currentSnapshot.data?.user

  const res = await fetch(`${API_URL}/auth/session`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    if (res.status === 401) {
      setAuthState(null)
      return { data: null }
    }

    throw await getResponseError(res, 'Failed to verify session')
  }

  const session = (await res.json()) as AuthSession
  // /auth/session doesn't return name or image — preserve from stored state
  const user: AuthUser = {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    name: session.user.name || existingUser?.name || session.user.email,
    image: session.user.image ?? existingUser?.image ?? null,
  }
  setAuthState({ token, user })
  validatedToken = token
  return { data: { user } }
}

async function getSession(): Promise<AuthSessionResponse> {
  ensureLoadedFromStorage()

  if (!currentToken) {
    return { data: null }
  }

  if (currentSnapshot.data && validatedToken === currentToken) {
    return currentSnapshot
  }

  if (pendingSessionRequest) {
    return pendingSessionRequest
  }

  pendingSessionRequest = fetchSession(currentToken).finally(() => {
    pendingSessionRequest = null
  })

  return pendingSessionRequest
}

async function signInWithGoogleCode(code: string): Promise<AuthSessionResponse & { contacts?: unknown[] }> {
  const res = await fetch(`${API_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })

  if (!res.ok) {
    throw await getResponseError(res, 'Google sign-in failed')
  }

  const { token, user, contacts } = (await res.json()) as { token: string; user: AuthUser; contacts?: unknown[] }
  setAuthState({ token, user })
  validatedToken = token
  return { data: { user }, contacts }
}

async function signOut() {
  setAuthState(null)
}

function useSession(): AuthSessionResponse {
  ensureLoadedFromStorage()

  const snapshot = useSyncExternalStore(
    subscribe,
    () => currentSnapshot,
    () => currentSnapshot,
  )

  useEffect(() => {
    if (currentToken && validatedToken !== currentToken && !pendingSessionRequest) {
      void getSession()
    }
  }, [])

  return snapshot
}

export function getAccessToken() {
  ensureLoadedFromStorage()
  return currentToken
}

export function getAuthHeaders(headers?: HeadersInit) {
  const nextHeaders = new Headers(headers)
  const token = getAccessToken()

  if (token) {
    nextHeaders.set('Authorization', `Bearer ${token}`)
  }

  return nextHeaders
}

export const authClient = {
  getSession,
  signInWithGoogleCode,
  signOut,
  useSession,
}

export { signOut, useSession }

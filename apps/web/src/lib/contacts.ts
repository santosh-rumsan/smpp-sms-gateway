import { useSyncExternalStore } from 'react'

import { getAuthHeaders } from './auth-client'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:6061'
const STORAGE_KEY = 'rs.smpp-sms.contacts'

export interface Contact {
  name: string
  phones: string[]
  photo?: string
  resourceName?: string
}

interface ContactStore {
  contacts: Contact[]
  lastFetched: number | null
}

let store: ContactStore = { contacts: [], lastFetched: null }
let loaded = false
const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function loadFromStorage() {
  if (loaded || !canUseStorage()) return
  loaded = true
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    store = JSON.parse(raw) as ContactStore
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
}

function saveToStorage() {
  if (!canUseStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function normalizePhone(phone: string): string {
  const hasPlus = phone.startsWith('+')
  const digits = phone.replace(/\D/g, '')
  return hasPlus ? `+${digits}` : digits
}

export function setContacts(contacts: Contact[]) {
  store = { contacts, lastFetched: Date.now() }
  saveToStorage()
  emitChange()
}

export function findContactByPhone(phone: string): Contact | null {
  loadFromStorage()
  const target = normalizePhone(phone)
  if (!target) return null

  for (const contact of store.contacts) {
    for (const p of contact.phones) {
      const normalized = normalizePhone(p)
      if (normalized === target) return contact
      const minLen = Math.min(normalized.length, target.length)
      if (minLen >= 7) {
        const compareLen = Math.min(minLen, 10)
        if (normalized.slice(-compareLen) === target.slice(-compareLen)) {
          return contact
        }
      }
    }
  }

  return null
}

export function searchContacts(query: string): Contact[] {
  loadFromStorage()
  const q = query.toLowerCase().trim()
  if (!q) return store.contacts
  const qDigits = normalizePhone(q)

  return store.contacts.filter((c) => {
    if (c.name.toLowerCase().includes(q)) return true
    if (qDigits) {
      return c.phones.some((p) => normalizePhone(p).includes(qDigits))
    }
    return false
  })
}

export function useContacts(): Contact[] {
  loadFromStorage()
  return useSyncExternalStore(subscribe, () => store.contacts, () => store.contacts)
}

export async function refreshContacts(): Promise<Contact[]> {
  const res = await fetch(`${API_URL}/contacts`, {
    headers: getAuthHeaders(),
  })

  if (!res.ok) {
    throw new Error('Failed to fetch contacts')
  }

  const { contacts } = (await res.json()) as { contacts: Contact[] }
  setContacts(contacts)
  return contacts
}

export function getContactsLastFetched(): number | null {
  loadFromStorage()
  return store.lastFetched
}

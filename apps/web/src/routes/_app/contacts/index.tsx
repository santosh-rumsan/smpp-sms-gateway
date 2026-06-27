import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BookUser, ExternalLink, Loader2, MessageSquare, Phone, RefreshCw, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@rs/ui'

import { API_URL } from '../../../lib/api'
import { getAccessToken } from '../../../lib/auth-client'
import {
  type Contact,
  getContactsLastFetched,
  refreshContacts,
  searchContacts,
  useContacts,
} from '../../../lib/contacts'

export const Route = createFileRoute('/_app/contacts/')({
  component: ContactsPage,
})

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function getGoogleContactUrl(resourceName?: string): string | null {
  if (!resourceName) return null
  const id = resourceName.replace('people/', '')
  return `https://contacts.google.com/person/${id}`
}

function ContactsPage() {
  const contacts = useContacts()
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        await refreshContacts()
      } catch {
        // No token or expired — silently use cached contacts
      } finally {
        if (!cancelled) setSyncing(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const result = searchContacts(search)
    return result
  }, [contacts, search])

  const selectedContact = selectedIndex !== null ? filtered[selectedIndex] : null

  const lastFetched = getContactsLastFetched()

  if (syncing && contacts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-accent-500 mb-4" />
          <h2 className="text-lg font-bold text-[#1a1a1a] mb-1">Syncing Contacts</h2>
          <p className="text-sm text-gray-400">Fetching your Google Contacts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Contact list — full width on mobile when no contact selected */}
      <div
        className={cn(
          'flex flex-col border-r border-gray-200 sm:w-80',
          selectedContact ? 'hidden sm:flex' : 'flex-1 sm:flex-none',
        )}
      >
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-[#1a1a1a]">Contacts</h1>
            {syncing && <RefreshCw size={14} className="animate-spin text-accent-500" />}
          </div>
          {lastFetched && (
            <p className="text-[10px] text-gray-400 mb-2">
              Last synced: {new Date(lastFetched).toLocaleString()}
            </p>
          )}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedIndex(null) }}
              className="w-full rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm outline-none focus:border-accent-300"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <BookUser className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h2 className="text-sm font-semibold text-gray-600">No contacts loaded</h2>
              <p className="text-xs text-gray-400 mt-1">
                Sign out and sign back in to sync your Google Contacts.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No contacts match your search</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((contact, i) => (
                <button
                  key={`${contact.name}-${i}`}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                    selectedIndex === i ? 'bg-accent-50' : ''
                  }`}
                >
                  {contact.photo ? (
                    <img
                      src={contact.photo}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-100 flex-shrink-0">
                      <span className="text-xs font-semibold text-accent-600">{getInitials(contact.name)}</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1a1a1a] truncate">{contact.name}</p>
                    <p className="text-xs text-gray-400 truncate">
                      {contact.phones.length === 1
                        ? contact.phones[0]
                        : `${contact.phones.length} numbers`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact detail — full width on mobile when contact selected */}
      <div
        className={cn(
          'flex-1 overflow-y-auto',
          !selectedContact && 'hidden sm:flex sm:flex-col sm:items-center sm:justify-center',
        )}
      >
        {selectedContact ? (
          <ContactDetail
            contact={selectedContact}
            onBack={() => setSelectedIndex(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <BookUser className="h-16 w-16 mb-4 text-gray-200" />
            <p className="text-sm">Select a contact to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ContactDetail({ contact, onBack }: { contact: Contact; onBack?: () => void }) {
  const [activePhone, setActivePhone] = useState(0)
  const phone = contact.phones[activePhone]

  const { data: channelsData } = useQuery({
    queryKey: ['channels'],
    queryFn: async () => {
      const token = getAccessToken()
      const res = await fetch(`${API_URL}/channels`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      return res.json() as Promise<{
        channels: { id: string; name: string; phoneNumber: string; isActive: boolean }[]
      }>
    },
  })

  const channels = channelsData?.channels ?? []

  return (
    <div>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="sm:hidden flex items-center gap-2 px-4 py-3 text-sm text-gray-500 hover:text-gray-700 border-b border-gray-100 w-full"
        >
          <ArrowLeft size={15} />
          Back to contacts
        </button>
      )}

      <div className="flex items-center gap-4 px-4 sm:px-6 py-5 sm:py-6 border-b border-gray-200">
        {contact.photo ? (
          <img
            src={contact.photo}
            alt=""
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-full object-cover flex-shrink-0"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-accent-100 flex-shrink-0">
            <span className="text-base sm:text-lg font-semibold text-accent-600">{getInitials(contact.name)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-[#1a1a1a] truncate">{contact.name}</h2>
          <p className="text-sm text-gray-400">
            {contact.phones.length} phone {contact.phones.length === 1 ? 'number' : 'numbers'}
          </p>
        </div>
        {getGoogleContactUrl(contact.resourceName) && (
          <a
            href={getGoogleContactUrl(contact.resourceName)!}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:border-accent-300 hover:text-accent-500 transition-colors flex-shrink-0"
          >
            <ExternalLink size={12} />
            <span className="hidden sm:inline">Google Contacts</span>
          </a>
        )}
      </div>

      {contact.phones.length > 1 && (
        <div className="flex border-b border-gray-200 px-4 sm:px-6 gap-1 overflow-x-auto">
          {contact.phones.map((p, i) => (
            <button
              key={i}
              onClick={() => setActivePhone(i)}
              className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                i === activePhone
                  ? 'border-accent-500 text-accent-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Phone size={14} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-600 break-all">{phone}</span>
        </div>

        {channels.length === 0 ? (
          <p className="text-sm text-gray-400">No channels available. Create a device first.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">
              Chat via channel
            </p>
            {channels.map((ch) => (
              <Link
                key={ch.id}
                to="/channels/$channelId/chat/$contactNumber"
                params={{ channelId: ch.id, contactNumber: phone }}
                className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 sm:p-4 hover:border-accent-300 hover:shadow-sm transition-all"
              >
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-accent-50 flex-shrink-0">
                  <MessageSquare size={15} className="text-accent-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a1a] truncate">{ch.name}</p>
                  <p className="text-xs text-gray-400 truncate">{ch.phoneNumber}</p>
                </div>
                <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${ch.isActive ? 'bg-green-400' : 'bg-gray-300'}`} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

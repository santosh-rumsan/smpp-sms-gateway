import { eq } from 'drizzle-orm'
import { Hono } from 'hono'

import { userGoogleTokens } from '@rs/db/schema'

import type { HonoEnv } from '../types'
import { requireAuth } from '../middleware/auth'
import { fetchGoogleContacts, refreshAccessToken } from '../lib/google'

export const contactsRouter = new Hono<HonoEnv>()

contactsRouter.use('*', requireAuth)

contactsRouter.get('/', async (c) => {
  const user = c.var.user
  const db = c.var.db

  const stored = await db.query.userGoogleTokens.findFirst({
    where: eq(userGoogleTokens.userId, user.id),
  })

  if (!stored) {
    return c.json({ error: 'Google contacts not connected. Please sign out and sign in again.' }, 401)
  }

  let accessToken = stored.accessToken
  const isExpired = stored.tokenExpiry.getTime() < Date.now()

  if (isExpired) {
    try {
      const refreshed = await refreshAccessToken(
        stored.refreshToken,
        c.env.GOOGLE_CLIENT_ID,
        c.env.GOOGLE_CLIENT_SECRET,
      )
      accessToken = refreshed.access_token
      const tokenExpiry = new Date(Date.now() + refreshed.expires_in * 1000)

      await db
        .update(userGoogleTokens)
        .set({ accessToken, tokenExpiry, updatedAt: new Date() })
        .where(eq(userGoogleTokens.userId, user.id))
    } catch {
      return c.json({ error: 'Google token expired. Please sign out and sign in again.' }, 401)
    }
  }

  try {
    const contacts = await fetchGoogleContacts(accessToken)
    return c.json({ contacts })
  } catch {
    return c.json({ error: 'Failed to fetch contacts from Google.' }, 502)
  }
})

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

import { channelPermissions, userGoogleTokens } from '@rs/db/schema'

import type { HonoEnv } from '../types'
import { getBearerToken, extractAppRole } from '../lib/auth'
import * as rsOffice from '../lib/rs-office'
import { exchangeCodeForTokens, fetchGoogleContacts } from '../lib/google'

export const authRouter = new Hono<HonoEnv>()

const googleAuthSchema = z.object({
  code: z.string().min(1),
})

authRouter.post('/google', zValidator('json', googleAuthSchema), async (c) => {
  const { code } = c.req.valid('json')
  const db = c.var.db

  let tokens
  try {
    tokens = await exchangeCodeForTokens(
      code,
      c.env.GOOGLE_CLIENT_ID,
      c.env.GOOGLE_CLIENT_SECRET,
    )
  } catch (e) {
    console.error('POST /auth/google code exchange error:', e)
    return c.json({ error: 'Failed to exchange authorization code' }, 400)
  }

  if (!tokens.id_token) {
    return c.json({ error: 'No ID token received from Google' }, 400)
  }

  let result: rsOffice.RsOfficeGoogleAuthResult
  try {
    result = await rsOffice.googleLogin(
      tokens.id_token,
      c.env.RS_OFFICE_APP_ENV_ID,
      c.env.RS_OFFICE_URL,
      c.env.RS_OFFICE_APP_PRIVATE_KEY,
    )
  } catch (e) {
    console.error('POST /auth/google RS Office error:', e)
    const err = e as { status?: number; message?: string }
    return c.json(
      { error: err.message ?? 'Authentication failed' },
      ((err.status ?? 500) as 400 | 401 | 403 | 404 | 500),
    )
  }

  const user = {
    id: result.user.cuid,
    name: result.user.name,
    email: result.user.email,
    role: extractAppRole(result.roles, c.env.RS_OFFICE_APP_ENV_ID),
    image: result.google.picture ?? null,
  }

  if (!user.role.split(',').includes('admin')) {
    const perms = await db.query.channelPermissions.findMany({
      where: eq(channelPermissions.userId, user.id),
    })
    if (perms.length === 0) {
      return c.json({ error: 'Unauthorized. Please contact your administrator to get channel access.' }, 403)
    }
  }

  let contacts: Awaited<ReturnType<typeof fetchGoogleContacts>> = []

  if (tokens.refresh_token) {
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000)
    try {
      await db
        .insert(userGoogleTokens)
        .values({
          userId: user.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry,
        })
        .onConflictDoUpdate({
          target: userGoogleTokens.userId,
          set: {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiry,
            updatedAt: new Date(),
          },
        })
    } catch (e) {
      console.error('Failed to store Google tokens:', e)
    }

    try {
      contacts = await fetchGoogleContacts(tokens.access_token)
    } catch (e) {
      console.error('Failed to fetch contacts:', e)
    }
  }

  return c.json({ token: result.token, user, contacts })
})

authRouter.get('/session', async (c) => {
  const token = getBearerToken(c.req.raw.headers)
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const payload = await rsOffice.verifyToken(token, c.env.RS_OFFICE_URL)
  if (!payload) return c.json({ error: 'Unauthorized' }, 401)

  return c.json({
    user: {
      id: payload.sub,
      email: payload.email,
      role: extractAppRole(payload.roles, payload.app),
    },
  })
})

authRouter.post('/refresh', async (c) => {
  const token = getBearerToken(c.req.raw.headers)
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  try {
    const newToken = await rsOffice.refreshToken(token, c.env.RS_OFFICE_URL)
    return c.json({ token: newToken })
  } catch {
    return c.json({ error: 'Session expired' }, 401)
  }
})

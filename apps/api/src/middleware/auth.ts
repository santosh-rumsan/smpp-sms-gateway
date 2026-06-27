import type { Context, Next } from 'hono'

import type { HonoEnv, HonoVariables } from '../types'
import { getBearerToken, verifyAppToken } from '../lib/auth'

export async function requireAuth(c: Context<HonoEnv>, next: Next) {
  const token = getBearerToken(c.req.raw.headers)
  const user = token ? await verifyAppToken(token, c.env.RS_OFFICE_URL) : null

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('user', user as HonoVariables['user'])
  await next()
}

export async function requireAdmin(c: Context<HonoEnv>, next: Next) {
  const user = c.var.user

  if (!user || !user.role.split(',').includes('admin')) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  await next()
}

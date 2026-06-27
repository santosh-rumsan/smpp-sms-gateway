import { eq } from 'drizzle-orm'
import type { Context, Next } from 'hono'

import { apiKeys } from '@rs/db/schema'

import type { HonoEnv } from '../types'

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function requireApiKey(c: Context<HonoEnv>, next: Next) {
  const key = c.req.header('x-api-key')
  if (!key) {
    return c.json({ error: 'API key required' }, 401)
  }

  const db = c.var.db
  const keyHash = await sha256(key)

  const found = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, keyHash),
  })

  if (!found || !found.isActive) {
    return c.json({ error: 'Invalid API key' }, 401)
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, found.id))

  await next()
}

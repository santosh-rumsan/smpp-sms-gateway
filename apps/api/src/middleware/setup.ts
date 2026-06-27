import { eq } from 'drizzle-orm'
import type { Context, Next } from 'hono'

import { appSettings } from '@rs/db/schema'

import type { HonoEnv } from '../types'

export async function requireSetupComplete(c: Context<HonoEnv>, next: Next) {
  const db = c.var.db
  const setting = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, 'setup_completed'),
  })

  if (!setting || setting.value !== 'true') {
    return c.json({ error: 'Setup required', setupRequired: true }, 403)
  }

  await next()
}

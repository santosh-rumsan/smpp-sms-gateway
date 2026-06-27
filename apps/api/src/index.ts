import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

import { getDb } from './lib/db'
import { requireSetupComplete } from './middleware/setup'
import { adminRouter } from './routes/admin'
import { authRouter } from './routes/auth'
import { channelsRouter } from './routes/channels'
import { contactsRouter } from './routes/contacts'
import { conversationsRouter } from './routes/conversations'
import { internalRouter } from './routes/internal'
import { messagesRouter } from './routes/messages'
import { setupRouter } from './routes/setup'
import type { HonoEnv } from './types'

const app = new Hono<HonoEnv>()

app.use('*', logger())

app.use('*', cors({
  origin: (origin) => origin,
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}))

app.use('*', async (c, next) => {
  c.set('db', getDb(c.env.DB))
  await next()
})

// ── Public routes ────────────────────────────────────────────────────────────

app.route('/auth', authRouter)
app.route('/setup', setupRouter)

// ── Contacts (auth handled internally) ──────────────────────────────────────

app.route('/contacts', contactsRouter)

// ── Internal routes (API key auth) ───────────────────────────────────────────

app.route('/internal', internalRouter)

// ── Protected routes (setup must be complete) ────────────────────────────────

app.use('/channels/*', requireSetupComplete)
app.use('/admin/*', requireSetupComplete)

app.route('/channels', channelsRouter)
app.route('/channels', conversationsRouter)
app.route('/channels', messagesRouter)
app.route('/admin', adminRouter)

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }))

export type AppType = typeof app

export default app

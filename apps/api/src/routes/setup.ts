import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

import { appSettings, devices, apiKeys, channels, messages } from '@rs/db/schema'
import { setupSchema, createDeviceSchema, createApiKeySchema } from '@rs/validators'

import type { HonoEnv } from '../types'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { createId } from '../lib/cuid2'

export const setupRouter = new Hono<HonoEnv>()

setupRouter.get('/status', async (c) => {
  const db = c.var.db
  const setting = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, 'setup_completed'),
  })

  return c.json({
    setupComplete: setting?.value === 'true',
  })
})

// ── Setup wizard endpoints (auth + admin, but NOT requireSetupComplete) ─────

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

setupRouter.post('/device', requireAuth, requireAdmin, zValidator('json', createDeviceSchema), async (c) => {
  const db = c.var.db
  const data = c.req.valid('json')
  const id = createId()
  const now = new Date()

  await db.insert(devices).values({
    id,
    ...data,
    createdAt: now,
    updatedAt: now,
  })

  const device = await db.query.devices.findFirst({
    where: eq(devices.id, id),
  })

  return c.json({ device }, 201)
})

setupRouter.post('/api-key', requireAuth, requireAdmin, zValidator('json', createApiKeySchema), async (c) => {
  const db = c.var.db
  const { name } = c.req.valid('json')

  const rawKey = `smpp_${createId()}_${createId()}`
  const keyHash = await sha256(rawKey)
  const id = createId()

  await db.insert(apiKeys).values({
    id,
    name,
    keyHash,
    isActive: true,
    createdAt: new Date(),
  })

  return c.json({ id, name, key: rawKey }, 201)
})

const testMessageSchema = z.object({
  phoneNumber: z.string().min(1),
  contactNumber: z.string().min(1),
  content: z.string().min(1).max(1600),
  deviceId: z.string().min(1),
})

setupRouter.post('/test-message', requireAuth, requireAdmin, zValidator('json', testMessageSchema), async (c) => {
  const db = c.var.db
  const { phoneNumber, contactNumber, content, deviceId } = c.req.valid('json')
  const user = c.var.user

  let channel = await db.query.channels.findFirst({
    where: eq(channels.phoneNumber, phoneNumber),
  })

  if (!channel) {
    const channelId = createId()
    const now = new Date()
    await db.insert(channels).values({
      id: channelId,
      phoneNumber,
      name: phoneNumber,
      deviceId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    channel = await db.query.channels.findFirst({
      where: eq(channels.id, channelId),
    })
  }

  if (!channel) {
    return c.json({ error: 'Failed to create channel' }, 500)
  }

  const device = await db.query.devices.findFirst({
    where: eq(devices.id, deviceId),
  })
  const countryCode = device?.countryCode ?? null
  let normalizedContact = contactNumber
  if (countryCode && !contactNumber.startsWith('+')) {
    const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`
    normalizedContact = `${code}${contactNumber.replace(/\D/g, '')}`
  }

  const id = createId()
  const now = new Date()

  await db.insert(messages).values({
    id,
    channelId: channel.id,
    direction: 'outbound',
    contactNumber: normalizedContact,
    content,
    status: 'queued',
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  })

  const msg = await db.query.messages.findFirst({
    where: eq(messages.id, id),
  })

  return c.json({ message: msg, channelId: channel.id }, 201)
})

setupRouter.get('/test-message/:messageId', requireAuth, requireAdmin, async (c) => {
  const db = c.var.db
  const messageId = c.req.param('messageId')!
  const msg = await db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  })
  if (!msg) return c.json({ error: 'Message not found' }, 404)
  return c.json({ status: msg.status })
})

setupRouter.get('/gateway-status/:deviceId', requireAuth, requireAdmin, async (c) => {
  const db = c.var.db
  const deviceId = c.req.param('deviceId')!

  const setting = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, `gateway_connected_${deviceId}`),
  })

  return c.json({
    running: setting?.value === 'true',
    connected: setting?.value === 'true',
  })
})

// ── Complete setup ──────────────────────────────────────────────────────────

setupRouter.post('/', requireAuth, requireAdmin, zValidator('json', setupSchema), async (c) => {
  const db = c.var.db

  const existing = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, 'setup_completed'),
  })
  if (existing?.value === 'true') {
    return c.json({ error: 'Setup already completed' }, 409)
  }

  const now = new Date()

  await db
    .insert(appSettings)
    .values({ key: 'setup_completed', value: 'true', isSecret: false, updatedAt: now } as typeof appSettings.$inferInsert)
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: 'true', updatedAt: now },
    })

  return c.json({ ok: true })
})

setupRouter.get('/settings', requireAuth, requireAdmin, async (c) => {
  const db = c.var.db
  const settings = await db.query.appSettings.findMany()

  const result: Record<string, string | null> = {}
  for (const s of settings) {
    result[s.key] = s.isSecret ? null : s.value
  }

  return c.json(result)
})

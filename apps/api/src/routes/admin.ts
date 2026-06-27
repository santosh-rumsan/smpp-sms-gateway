import { and, count, desc, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'

import {
  apiKeys,
  appSettings,
  channelPermissions,
  channels,
  connectionLogs,
  devices,
  emailLogs,
  emailTransports,
  messages,
  webhookLogs,
} from '@rs/db/schema'
import {
  createApiKeySchema,
  createDeviceSchema,
  createEmailTransportSchema,
  setPermissionSchema,
  updateDeviceSchema,
  updateEmailTransportSchema,
} from '@rs/validators'

import type { HonoEnv } from '../types'
import { createId } from '../lib/cuid2'
import { getBearerToken, extractAppRole } from '../lib/auth'
import * as rsOffice from '../lib/rs-office'
import { requireAuth, requireAdmin } from '../middleware/auth'

export const adminRouter = new Hono<HonoEnv>()

adminRouter.use('*', requireAuth, requireAdmin)

// ── Devices ──────────────────────────────────────────────────────────────────

adminRouter.get('/devices', async (c) => {
  const db = c.var.db
  const deviceList = await db.query.devices.findMany({
    with: { channels: true },
    orderBy: (d, { desc }) => [desc(d.createdAt)],
  })
  return c.json({ devices: deviceList })
})

adminRouter.post('/devices', zValidator('json', createDeviceSchema), async (c) => {
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

adminRouter.put('/devices/:deviceId', zValidator('json', updateDeviceSchema), async (c) => {
  const db = c.var.db
  const deviceId = c.req.param('deviceId')!
  const data = c.req.valid('json')

  const existing = await db.query.devices.findFirst({
    where: eq(devices.id, deviceId),
  })
  if (!existing) {
    return c.json({ error: 'Device not found' }, 404)
  }

  await db
    .update(devices)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(devices.id, deviceId))

  const updated = await db.query.devices.findFirst({
    where: eq(devices.id, deviceId),
  })

  return c.json({ device: updated })
})

adminRouter.delete('/devices/:deviceId', async (c) => {
  const db = c.var.db
  const deviceId = c.req.param('deviceId')!

  const existing = await db.query.devices.findFirst({
    where: eq(devices.id, deviceId),
  })
  if (!existing) {
    return c.json({ error: 'Device not found' }, 404)
  }

  await db.delete(devices).where(eq(devices.id, deviceId))
  return c.json({ ok: true })
})

// ── Users ────────────────────────────────────────────────────────────────────

adminRouter.get('/users', async (c) => {
  const db = c.var.db
  const token = getBearerToken(c.req.raw.headers)!

  let appUsers: rsOffice.RsOfficeAppUser[]
  try {
    appUsers = await rsOffice.findAppUsers(
      token,
      c.env.RS_OFFICE_APP_ID,
      c.env.RS_OFFICE_APP_ENV_ID,
      c.env.RS_OFFICE_URL,
    )
  } catch (e) {
    console.error('GET /admin/users RS Office error:', e)
    return c.json({ error: 'Failed to fetch users from RS Office' }, 502)
  }

  const allPerms = await db.query.channelPermissions.findMany({
    with: { channel: true },
  })

  const permsByUser = new Map<string, typeof allPerms>()
  for (const perm of allPerms) {
    const list = permsByUser.get(perm.userId) ?? []
    list.push(perm)
    permsByUser.set(perm.userId, list)
  }

  const users = appUsers.map((u) => ({
    id: u.cuid,
    name: u.name,
    email: u.email,
    active: u.active,
    role: extractAppRole(u.roles ?? [], c.env.RS_OFFICE_APP_ENV_ID),
    permissions: (permsByUser.get(u.cuid) ?? []).map((p) => ({
      channelId: p.channelId,
      channelName: p.channel?.name ?? '',
      channelPhone: p.channel?.phoneNumber ?? '',
      permission: p.permission,
    })),
  }))

  return c.json({ users })
})

// ── User permissions ─────────────────────────────────────────────────────────

adminRouter.get('/users/:userId/permissions', async (c) => {
  const db = c.var.db
  const userId = c.req.param('userId')!

  const perms = await db.query.channelPermissions.findMany({
    where: eq(channelPermissions.userId, userId),
    with: { channel: true },
  })

  return c.json({ permissions: perms })
})

adminRouter.post(
  '/users/:userId/permissions',
  zValidator('json', setPermissionSchema),
  async (c) => {
    const db = c.var.db
    const userId = c.req.param('userId')!
    const { channelId, permission } = c.req.valid('json')

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, channelId),
    })
    if (!channel) {
      return c.json({ error: 'Channel not found' }, 404)
    }

    const existing = await db.query.channelPermissions.findFirst({
      where: and(
        eq(channelPermissions.channelId, channelId),
        eq(channelPermissions.userId, userId),
      ),
    })

    if (existing) {
      await db
        .update(channelPermissions)
        .set({ permission })
        .where(eq(channelPermissions.id, existing.id))
    } else {
      await db.insert(channelPermissions).values({
        id: createId(),
        channelId,
        userId,
        permission,
        createdAt: new Date(),
      })
    }

    return c.json({ ok: true })
  },
)

adminRouter.delete('/users/:userId/permissions/:channelId', async (c) => {
  const db = c.var.db
  const userId = c.req.param('userId')!
  const channelId = c.req.param('channelId')!

  await db
    .delete(channelPermissions)
    .where(
      and(
        eq(channelPermissions.channelId, channelId),
        eq(channelPermissions.userId, userId),
      ),
    )

  return c.json({ ok: true })
})

// ── Settings ─────────────────────────────────────────────────────────────────

adminRouter.get('/settings', async (c) => {
  const db = c.var.db
  const settings = await db.query.appSettings.findMany()

  const result: Record<string, string | null> = {}
  for (const s of settings) {
    result[s.key] = s.isSecret ? null : s.value
  }

  return c.json(result)
})

adminRouter.put('/settings', async (c) => {
  const db = c.var.db
  const body = await c.req.json<Record<string, string>>()
  const now = new Date()

  for (const [key, value] of Object.entries(body)) {
    await db
      .insert(appSettings)
      .values({ key, value, isSecret: false, updatedAt: now } as typeof appSettings.$inferInsert)
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value, updatedAt: now },
      })
  }

  return c.json({ ok: true })
})

adminRouter.delete('/settings/:key', async (c) => {
  const db = c.var.db
  const key = c.req.param('key')!

  await db.delete(appSettings).where(eq(appSettings.key, key))

  return c.json({ ok: true })
})

// ── Email Transports ────────────────────────────────────────────────────────

adminRouter.get('/email-transports', async (c) => {
  const db = c.var.db
  const transports = await db.query.emailTransports.findMany({
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })
  return c.json({ transports })
})

adminRouter.post(
  '/email-transports',
  zValidator('json', createEmailTransportSchema),
  async (c) => {
    const db = c.var.db
    const data = c.req.valid('json')
    const id = createId()
    const now = new Date()

    const [existing] = await db.select({ count: count() }).from(emailTransports)
    const isFirst = (existing?.count ?? 0) === 0

    await db.insert(emailTransports).values({
      id,
      name: data.name,
      type: data.type,
      config: data.config,
      isActive: false,
      createdAt: now,
      updatedAt: now,
    })

    if (isFirst) {
      await db
        .update(emailTransports)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(emailTransports.id, id))
    }

    const transport = await db.query.emailTransports.findFirst({
      where: eq(emailTransports.id, id),
    })

    return c.json({ transport }, 201)
  },
)

adminRouter.put(
  '/email-transports/:id',
  zValidator('json', updateEmailTransportSchema),
  async (c) => {
    const db = c.var.db
    const transportId = c.req.param('id')!
    const data = c.req.valid('json')

    const existing = await db.query.emailTransports.findFirst({
      where: eq(emailTransports.id, transportId),
    })
    if (!existing) {
      return c.json({ error: 'Transport not found' }, 404)
    }

    await db
      .update(emailTransports)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(emailTransports.id, transportId))

    const updated = await db.query.emailTransports.findFirst({
      where: eq(emailTransports.id, transportId),
    })

    return c.json({ transport: updated })
  },
)

adminRouter.post('/email-transports/:id/activate', async (c) => {
  const db = c.var.db
  const transportId = c.req.param('id')!

  const existing = await db.query.emailTransports.findFirst({
    where: eq(emailTransports.id, transportId),
  })
  if (!existing) {
    return c.json({ error: 'Transport not found' }, 404)
  }

  await db
    .update(emailTransports)
    .set({ isActive: false, updatedAt: new Date() })

  await db
    .update(emailTransports)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(emailTransports.id, transportId))

  return c.json({ ok: true })
})

adminRouter.post('/email-transports/:id/deactivate', async (c) => {
  const db = c.var.db
  const transportId = c.req.param('id')!

  const existing = await db.query.emailTransports.findFirst({
    where: eq(emailTransports.id, transportId),
  })
  if (!existing) {
    return c.json({ error: 'Transport not found' }, 404)
  }

  await db
    .update(emailTransports)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(emailTransports.id, transportId))

  return c.json({ ok: true })
})

adminRouter.delete('/email-transports/:id', async (c) => {
  const db = c.var.db
  const transportId = c.req.param('id')!

  const existing = await db.query.emailTransports.findFirst({
    where: eq(emailTransports.id, transportId),
  })
  if (!existing) {
    return c.json({ error: 'Transport not found' }, 404)
  }
  if (existing.isActive) {
    return c.json({ error: 'Cannot delete active transport. Deactivate it first.' }, 400)
  }

  await db.delete(emailTransports).where(eq(emailTransports.id, transportId))
  return c.json({ ok: true })
})

// ── Email Logs ───────────────────────────────────────────────────────────────

adminRouter.get('/email-logs', async (c) => {
  const db = c.var.db
  const logs = await db.query.emailLogs.findMany({
    where: inArray(emailLogs.type, ['sms_forward', 'device_offline']),
    orderBy: (l, { desc }) => [desc(l.sentAt)],
    limit: 200,
  })
  return c.json({ logs })
})

// ── Webhook Logs ─────────────────────────────────────────────────────────────

adminRouter.get('/webhook-logs', async (c) => {
  const db = c.var.db
  const logs = await db
    .select({
      id: webhookLogs.id,
      channelId: webhookLogs.channelId,
      channelName: channels.name,
      channelPhone: channels.phoneNumber,
      webhookId: webhookLogs.webhookId,
      url: webhookLogs.url,
      event: webhookLogs.event,
      status: webhookLogs.status,
      statusCode: webhookLogs.statusCode,
      error: webhookLogs.error,
      triggeredAt: webhookLogs.triggeredAt,
    })
    .from(webhookLogs)
    .leftJoin(channels, eq(webhookLogs.channelId, channels.id))
    .orderBy(desc(webhookLogs.triggeredAt))
    .limit(200)
  return c.json({ logs })
})

// ── Connection Logs ──────────────────────────────────────────────────────────

adminRouter.get('/connection-logs', async (c) => {
  const db = c.var.db
  const logs = await db.query.connectionLogs.findMany({
    orderBy: (l, { desc }) => [desc(l.occurredAt)],
    limit: 200,
  })
  return c.json({ logs })
})

// ── SMS Logs ─────────────────────────────────────────────────────────────────

adminRouter.get('/sms-logs', async (c) => {
  const db = c.var.db
  const logs = await db
    .select({
      id: messages.id,
      channelId: messages.channelId,
      channelName: channels.name,
      channelPhone: channels.phoneNumber,
      direction: messages.direction,
      contactNumber: messages.contactNumber,
      content: messages.content,
      status: messages.status,
      statusDetail: messages.statusDetail,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .leftJoin(channels, eq(messages.channelId, channels.id))
    .orderBy(desc(messages.createdAt))
    .limit(500)
  return c.json({ logs })
})

// ── SMS Queue ────────────────────────────────────────────────────────────────

adminRouter.get('/sms-queue', async (c) => {
  const db = c.var.db
  const queued = await db
    .select({
      id: messages.id,
      channelId: messages.channelId,
      channelName: channels.name,
      channelPhone: channels.phoneNumber,
      contactNumber: messages.contactNumber,
      content: messages.content,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .leftJoin(channels, eq(messages.channelId, channels.id))
    .where(eq(messages.status, 'queued'))
    .orderBy(desc(messages.createdAt))
  return c.json({ messages: queued })
})

adminRouter.delete('/sms-queue/:messageId', async (c) => {
  const db = c.var.db
  const messageId = c.req.param('messageId')!

  await db
    .delete(messages)
    .where(and(eq(messages.id, messageId), eq(messages.status, 'queued')))

  return c.json({ ok: true })
})

// ── API Keys ─────────────────────────────────────────────────────────────────

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

adminRouter.get('/api-keys', async (c) => {
  const db = c.var.db
  const keys = await db.query.apiKeys.findMany({
    orderBy: (k, { desc }) => [desc(k.createdAt)],
  })

  return c.json({
    apiKeys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })),
  })
})

adminRouter.post('/api-keys', zValidator('json', createApiKeySchema), async (c) => {
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

adminRouter.delete('/api-keys/:keyId', async (c) => {
  const db = c.var.db
  const keyId = c.req.param('keyId')!

  await db
    .delete(apiKeys)
    .where(eq(apiKeys.id, keyId))

  return c.json({ ok: true })
})

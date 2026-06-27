import { and, eq, inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'

import { channels, channelEmailForwards, channelPermissions, channelWebhooks, messages } from '@rs/db/schema'
import { addEmailForwardSchema, addWebhookSchema, setChannelPermissionSchema, updateChannelSchema, updateWebhookSchema } from '@rs/validators'

import type { HonoEnv } from '../types'
import { createId } from '../lib/cuid2'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { requireAdminOrChannelManager, requireChannelPermission } from '../middleware/channel'

export const channelsRouter = new Hono<HonoEnv>()

channelsRouter.use('*', requireAuth)

channelsRouter.get('/', async (c) => {
  const db = c.var.db
  const user = c.var.user

  let channelList

  if (user.role.split(',').includes('admin')) {
    channelList = await db.query.channels.findMany({
      with: { device: true },
      orderBy: (ch, { desc }) => [desc(ch.createdAt)],
    })
  } else {
    const perms = await db.query.channelPermissions.findMany({
      where: eq(channelPermissions.userId, user.id),
    })
    const channelIds = perms.map((p) => p.channelId)

    if (channelIds.length === 0) {
      return c.json({ channels: [], total: 0 })
    }

    channelList = await db.query.channels.findMany({
      where: inArray(channels.id, channelIds),
      with: { device: true },
      orderBy: (ch, { desc }) => [desc(ch.createdAt)],
    })
  }

  return c.json({ channels: channelList, total: channelList.length })
})

channelsRouter.get('/:channelId', requireChannelPermission('read'), async (c) => {
  const db = c.var.db
  const user = c.var.user
  const channelId = c.req.param('channelId')!

  const channel = await db.query.channels.findFirst({
    where: eq(channels.id, channelId),
    with: { device: true },
  })

  if (!channel) {
    return c.json({ error: 'Channel not found' }, 404)
  }

  const [stats] = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(eq(messages.channelId, channelId))

  let permission: string = 'readwrite'
  if (!user.role.split(',').includes('admin')) {
    const perm = await db.query.channelPermissions.findFirst({
      where: and(
        eq(channelPermissions.channelId, channelId),
        eq(channelPermissions.userId, user.id),
      ),
    })
    if (perm) permission = perm.permission
  }

  return c.json({ channel, messageCount: stats?.count ?? 0, permission })
})

channelsRouter.put('/:channelId', requireAdminOrChannelManager(), zValidator('json', updateChannelSchema), async (c) => {
  const db = c.var.db
  const channelId = c.req.param('channelId')!
  const data = c.req.valid('json')

  const existing = await db.query.channels.findFirst({
    where: eq(channels.id, channelId),
  })
  if (!existing) {
    return c.json({ error: 'Channel not found' }, 404)
  }

  await db
    .update(channels)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(channels.id, channelId))

  const updated = await db.query.channels.findFirst({
    where: eq(channels.id, channelId),
  })

  return c.json({ channel: updated })
})

channelsRouter.delete('/:channelId', requireAdmin, async (c) => {
  const db = c.var.db
  const channelId = c.req.param('channelId')!

  const existing = await db.query.channels.findFirst({
    where: eq(channels.id, channelId),
  })
  if (!existing) {
    return c.json({ error: 'Channel not found' }, 404)
  }

  await db.delete(channels).where(eq(channels.id, channelId))

  return c.json({ ok: true })
})

// ── Email Forwards ──────────────────────────────────────────────────────────

channelsRouter.get('/:channelId/email-forwards', requireAdminOrChannelManager(), async (c) => {
  const db = c.var.db
  const channelId = c.req.param('channelId')!

  const forwards = await db.query.channelEmailForwards.findMany({
    where: eq(channelEmailForwards.channelId, channelId),
    orderBy: (f, { desc }) => [desc(f.createdAt)],
  })

  return c.json({ emailForwards: forwards })
})

channelsRouter.post(
  '/:channelId/email-forwards',
  requireAdminOrChannelManager(),
  zValidator('json', addEmailForwardSchema),
  async (c) => {
    const db = c.var.db
    const channelId = c.req.param('channelId')!
    const { email } = c.req.valid('json')

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, channelId),
    })
    if (!channel) {
      return c.json({ error: 'Channel not found' }, 404)
    }

    const id = createId()
    try {
      await db.insert(channelEmailForwards).values({
        id,
        channelId,
        email,
        createdAt: new Date(),
      })
    } catch (e: any) {
      if (e?.message?.includes('UNIQUE constraint failed')) {
        return c.json({ error: 'This email is already configured for this channel' }, 409)
      }
      throw e
    }

    const forward = await db.query.channelEmailForwards.findFirst({
      where: eq(channelEmailForwards.id, id),
    })

    return c.json({ emailForward: forward }, 201)
  },
)

channelsRouter.delete('/:channelId/email-forwards/:forwardId', requireAdminOrChannelManager(), async (c) => {
  const db = c.var.db
  const forwardId = c.req.param('forwardId')!

  await db.delete(channelEmailForwards).where(eq(channelEmailForwards.id, forwardId))

  return c.json({ ok: true })
})

// ── Webhooks ───────────────────────────────────────────────────────────────

channelsRouter.get('/:channelId/webhooks', requireAdminOrChannelManager(), async (c) => {
  const db = c.var.db
  const channelId = c.req.param('channelId')!

  const webhooks = await db.query.channelWebhooks.findMany({
    where: eq(channelWebhooks.channelId, channelId),
    orderBy: (w, { desc }) => [desc(w.createdAt)],
  })

  return c.json({ webhooks })
})

channelsRouter.post(
  '/:channelId/webhooks',
  requireAdminOrChannelManager(),
  zValidator('json', addWebhookSchema),
  async (c) => {
    const db = c.var.db
    const channelId = c.req.param('channelId')!
    const { url, headers } = c.req.valid('json')

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, channelId),
    })
    if (!channel) {
      return c.json({ error: 'Channel not found' }, 404)
    }

    const existing = await db.query.channelWebhooks.findMany({
      where: eq(channelWebhooks.channelId, channelId),
    })
    if (existing.length >= 3) {
      return c.json({ error: 'Maximum 3 webhooks per channel' }, 400)
    }

    const id = createId()
    try {
      await db.insert(channelWebhooks).values({
        id,
        channelId,
        url,
        headers: headers ?? null,
        createdAt: new Date(),
      })
    } catch (e: any) {
      if (e?.message?.includes('UNIQUE constraint failed')) {
        return c.json({ error: 'This webhook URL is already configured for this channel' }, 409)
      }
      throw e
    }

    const webhook = await db.query.channelWebhooks.findFirst({
      where: eq(channelWebhooks.id, id),
    })

    return c.json({ webhook }, 201)
  },
)

channelsRouter.put(
  '/:channelId/webhooks/:webhookId',
  requireAdminOrChannelManager(),
  zValidator('json', updateWebhookSchema),
  async (c) => {
    const db = c.var.db
    const webhookId = c.req.param('webhookId')!
    const { headers } = c.req.valid('json')

    const webhook = await db.query.channelWebhooks.findFirst({
      where: eq(channelWebhooks.id, webhookId),
    })
    if (!webhook) {
      return c.json({ error: 'Webhook not found' }, 404)
    }

    await db
      .update(channelWebhooks)
      .set({ headers: headers ?? null })
      .where(eq(channelWebhooks.id, webhookId))

    const updated = await db.query.channelWebhooks.findFirst({
      where: eq(channelWebhooks.id, webhookId),
    })

    return c.json({ webhook: updated })
  },
)

channelsRouter.delete('/:channelId/webhooks/:webhookId', requireAdminOrChannelManager(), async (c) => {
  const db = c.var.db
  const webhookId = c.req.param('webhookId')!

  await db.delete(channelWebhooks).where(eq(channelWebhooks.id, webhookId))

  return c.json({ ok: true })
})

// ── Channel Permissions ─────────────────────────────────────────────────────

channelsRouter.get('/:channelId/permissions', requireAdmin, async (c) => {
  const db = c.var.db
  const channelId = c.req.param('channelId')!

  const perms = await db.query.channelPermissions.findMany({
    where: eq(channelPermissions.channelId, channelId),
  })

  return c.json({ permissions: perms })
})

channelsRouter.post(
  '/:channelId/permissions',
  requireAdmin,
  zValidator('json', setChannelPermissionSchema),
  async (c) => {
    const db = c.var.db
    const channelId = c.req.param('channelId')!
    const { userId, permission } = c.req.valid('json')

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

channelsRouter.delete('/:channelId/permissions/:userId', requireAdmin, async (c) => {
  const db = c.var.db
  const channelId = c.req.param('channelId')!
  const userId = c.req.param('userId')!

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

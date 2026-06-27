import { and, desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'

import { messages } from '@rs/db/schema'
import { listConversationsSchema, listMessagesSchema } from '@rs/validators'

import type { HonoEnv } from '../types'
import { requireAuth } from '../middleware/auth'
import { requireChannelPermission } from '../middleware/channel'

export const conversationsRouter = new Hono<HonoEnv>()

conversationsRouter.use('*', requireAuth)

conversationsRouter.get(
  '/:channelId/conversations',
  requireChannelPermission('read'),
  zValidator('query', listConversationsSchema),
  async (c) => {
    const db = c.var.db
    const channelId = c.req.param('channelId')!
    const { page, limit } = c.req.valid('query')
    const offset = (page - 1) * limit

    const convos = await db
      .select({
        contactNumber: messages.contactNumber,
        lastMessage: sql<string>`(SELECT m2.content FROM messages m2 WHERE m2.channel_id = ${channelId} AND m2.contact_number = messages.contact_number ORDER BY m2.created_at DESC LIMIT 1)`,
        lastMessageAt: sql<number>`max(${messages.createdAt})`,
        messageCount: sql<number>`count(*)`,
      })
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .groupBy(messages.contactNumber)
      .orderBy(sql`max(${messages.createdAt}) DESC`)
      .limit(limit)
      .offset(offset)

    const [total] = await db
      .select({
        count: sql<number>`count(distinct ${messages.contactNumber})`,
      })
      .from(messages)
      .where(eq(messages.channelId, channelId))

    return c.json({
      conversations: convos,
      total: total?.count ?? 0,
      page,
      limit,
    })
  },
)

conversationsRouter.delete(
  '/:channelId/conversations/:contactNumber',
  requireChannelPermission('write'),
  async (c) => {
    const db = c.var.db
    const channelId = c.req.param('channelId')!
    const contactNumber = decodeURIComponent(c.req.param('contactNumber')!)

    const [existing] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.channelId, channelId),
          eq(messages.contactNumber, contactNumber),
        ),
      )

    if (!existing?.count) {
      return c.json({ error: 'Conversation not found' }, 404)
    }

    await db
      .delete(messages)
      .where(
        and(
          eq(messages.channelId, channelId),
          eq(messages.contactNumber, contactNumber),
        ),
      )

    return c.json({ ok: true })
  },
)

conversationsRouter.get(
  '/:channelId/conversations/:contactNumber/messages',
  requireChannelPermission('read'),
  zValidator('query', listMessagesSchema),
  async (c) => {
    const db = c.var.db
    const channelId = c.req.param('channelId')!
    const contactNumber = decodeURIComponent(c.req.param('contactNumber')!)
    const { page, limit, direction } = c.req.valid('query')
    const offset = (page - 1) * limit

    const conditions = [
      eq(messages.channelId, channelId),
      eq(messages.contactNumber, contactNumber),
    ]

    if (direction) {
      conditions.push(eq(messages.direction, direction))
    }

    const msgs = await db.query.messages.findMany({
      where: and(...conditions),
      orderBy: [desc(messages.createdAt)],
      limit,
      offset,
    })

    const [total] = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(...conditions))

    return c.json({
      messages: msgs,
      total: total?.count ?? 0,
      page,
      limit,
    })
  },
)

import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'

import { channels, messages } from '@rs/db/schema'
import { sendMessageSchema } from '@rs/validators'

import type { HonoEnv } from '../types'
import { createId } from '../lib/cuid2'
import { requireAuth } from '../middleware/auth'
import { requireChannelPermission } from '../middleware/channel'

export const messagesRouter = new Hono<HonoEnv>()

messagesRouter.use('*', requireAuth)

messagesRouter.post(
  '/:channelId/messages',
  requireChannelPermission('write'),
  zValidator('json', sendMessageSchema),
  async (c) => {
    const db = c.var.db
    const channelId = c.req.param('channelId')!
    const user = c.var.user
    const { contactNumber, content } = c.req.valid('json')

    const channel = await db.query.channels.findFirst({
      where: eq(channels.id, channelId),
      with: { device: true },
    })
    if (!channel) {
      return c.json({ error: 'Channel not found' }, 404)
    }

    const countryCode = channel.device?.countryCode ?? null
    let normalizedContact = contactNumber
    if (countryCode && !contactNumber.startsWith('+')) {
      const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`
      normalizedContact = `${code}${contactNumber.replace(/\D/g, '')}`
    }

    const id = createId()
    const now = new Date()

    const [msg] = await db.insert(messages).values({
      id,
      channelId,
      direction: 'outbound',
      contactNumber: normalizedContact,
      content,
      status: 'queued',
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    }).returning()

    return c.json({ message: msg }, 201)
  },
)

messagesRouter.get(
  '/:channelId/messages/:messageId',
  requireChannelPermission('read'),
  async (c) => {
    const db = c.var.db
    const messageId = c.req.param('messageId')!

    const msg = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    })

    if (!msg) {
      return c.json({ error: 'Message not found' }, 404)
    }

    return c.json({ message: msg })
  },
)

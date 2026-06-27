import { and, eq } from 'drizzle-orm'
import type { Context, Next } from 'hono'

import { channelPermissions } from '@rs/db/schema'

import type { HonoEnv } from '../types'

function permissionLevel(p: string): number {
  if (p === 'readwrite' || p === 'write') return 2
  return 1 // reader, sender, manager, read
}

export function requireChannelPermission(required: 'read' | 'write' | 'manage') {
  const requiredLevel = required === 'manage' ? 3 : required === 'write' ? 2 : 1

  return async (c: Context<HonoEnv>, next: Next) => {
    const user = c.var.user
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    if (user.role.split(',').includes('admin')) {
      return next()
    }

    const channelId = c.req.param('channelId')!
    if (!channelId) {
      return c.json({ error: 'Channel ID required' }, 400)
    }

    const db = c.var.db
    const perm = await db.query.channelPermissions.findFirst({
      where: and(
        eq(channelPermissions.channelId, channelId),
        eq(channelPermissions.userId, user.id),
      ),
    })

    if (!perm) {
      return c.json({ error: 'No access to this channel' }, 403)
    }

    if (permissionLevel(perm.permission) < requiredLevel) {
      return c.json({ error: `Requires ${required} permission` }, 403)
    }

    await next()
  }
}

export function requireAdminOrChannelManager() {
  return async (c: Context<HonoEnv>, next: Next) => {
    const user = c.var.user
    if (!user) return c.json({ error: 'Unauthorized' }, 401)
    if (user.role.split(',').includes('admin')) return next()

    const channelId = c.req.param('channelId')!
    if (!channelId) return c.json({ error: 'Channel ID required' }, 400)

    const db = c.var.db
    const perm = await db.query.channelPermissions.findFirst({
      where: and(
        eq(channelPermissions.channelId, channelId),
        eq(channelPermissions.userId, user.id),
      ),
    })

    if (!perm || perm.permission !== 'manager') {
      return c.json({ error: 'Admin role or channel manager permission required' }, 403)
    }

    return next()
  }
}

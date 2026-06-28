import { and, asc, eq, isNull, lte, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'

import { appSettings, channelEmailForwards, channelWebhooks, channels, connectionLogs, devices, emailLogs, emailTransports, messages, webhookLogs } from '@rs/db/schema'
import {
  incomingMessageSchema,
  markSentSchema,
  updateMessageStatusSchema,
} from '@rs/validators'

import type { HonoEnv } from '../types'
import { createId } from '../lib/cuid2'
import { requireApiKey } from '../middleware/api-key'

type EmailTransportRow = typeof emailTransports.$inferSelect

async function sendEmailViaTransport(
  transport: EmailTransportRow,
  to: string,
  subject: string,
  html: string,
): Promise<{ status: 'success' | 'error'; error?: string }> {
  const config = transport.config as Record<string, unknown>
  const fromName = (config.fromName as string) || 'SMS Gateway'

  try {
    let res: Response

    if (transport.type === 'api') {
      const url = config.url as string
      const customHeaders = (config.headers as Record<string, string>) ?? {}
      let payloadOverrides: Record<string, unknown> = {}
      try {
        const raw = (config.payloadOverrides as string) || ''
        if (raw.trim()) payloadOverrides = JSON.parse(raw)
      } catch { /* ignore invalid */ }

      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...customHeaders },
        body: JSON.stringify({ fromName, to, subject, html, ...payloadOverrides }),
      })
    } else if (transport.type === 'smtp') {
      const smtpUrl = config.host as string
      const smtpPort = config.port as number
      const fromEmail = config.fromEmail as string

      res = await fetch(`https://${smtpUrl}:${smtpPort}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to,
          subject,
          html,
          auth: { username: config.username, password: config.password },
        }),
      })
    } else if (transport.type === 'cloudflare') {
      const fromEmail = config.fromEmail as string

      res = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: fromEmail, name: fromName },
          subject,
          content: [{ type: 'text/html', value: html }],
        }),
      })
    } else {
      return { status: 'error', error: 'Unknown transport type' }
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { status: 'error', error: `HTTP ${res.status}${body ? ': ' + body.slice(0, 200) : ''}` }
    }

    return { status: 'success' }
  } catch (err) {
    return { status: 'error', error: String(err) }
  }
}

function normalizeWithCountryCode(phone: string, countryCode: string | null): string {
  if (!countryCode || phone.startsWith('+')) return phone
  const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`
  const digits = phone.replace(/\D/g, '')
  return `${code}${digits}`
}

export const internalRouter = new Hono<HonoEnv>()

internalRouter.use('*', requireApiKey)

internalRouter.post('/messages', zValidator('json', incomingMessageSchema), async (c) => {
  const db = c.var.db
  const { sourceAddr, destinationAddr, content, deviceId } = c.req.valid('json')

  let countryCode: string | null = null
  if (deviceId) {
    const device = await db.query.devices.findFirst({
      where: eq(devices.id, deviceId),
    })
    countryCode = device?.countryCode ?? null
  }

  const normalizedSource = normalizeWithCountryCode(sourceAddr, countryCode)

  let channel = await db.query.channels.findFirst({
    where: eq(channels.phoneNumber, destinationAddr),
  })

  if (!channel) {
    const channelId = createId()
    const now = new Date()
    await db.insert(channels).values({
      id: channelId,
      phoneNumber: destinationAddr,
      name: destinationAddr,
      deviceId: deviceId ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    })
    channel = await db.query.channels.findFirst({
      where: eq(channels.id, channelId),
    })
  } else if (deviceId && !channel.deviceId) {
    await db
      .update(channels)
      .set({ deviceId, updatedAt: new Date() })
      .where(eq(channels.id, channel.id))
  }

  if (!channel) {
    return c.json({ error: 'Failed to create channel' }, 500)
  }

  const id = createId()
  const now = new Date()

  await db.insert(messages).values({
    id,
    channelId: channel.id,
    direction: 'inbound',
    contactNumber: normalizedSource,
    content,
    status: 'received',
    createdAt: now,
    updatedAt: now,
  })

  const msg = await db.query.messages.findFirst({
    where: eq(messages.id, id),
  })

  const notifyPromise = (async () => {
    try {
      const activeTransport = await db.query.emailTransports.findFirst({
        where: eq(emailTransports.isActive, true),
      })

      if (activeTransport) {
        const forwards = await db.query.channelEmailForwards.findMany({
          where: eq(channelEmailForwards.channelId, channel.id),
        })

        if (forwards.length > 0) {
          const date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })
          const subject = `SMS from ${normalizedSource}`
          const html = [
            `<p><strong>From:</strong> ${normalizedSource}</p>`,
            `<p><strong>Channel:</strong> ${channel.name} (${channel.phoneNumber})</p>`,
            `<p><strong>Date:</strong> ${date}</p>`,
            `<p><strong>Message:</strong> ${content}</p>`,
          ].join('\n')

          const sendResults = await Promise.all(
            forwards.map((fwd) => sendEmailViaTransport(activeTransport, fwd.email, subject, html)),
          )

          const now = new Date()
          await Promise.all(
            forwards.map((fwd, i) =>
              db.insert(emailLogs).values({
                id: createId(),
                type: 'sms_forward',
                recipient: fwd.email,
                subject,
                channelId: channel.id,
                status: sendResults[i]!.status,
                error: sendResults[i]!.error ?? null,
                sentAt: now,
              }),
            ),
          )
        }
      }

      const webhooks = await db.query.channelWebhooks.findMany({
        where: eq(channelWebhooks.channelId, channel.id),
      })

      if (webhooks.length > 0) {
        const event = 'sms.received'
        const payload = JSON.stringify({
          event,
          channelId: channel.id,
          channelName: channel.name,
          channelPhone: channel.phoneNumber,
          from: normalizedSource,
          content,
          receivedAt: new Date().toISOString(),
        })

        const webhookResults = await Promise.allSettled(
          webhooks.map((wh) => {
            const hdrs: Record<string, string> = { 'Content-Type': 'application/json' }
            if (wh.headers && typeof wh.headers === 'object') {
              Object.assign(hdrs, wh.headers)
            }
            return fetch(wh.url, {
              method: 'POST',
              headers: hdrs,
              body: payload,
            })
          }),
        )

        const now = new Date()
        await Promise.all(
          webhooks.map(async (wh, i) => {
            const result = webhookResults[i]!
            let status: 'success' | 'error' = 'error'
            let statusCode: number | null = null
            let error: string | null = null

            if (result.status === 'fulfilled') {
              statusCode = result.value.status
              status = result.value.ok ? 'success' : 'error'
              if (!result.value.ok) {
                error = `HTTP ${result.value.status}`
              }
            } else {
              error = String(result.reason)
            }

            return db.insert(webhookLogs).values({
              id: createId(),
              channelId: channel.id,
              webhookId: wh.id,
              url: wh.url,
              event,
              status,
              statusCode,
              error,
              triggeredAt: now,
            })
          }),
        )
      }
    } catch {
      // Never let notification failures affect SMS receipt
    }
  })()
  c.executionCtx.waitUntil(notifyPromise)

  return c.json({ message: msg }, 201)
})

internalRouter.get('/messages/pending', async (c) => {
  const db = c.var.db

  const delaySetting = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, 'queue_delay_seconds'),
  })
  const delaySecs = delaySetting ? (parseInt(delaySetting.value, 10) || 0) : 0

  const baseCondition = delaySecs > 0
    ? and(eq(messages.status, 'queued'), lte(messages.createdAt, new Date(Date.now() - delaySecs * 1000)))
    : eq(messages.status, 'queued')

  const pending = await db
    .select({
      id: messages.id,
      channelId: messages.channelId,
      contactNumber: messages.contactNumber,
      content: messages.content,
      channelPhone: channels.phoneNumber,
      deviceId: channels.deviceId,
    })
    .from(messages)
    .innerJoin(channels, eq(messages.channelId, channels.id))
    .leftJoin(devices, eq(channels.deviceId, devices.id))
    .where(and(baseCondition, or(isNull(channels.deviceId), eq(devices.isActive, true))))
    .orderBy(asc(messages.createdAt))
    .limit(50)

  return c.json({
    messages: pending.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      sourceAddr: m.channelPhone,
      destinationAddr: m.contactNumber,
      content: m.content,
      deviceId: m.deviceId,
    })),
  })
})

internalRouter.patch(
  '/messages/:messageId/sent',
  zValidator('json', markSentSchema),
  async (c) => {
    const db = c.var.db
    const messageId = c.req.param('messageId')!
    const { smppMessageId } = c.req.valid('json')

    await db
      .update(messages)
      .set({
        status: 'sent',
        smppMessageId,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId))

    return c.json({ ok: true })
  },
)

internalRouter.patch('/messages/:messageId/failed', async (c) => {
  const db = c.var.db
  const messageId = c.req.param('messageId')!
  const { detail } = await c.req.json<{ detail?: string }>()

  await db
    .update(messages)
    .set({ status: 'failed', statusDetail: detail ?? null, updatedAt: new Date() })
    .where(eq(messages.id, messageId))

  return c.json({ ok: true })
})

internalRouter.patch(
  '/messages/status/:smppMessageId',
  zValidator('json', updateMessageStatusSchema),
  async (c) => {
    const db = c.var.db
    const smppMessageId = c.req.param('smppMessageId')!
    const { status, statusDetail } = c.req.valid('json')

    const msg = await db.query.messages.findFirst({
      where: eq(messages.smppMessageId, smppMessageId),
    })

    if (!msg) {
      return c.json({ error: 'Message not found' }, 404)
    }

    await db
      .update(messages)
      .set({
        status,
        statusDetail: statusDetail ?? null,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, msg.id))

    return c.json({ ok: true })
  },
)

internalRouter.patch('/devices/:deviceId/channel-status', async (c) => {
  const db = c.var.db
  const deviceId = c.req.param('deviceId')!
  const { isActive } = await c.req.json<{ isActive: boolean }>()

  await db
    .update(channels)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(channels.deviceId, deviceId))

  return c.json({ ok: true })
})

internalRouter.patch('/devices/:deviceId/gateway-status', async (c) => {
  const db = c.var.db
  const deviceId = c.req.param('deviceId')!
  const { connected } = await c.req.json<{ connected: boolean }>()
  const now = new Date()

  await db
    .insert(appSettings)
    .values({
      key: `gateway_connected_${deviceId}`,
      value: connected ? 'true' : 'false',
      isSecret: false,
      updatedAt: now,
    } as typeof appSettings.$inferInsert)
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: connected ? 'true' : 'false', updatedAt: now },
    })

  return c.json({ ok: true })
})

internalRouter.get('/devices', async (c) => {
  const db = c.var.db

  const activeDevices = await db.query.devices.findMany({
    where: eq(devices.isActive, true),
    with: { channels: true },
  })

  return c.json({
    devices: activeDevices.map((d) => ({
      id: d.id,
      name: d.name,
      smppHost: d.smppHost,
      smppPort: d.smppPort,
      smppSystemId: d.smppSystemId,
      smppPassword: d.smppPassword,
      countryCode: d.countryCode,
      channels: d.channels.map((ch) => ({
        id: ch.id,
        phoneNumber: ch.phoneNumber,
      })),
    })),
  })
})

internalRouter.get('/settings', async (c) => {
  const db = c.var.db
  const keys = ['offline_timeout_seconds', 'offline_alert_email']
  const rows = await db.query.appSettings.findMany({
    where: (s, { inArray }) => inArray(s.key, keys),
  })
  const result: Record<string, string> = {}
  for (const row of rows) result[row.key] = row.value
  return c.json(result)
})

internalRouter.post('/devices/:deviceId/connection-event', async (c) => {
  const db = c.var.db
  const deviceId = c.req.param('deviceId')!
  const { type, deviceName } = await c.req.json<{ type: string; deviceName: string }>()

  await db.insert(connectionLogs).values({
    id: createId(),
    deviceId,
    deviceName: deviceName || deviceId,
    type: type === 'smpp_connected' ? 'connected' : 'disconnected',
    occurredAt: new Date(),
  })

  return c.json({ ok: true })
})

internalRouter.post('/devices/:deviceId/offline-alert', async (c) => {
  const db = c.var.db
  const deviceId = c.req.param('deviceId')!

  const [device, emailSetting, activeTransport] = await Promise.all([
    db.query.devices.findFirst({ where: eq(devices.id, deviceId) }),
    db.query.appSettings.findFirst({ where: eq(appSettings.key, 'offline_alert_email') }),
    db.query.emailTransports.findFirst({ where: eq(emailTransports.isActive, true) }),
  ])

  const alertEmail = emailSetting?.value
  if (!alertEmail || !activeTransport) {
    return c.json({ ok: true, skipped: true })
  }

  const deviceName = device?.name ?? deviceId
  const subject = `GoIP Device Offline: ${deviceName}`
  const date = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })
  const html = [
    `<p><strong>Device:</strong> ${deviceName}</p>`,
    `<p><strong>Status:</strong> Offline</p>`,
    `<p><strong>Detected at:</strong> ${date}</p>`,
    `<p>The GoIP device has gone offline. Please check the SMPP connection.</p>`,
  ].join('\n')

  const result = await sendEmailViaTransport(activeTransport, alertEmail, subject, html)

  await db.insert(emailLogs).values({
    id: createId(),
    type: 'device_offline',
    recipient: alertEmail,
    subject,
    deviceId,
    status: result.status,
    error: result.error ?? null,
    sentAt: new Date(),
  })

  return c.json({ ok: true })
})

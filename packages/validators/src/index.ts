import { z } from "zod";

// ── Device validators ────────────────────────────────────────────────────────

export const createDeviceSchema = z.object({
  name: z.string().min(1, "Device name is required"),
  smppHost: z.string().min(1, "SMPP host is required"),
  smppPort: z.coerce.number().int().positive().default(2775),
  smppSystemId: z.string().min(1, "SMPP system ID is required"),
  smppPassword: z.string().min(1, "SMPP password is required"),
  countryCode: z.string().optional(),
});

export const updateDeviceSchema = createDeviceSchema.partial();

// ── Channel validators ───────────────────────────────────────────────────────

export const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  deviceId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const addEmailForwardSchema = z.object({
  email: z.string().email("Valid email address is required"),
});

export const addWebhookSchema = z.object({
  url: z.string().url("Valid URL is required"),
  headers: z.record(z.string(), z.string()).optional(),
});

export const updateWebhookSchema = z.object({
  headers: z.record(z.string(), z.string()).optional(),
});

// ── Message validators ───────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  contactNumber: z.string().min(1, "Recipient number is required"),
  content: z.string().min(1, "Message content is required").max(1600),
});

export const listMessagesSchema = z.object({
  direction: z.enum(["inbound", "outbound"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const listConversationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// ── Permission validators ────────────────────────────────────────────────────

export const setPermissionSchema = z.object({
  channelId: z.string().min(1, "Channel is required"),
  permission: z.enum(["reader", "sender", "manager"]),
});

export const setChannelPermissionSchema = z.object({
  userId: z.string().min(1, "User is required"),
  permission: z.enum(["reader", "sender", "manager"]),
});

// ── Settings validators ──────────────────────────────────────────────────────

export const setupSchema = z.object({
  smppHost: z.string().optional(),
  smppPort: z.coerce.number().int().positive().optional(),
  smppSystemId: z.string().optional(),
  smppPassword: z.string().optional(),
});

// ── Internal validators (SMPP app → API) ─────────────────────────────────────

export const incomingMessageSchema = z.object({
  sourceAddr: z.string().min(1),
  destinationAddr: z.string().min(1),
  content: z.string().min(1),
  deviceId: z.string().optional(),
});

export const markSentSchema = z.object({
  smppMessageId: z.string().min(1),
});

export const updateMessageStatusSchema = z.object({
  status: z.enum(["sent", "delivered", "failed"]),
  statusDetail: z.string().optional(),
});

// ── Email Transport validators ──────────────────────────────────────────────

const apiTransportConfigSchema = z.object({
  url: z.string().url("Valid URL is required"),
  headers: z.record(z.string(), z.string()).optional(),
  fromName: z.string().min(1).optional(),
  payloadOverrides: z.string().optional(),
});

const smtpTransportConfigSchema = z.object({
  host: z.string().min(1, "SMTP host is required"),
  port: z.coerce.number().int().positive().default(587),
  secure: z.boolean().default(true),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  fromEmail: z.string().email("Valid from email is required"),
  fromName: z.string().min(1).optional(),
});

const cloudflareTransportConfigSchema = z.object({
  fromEmail: z.string().email("Valid from email is required"),
  fromName: z.string().min(1).optional(),
  destinationAddress: z.string().email("Valid destination email is required"),
});

export const emailTransportTypeSchema = z.enum(["api", "smtp", "cloudflare"]);

export const createEmailTransportSchema = z.object({
  name: z.string().min(1, "Transport name is required"),
  type: emailTransportTypeSchema,
  config: z.union([
    apiTransportConfigSchema,
    smtpTransportConfigSchema,
    cloudflareTransportConfigSchema,
  ]),
});

export const updateEmailTransportSchema = z.object({
  name: z.string().min(1).optional(),
  config: z
    .union([
      apiTransportConfigSchema,
      smtpTransportConfigSchema,
      cloudflareTransportConfigSchema,
    ])
    .optional(),
});

export {
  apiTransportConfigSchema,
  smtpTransportConfigSchema,
  cloudflareTransportConfigSchema,
};

// ── API Key validators ───────────────────────────────────────────────────────

export const createApiKeySchema = z.object({
  name: z.string().min(1, "API key name is required"),
});

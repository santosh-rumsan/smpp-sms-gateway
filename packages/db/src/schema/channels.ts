import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { devices } from "./devices";
import { messages } from "./messages";
import { channelPermissions } from "./permissions";

export const channels = sqliteTable("channels", {
  id: text("id").primaryKey(),
  deviceId: text("device_id").references(() => devices.id, {
    onDelete: "set null",
  }),
  phoneNumber: text("phone_number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const channelsRelations = relations(channels, ({ one, many }) => ({
  device: one(devices, {
    fields: [channels.deviceId],
    references: [devices.id],
  }),
  messages: many(messages),
  permissions: many(channelPermissions),
  emailForwards: many(channelEmailForwards),
  webhooks: many(channelWebhooks),
}));

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;

export const channelEmailForwards = sqliteTable(
  "channel_email_forwards",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("channel_email_forwards_channel_email_idx").on(
      table.channelId,
      table.email,
    ),
  ],
);

export const channelEmailForwardsRelations = relations(
  channelEmailForwards,
  ({ one }) => ({
    channel: one(channels, {
      fields: [channelEmailForwards.channelId],
      references: [channels.id],
    }),
  }),
);

export type ChannelEmailForward = typeof channelEmailForwards.$inferSelect;
export type NewChannelEmailForward = typeof channelEmailForwards.$inferInsert;

export const channelWebhooks = sqliteTable(
  "channel_webhooks",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    headers: text("headers", { mode: "json" }).$type<Record<string, string>>(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("channel_webhooks_channel_url_idx").on(
      table.channelId,
      table.url,
    ),
  ],
);

export const channelWebhooksRelations = relations(
  channelWebhooks,
  ({ one }) => ({
    channel: one(channels, {
      fields: [channelWebhooks.channelId],
      references: [channels.id],
    }),
  }),
);

export type ChannelWebhook = typeof channelWebhooks.$inferSelect;
export type NewChannelWebhook = typeof channelWebhooks.$inferInsert;

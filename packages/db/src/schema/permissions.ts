import { relations, sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

import { channels } from "./channels";

export const channelPermissions = sqliteTable(
  "channel_permissions",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    permission: text("permission", {
      enum: ["reader", "sender", "manager", "read", "write", "readwrite"],
    }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    uniqueIndex("idx_channel_user").on(table.channelId, table.userId),
  ],
);

export const channelPermissionsRelations = relations(
  channelPermissions,
  ({ one }) => ({
    channel: one(channels, {
      fields: [channelPermissions.channelId],
      references: [channels.id],
    }),
  }),
);

export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type ChannelPermission = typeof channelPermissions.$inferSelect;
export type NewChannelPermission = typeof channelPermissions.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

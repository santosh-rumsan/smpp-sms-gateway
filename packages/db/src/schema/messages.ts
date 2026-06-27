import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { channels } from "./channels";

export const messages = sqliteTable(
  "messages",
  {
    id: text("id").primaryKey(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    direction: text("direction", { enum: ["inbound", "outbound"] }).notNull(),
    contactNumber: text("contact_number").notNull(),
    content: text("content").notNull(),
    smppMessageId: text("smpp_message_id"),
    status: text("status", {
      enum: ["queued", "sent", "delivered", "failed", "received"],
    }).notNull(),
    statusDetail: text("status_detail"),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (table) => [
    index("idx_messages_channel").on(table.channelId),
    index("idx_messages_channel_contact").on(
      table.channelId,
      table.contactNumber,
    ),
    index("idx_messages_smpp_id").on(table.smppMessageId),
    index("idx_messages_status").on(table.status),
  ],
);

export const messagesRelations = relations(messages, ({ one }) => ({
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
}));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

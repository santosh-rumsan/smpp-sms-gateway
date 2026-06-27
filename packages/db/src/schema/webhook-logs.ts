import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const webhookLogs = sqliteTable("webhook_logs", {
  id: text("id").primaryKey(),
  channelId: text("channel_id").notNull(),
  webhookId: text("webhook_id"),
  url: text("url").notNull(),
  event: text("event").notNull(),
  status: text("status", { enum: ["success", "error"] }).notNull(),
  statusCode: integer("status_code"),
  error: text("error"),
  triggeredAt: integer("triggered_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type WebhookLog = typeof webhookLogs.$inferSelect;
export type NewWebhookLog = typeof webhookLogs.$inferInsert;

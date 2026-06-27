import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const emailLogs = sqliteTable("email_logs", {
  id: text("id").primaryKey(),
  type: text("type", { enum: ["sms_forward", "device_offline", "smpp_connected", "smpp_disconnected"] }).notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  deviceId: text("device_id"),
  channelId: text("channel_id"),
  status: text("status", { enum: ["success", "error"] }).notNull(),
  error: text("error"),
  sentAt: integer("sent_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;

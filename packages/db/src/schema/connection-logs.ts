import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const connectionLogs = sqliteTable("connection_logs", {
  id: text("id").primaryKey(),
  deviceId: text("device_id"),
  deviceName: text("device_name"),
  type: text("type", { enum: ["connected", "disconnected"] }).notNull(),
  occurredAt: integer("occurred_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type ConnectionLog = typeof connectionLogs.$inferSelect;
export type NewConnectionLog = typeof connectionLogs.$inferInsert;

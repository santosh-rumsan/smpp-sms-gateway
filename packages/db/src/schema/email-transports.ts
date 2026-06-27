import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const emailTransports = sqliteTable("email_transports", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["api", "smtp", "cloudflare"] }).notNull(),
  config: text("config", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type EmailTransport = typeof emailTransports.$inferSelect;
export type NewEmailTransport = typeof emailTransports.$inferInsert;

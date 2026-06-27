import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { channels } from "./channels";

export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  smppHost: text("smpp_host").notNull(),
  smppPort: integer("smpp_port").notNull().default(2775),
  smppSystemId: text("smpp_system_id").notNull(),
  smppPassword: text("smpp_password").notNull(),
  countryCode: text("country_code"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const devicesRelations = relations(devices, ({ many }) => ({
  channels: many(channels),
}));

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;

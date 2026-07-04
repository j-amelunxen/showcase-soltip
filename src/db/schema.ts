import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  handle: text("handle").primaryKey(),
  wallet: text("wallet").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type Profile = typeof profiles.$inferSelect;

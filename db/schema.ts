import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable("workspaces", {
  owner: text("owner").primaryKey(),
  data: text("data").notNull(),
  revision: integer("revision").notNull().default(1),
  updated: text("updated").notNull(),
});
export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: integer("size").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("idx_assets_owner").on(t.owner)],
);
export const businesses = sqliteTable("businesses", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  templates: text("templates").notNull().default("[]"),
  created: text("created").notNull(),
});
export const creditAccounts = sqliteTable("credit_accounts", {
  owner: text("owner").primaryKey(),
  balance: integer("balance").notNull().default(0),
});
export const creditLedger = sqliteTable(
  "credit_ledger",
  {
    id: text("id").primaryKey(),
    owner: text("owner").notNull(),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    created: text("created").notNull(),
  },
  (t) => [index("idx_ledger_owner").on(t.owner)],
);
export const topups = sqliteTable("topups", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  email: text("email").notNull(),
  credits: integer("credits").notNull(),
  reference: text("reference").notNull(),
  status: text("status").notNull().default("pending"),
  created: text("created").notNull(),
  reviewer: text("reviewer"),
});
export const enhancements = sqliteTable("enhancements", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  source: text("source").notNull(),
  status: text("status").notNull(),
  request: text("request"),
  result: text("result"),
  created: text("created").notNull(),
});

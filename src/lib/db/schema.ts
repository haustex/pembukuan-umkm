import {
  pgTable,
  pgEnum,
  serial,
  integer,
  bigint,
  text,
  boolean,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["owner", "staff", "viewer"]);
export const directionEnum = pgEnum("direction", ["in", "out"]);
export const taxSchemeEnum = pgEnum("tax_scheme", ["pt_umum", "pt_perorangan", "op"]);
export const categoryGroupEnum = pgEnum("category_group", [
  "pendapatan",
  "hpp",
  "beban",
  "beban_nd",
  "lain",
  "pajak",
  "aset",
  "pinjaman",
  "modal",
  "transfer",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("staff"),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256(token)
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  openingBalance: bigint("opening_balance", { mode: "number" }).notNull().default(0),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  group: categoryGroupEnum("group").notNull(),
  description: text("description").notNull().default(""),
  finalTaxed: boolean("final_taxed").notNull().default(false),
  active: boolean("active").notNull().default(true),
});

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    description: text("description").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    direction: directionEnum("direction").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    ref: text("ref").notNull().default(""),
    note: text("note").notNull().default(""),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tx_date_idx").on(t.date),
    index("tx_category_idx").on(t.categoryId),
    index("tx_account_idx").on(t.accountId),
  ],
);

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  businessName: text("business_name").notNull().default("Usaha Saya"),
  taxScheme: taxSchemeEnum("tax_scheme").notNull().default("pt_umum"),
  finalRateBp: integer("final_rate_bp").notNull().default(50), // 0,50%
  opExemptAmount: bigint("op_exempt_amount", { mode: "number" }).notNull().default(500_000_000),
  corpRateBp: integer("corp_rate_bp").notNull().default(2200), // 22%
  facilityLimit: bigint("facility_limit", { mode: "number" }).notNull().default(4_800_000_000),
  startDate: date("start_date", { mode: "string" }).notNull().default("2026-01-01"),
});

export const yearlyAdjustments = pgTable("yearly_adjustments", {
  year: integer("year").primaryKey(),
  depreciation: bigint("depreciation", { mode: "number" }).notNull().default(0),
});

export type User = typeof users.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
export type CategoryGroup = (typeof categoryGroupEnum.enumValues)[number];
export type TaxScheme = (typeof taxSchemeEnum.enumValues)[number];
export type Settings = typeof settings.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Account = typeof accounts.$inferSelect;

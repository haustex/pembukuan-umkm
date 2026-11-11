import path from "node:path";
import bcrypt from "bcryptjs";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { count } from "drizzle-orm";
import { db } from "./db";
import { accounts, categories, settings, users } from "./db/schema";
import { DEFAULT_ACCOUNTS, DEFAULT_CATEGORIES } from "./constants";

/** Jalan sekali saat server start: migrasi DB, seed data awal, buat akun owner pertama. */
export async function bootstrap() {
  const migrationsFolder = path.join(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });

  await db
    .insert(settings)
    .values({ id: 1, businessName: process.env.BUSINESS_NAME?.trim() || "Usaha Saya" })
    .onConflictDoNothing();

  const [{ n: catCount }] = await db.select({ n: count() }).from(categories);
  if (catCount === 0) {
    await db.insert(categories).values(
      DEFAULT_CATEGORIES.map((c) => ({ ...c, finalTaxed: c.finalTaxed ?? false })),
    );
    console.log(`[bootstrap] ${DEFAULT_CATEGORIES.length} kategori dibuat`);
  }

  const [{ n: accCount }] = await db.select({ n: count() }).from(accounts);
  if (accCount === 0) {
    const fromEnv = (process.env.SEED_ACCOUNTS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const names = fromEnv.length ? fromEnv : DEFAULT_ACCOUNTS;
    await db.insert(accounts).values(names.map((name, i) => ({ name, sort: i })));
    console.log(`[bootstrap] ${names.length} akun kas dibuat`);
  }

  const [{ n: userCount }] = await db.select({ n: count() }).from(users);
  if (userCount === 0) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      console.warn("[bootstrap] Belum ada user. Set ADMIN_EMAIL & ADMIN_PASSWORD lalu restart.");
      return;
    }
    if (password.length < 10) {
      console.warn("[bootstrap] ADMIN_PASSWORD minimal 10 karakter. Owner tidak dibuat.");
      return;
    }
    await db.insert(users).values({
      name: process.env.ADMIN_NAME?.trim() || "Owner",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "owner",
    });
    console.log(`[bootstrap] Owner ${email} dibuat`);
  }
}

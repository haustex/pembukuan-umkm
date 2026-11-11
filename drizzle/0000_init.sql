CREATE TYPE "public"."category_group" AS ENUM('pendapatan', 'hpp', 'beban', 'beban_nd', 'lain', 'pajak', 'aset', 'pinjaman', 'modal', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."direction" AS ENUM('in', 'out');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'staff', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."tax_scheme" AS ENUM('pt_umum', 'pt_perorangan', 'op');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"opening_balance" bigint DEFAULT 0 NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "accounts_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"group" "category_group" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"final_taxed" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"business_name" text DEFAULT 'Usaha Saya' NOT NULL,
	"tax_scheme" "tax_scheme" DEFAULT 'pt_umum' NOT NULL,
	"final_rate_bp" integer DEFAULT 50 NOT NULL,
	"op_exempt_amount" bigint DEFAULT 500000000 NOT NULL,
	"corp_rate_bp" integer DEFAULT 2200 NOT NULL,
	"facility_limit" bigint DEFAULT 4800000000 NOT NULL,
	"start_date" date DEFAULT '2026-01-01' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"category_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"direction" "direction" NOT NULL,
	"amount" bigint NOT NULL,
	"ref" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'staff' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "yearly_adjustments" (
	"year" integer PRIMARY KEY NOT NULL,
	"depreciation" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tx_date_idx" ON "transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "tx_category_idx" ON "transactions" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "tx_account_idx" ON "transactions" USING btree ("account_id");
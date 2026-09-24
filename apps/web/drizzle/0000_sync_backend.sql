CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_active_at" timestamp with time zone NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"label" text NOT NULL,
	"secret_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "devices_secret_hash_unique" UNIQUE("secret_hash")
);
--> statement-breakpoint
CREATE TABLE "pair_codes" (
	"code_hash" text PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_documents" (
	"account_id" uuid NOT NULL,
	"doc_type" text NOT NULL,
	"doc_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"revision" bigint NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"device_id" uuid,
	"deleted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "sync_documents_account_id_doc_type_doc_id_pk" PRIMARY KEY("account_id","doc_type","doc_id")
);
--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pair_codes" ADD CONSTRAINT "pair_codes_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_documents" ADD CONSTRAINT "sync_documents_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "devices_account_idx" ON "devices" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "sync_documents_revision_idx" ON "sync_documents" USING btree ("account_id","revision");
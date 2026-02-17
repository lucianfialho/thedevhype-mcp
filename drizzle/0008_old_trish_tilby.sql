CREATE TABLE "api_keys" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "api_keys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"userId" uuid,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"tier" text DEFAULT 'free' NOT NULL,
	"rateLimit" integer DEFAULT 100 NOT NULL,
	"dailyLimit" integer DEFAULT 1000 NOT NULL,
	"requestsToday" integer DEFAULT 0 NOT NULL,
	"requestsThisHour" integer DEFAULT 0 NOT NULL,
	"lastRequestAt" timestamp with time zone,
	"enabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "api_keys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "api_usage_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "api_usage_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"apiKeyId" bigint NOT NULL,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"statusCode" smallint NOT NULL,
	"responseTimeMs" integer,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_eloa"."link_clicks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_eloa"."link_clicks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"articleId" bigint NOT NULL,
	"clickedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"userAgent" text,
	"referer" text,
	"ip" text
);
--> statement-breakpoint
CREATE TABLE "mcp_eloa"."user_sources" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_eloa"."user_sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"userId" uuid NOT NULL,
	"sourceId" bigint NOT NULL,
	"category" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "user_sources_user_source" UNIQUE("userId","sourceId")
);
--> statement-breakpoint
CREATE TABLE "mcp_nota_fiscal"."canonical_products" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_nota_fiscal"."canonical_products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"storeId" bigint NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"unidade" text,
	"categoria" text,
	"contributorCount" integer DEFAULT 1 NOT NULL,
	"lastSeenAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "canonical_products_store_codigo" UNIQUE("storeId","codigo")
);
--> statement-breakpoint
CREATE TABLE "mcp_nota_fiscal"."public_price_entries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_nota_fiscal"."public_price_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"canonicalProductId" bigint NOT NULL,
	"storeId" bigint NOT NULL,
	"valorUnitario" numeric(12, 4) NOT NULL,
	"valorTotal" numeric(12, 2) NOT NULL,
	"quantidade" numeric(12, 4) NOT NULL,
	"dataCompra" date NOT NULL,
	"contributorHash" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_eloa"."sources" DROP CONSTRAINT "sources_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_mcp_access" ADD COLUMN "contributePublicData" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_eloa"."articles" ADD COLUMN "shortCode" text;--> statement-breakpoint
ALTER TABLE "mcp_eloa"."articles" ADD COLUMN "isRead" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_eloa"."articles" ADD COLUMN "readAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_usage_log" ADD CONSTRAINT "api_usage_log_apiKeyId_api_keys_id_fk" FOREIGN KEY ("apiKeyId") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_eloa"."link_clicks" ADD CONSTRAINT "link_clicks_articleId_articles_id_fk" FOREIGN KEY ("articleId") REFERENCES "mcp_eloa"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_eloa"."user_sources" ADD CONSTRAINT "user_sources_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_eloa"."user_sources" ADD CONSTRAINT "user_sources_sourceId_sources_id_fk" FOREIGN KEY ("sourceId") REFERENCES "mcp_eloa"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."canonical_products" ADD CONSTRAINT "canonical_products_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "mcp_nota_fiscal"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."public_price_entries" ADD CONSTRAINT "public_price_entries_canonicalProductId_canonical_products_id_fk" FOREIGN KEY ("canonicalProductId") REFERENCES "mcp_nota_fiscal"."canonical_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."public_price_entries" ADD CONSTRAINT "public_price_entries_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "mcp_nota_fiscal"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_eloa"."sources" DROP COLUMN "userId";--> statement-breakpoint
ALTER TABLE "mcp_eloa"."sources" DROP COLUMN "category";--> statement-breakpoint
ALTER TABLE "mcp_eloa"."articles" ADD CONSTRAINT "articles_short_code_unique" UNIQUE("shortCode");--> statement-breakpoint
ALTER TABLE "mcp_eloa"."bookmarks" ADD CONSTRAINT "bookmarks_user_url" UNIQUE("userId","url");--> statement-breakpoint
ALTER TABLE "mcp_eloa"."sources" ADD CONSTRAINT "sources_url_unique" UNIQUE("url");
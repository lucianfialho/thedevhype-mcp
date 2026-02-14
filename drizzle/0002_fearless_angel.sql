CREATE SCHEMA "mcp_eloa";
--> statement-breakpoint
CREATE TABLE "mcp_eloa"."articles" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_eloa"."articles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"userId" uuid NOT NULL,
	"sourceId" bigint NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"author" text,
	"content" text,
	"summary" text,
	"publishedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "articles_user_url" UNIQUE("userId","url")
);
--> statement-breakpoint
CREATE TABLE "mcp_eloa"."bookmarks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_eloa"."bookmarks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"userId" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"summary" text,
	"tags" text[],
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_eloa"."sources" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_eloa"."sources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"userId" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"siteUrl" text,
	"category" text,
	"lastFetchedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_eloa"."articles" ADD CONSTRAINT "articles_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_eloa"."articles" ADD CONSTRAINT "articles_sourceId_sources_id_fk" FOREIGN KEY ("sourceId") REFERENCES "mcp_eloa"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_eloa"."bookmarks" ADD CONSTRAINT "bookmarks_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_eloa"."sources" ADD CONSTRAINT "sources_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;
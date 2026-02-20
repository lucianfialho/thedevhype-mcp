CREATE SCHEMA "mcp_rayssa";
--> statement-breakpoint
CREATE TABLE "mcp_rayssa"."social_accounts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"userId" uuid NOT NULL,
	"platform" text NOT NULL,
	"platformUserId" text NOT NULL,
	"username" text,
	"displayName" text,
	"accessToken" text NOT NULL,
	"refreshToken" text,
	"tokenExpiresAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "social_accounts_user_platform" UNIQUE("userId","platform")
);
--> statement-breakpoint
CREATE TABLE "mcp_rayssa"."posts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
	"userId" uuid NOT NULL,
	"accountId" bigint NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"scheduledAt" timestamp with time zone,
	"publishedAt" timestamp with time zone,
	"platformPostId" text,
	"platformPostUrl" text,
	"errorMessage" text,
	"threadParentId" bigint,
	"threadOrder" integer,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_rayssa"."social_accounts" ADD CONSTRAINT "social_accounts_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mcp_rayssa"."posts" ADD CONSTRAINT "posts_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "mcp_rayssa"."posts" ADD CONSTRAINT "posts_accountId_social_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "mcp_rayssa"."social_accounts"("id") ON DELETE cascade ON UPDATE no action;

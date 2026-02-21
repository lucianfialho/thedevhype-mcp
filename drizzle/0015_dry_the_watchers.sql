CREATE SCHEMA "mcp_rayssa";
--> statement-breakpoint
CREATE TABLE "mcp_oauth_clients" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_oauth_clients_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"clientId" text NOT NULL,
	"clientSecret" text,
	"clientSecretExpiresAt" integer,
	"redirectUris" text[] NOT NULL,
	"grantTypes" text[] NOT NULL,
	"responseTypes" text[] NOT NULL,
	"tokenEndpointAuthMethod" text NOT NULL,
	"clientName" text,
	"scope" text,
	"clientIdIssuedAt" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "mcp_oauth_clients_clientId_unique" UNIQUE("clientId")
);
--> statement-breakpoint
CREATE TABLE "mcp_oauth_codes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_oauth_codes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"clientId" text NOT NULL,
	"userId" uuid NOT NULL,
	"code" text NOT NULL,
	"codeChallenge" text NOT NULL,
	"redirectUri" text NOT NULL,
	"scopes" text,
	"resource" text,
	"expiresAt" timestamp with time zone NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "mcp_oauth_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "mcp_oauth_tokens" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_oauth_tokens_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"clientId" text NOT NULL,
	"userId" uuid NOT NULL,
	"accessToken" text NOT NULL,
	"refreshToken" text,
	"scopes" text,
	"resource" text,
	"expiresAt" timestamp with time zone NOT NULL,
	"revokedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "mcp_oauth_tokens_accessToken_unique" UNIQUE("accessToken"),
	CONSTRAINT "mcp_oauth_tokens_refreshToken_unique" UNIQUE("refreshToken")
);
--> statement-breakpoint
CREATE TABLE "mcp_rayssa"."posts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_rayssa"."posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
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
CREATE TABLE "mcp_rayssa"."social_accounts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_rayssa"."social_accounts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
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
ALTER TABLE "mcp_oauth_codes" ADD CONSTRAINT "mcp_oauth_codes_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_oauth_tokens" ADD CONSTRAINT "mcp_oauth_tokens_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_rayssa"."posts" ADD CONSTRAINT "posts_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_rayssa"."posts" ADD CONSTRAINT "posts_accountId_social_accounts_id_fk" FOREIGN KEY ("accountId") REFERENCES "mcp_rayssa"."social_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_rayssa"."social_accounts" ADD CONSTRAINT "social_accounts_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;
CREATE SCHEMA "mcp_otto";
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "waitlist_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"userId" uuid NOT NULL,
	"building" text NOT NULL,
	"aiTools" text NOT NULL,
	"mcpExcitement" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"approvedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "waitlist_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "mcp_otto"."connections" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_otto"."connections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"userId" uuid NOT NULL,
	"fromId" bigint NOT NULL,
	"toId" bigint NOT NULL,
	"note" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "connections_user_from_to" UNIQUE("userId","fromId","toId")
);
--> statement-breakpoint
CREATE TABLE "mcp_otto"."entries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_otto"."entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"userId" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"url" text,
	"source" text,
	"excerpt" text,
	"tags" text[],
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_otto"."connections" ADD CONSTRAINT "connections_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_otto"."connections" ADD CONSTRAINT "connections_fromId_entries_id_fk" FOREIGN KEY ("fromId") REFERENCES "mcp_otto"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_otto"."connections" ADD CONSTRAINT "connections_toId_entries_id_fk" FOREIGN KEY ("toId") REFERENCES "mcp_otto"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_otto"."entries" ADD CONSTRAINT "entries_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;
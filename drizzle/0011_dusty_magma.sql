CREATE TABLE "mcp_tool_usage" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_tool_usage_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"userId" uuid NOT NULL,
	"mcpName" text NOT NULL,
	"toolName" text NOT NULL,
	"durationMs" integer,
	"error" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"onboardingCompletedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_nota_fiscal"."shopping_list_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_nota_fiscal"."shopping_list_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"listId" bigint NOT NULL,
	"userId" uuid NOT NULL,
	"productId" bigint,
	"name" text NOT NULL,
	"quantity" numeric(12, 4),
	"unit" text,
	"estimatedPrice" numeric(12, 2),
	"cheapestStore" text,
	"checked" boolean DEFAULT false NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_nota_fiscal"."shopping_lists" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_nota_fiscal"."shopping_lists_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"userId" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"completedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_tool_usage" ADD CONSTRAINT "mcp_tool_usage_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."shopping_list_items" ADD CONSTRAINT "shopping_list_items_listId_shopping_lists_id_fk" FOREIGN KEY ("listId") REFERENCES "mcp_nota_fiscal"."shopping_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."shopping_list_items" ADD CONSTRAINT "shopping_list_items_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."shopping_list_items" ADD CONSTRAINT "shopping_list_items_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "mcp_nota_fiscal"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."shopping_lists" ADD CONSTRAINT "shopping_lists_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."extractions" ADD CONSTRAINT "extractions_user_url" UNIQUE("userId","url");
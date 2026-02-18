CREATE SCHEMA "mcp_familia";
--> statement-breakpoint
CREATE TABLE "mcp_familia"."activity_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_familia"."activity_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"familyId" bigint NOT NULL,
	"userId" uuid NOT NULL,
	"action" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" bigint,
	"metadata" jsonb,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_familia"."expense_splits" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_familia"."expense_splits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"expenseId" bigint NOT NULL,
	"userId" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"settled" boolean DEFAULT false NOT NULL,
	CONSTRAINT "expense_splits_expense_user" UNIQUE("expenseId","userId")
);
--> statement-breakpoint
CREATE TABLE "mcp_familia"."expenses" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_familia"."expenses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"familyId" bigint NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"category" text,
	"paidBy" uuid NOT NULL,
	"splitType" text DEFAULT 'equal' NOT NULL,
	"date" date NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_familia"."families" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_familia"."families_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"description" text,
	"createdBy" uuid NOT NULL,
	"settings" jsonb,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_familia"."invites" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_familia"."invites_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"familyId" bigint NOT NULL,
	"code" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"createdBy" uuid NOT NULL,
	"usedBy" uuid,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "mcp_familia"."members" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_familia"."members_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"familyId" bigint NOT NULL,
	"userId" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"nickname" text,
	"joinedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "members_family_user" UNIQUE("familyId","userId")
);
--> statement-breakpoint
CREATE TABLE "mcp_familia"."notes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_familia"."notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"familyId" bigint NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"pinned" boolean DEFAULT false NOT NULL,
	"createdBy" uuid NOT NULL,
	"updatedBy" uuid,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_familia"."shopping_list_items" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_familia"."shopping_list_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"listId" bigint NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1,
	"unit" text,
	"checked" boolean DEFAULT false NOT NULL,
	"checkedBy" uuid,
	"addedBy" uuid NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_familia"."shopping_lists" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_familia"."shopping_lists_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"familyId" bigint NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_familia"."tasks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_familia"."tasks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"familyId" bigint NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"assignedTo" uuid,
	"dueDate" date,
	"priority" text DEFAULT 'medium',
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mcp_familia"."activity_log" ADD CONSTRAINT "activity_log_familyId_families_id_fk" FOREIGN KEY ("familyId") REFERENCES "mcp_familia"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."activity_log" ADD CONSTRAINT "activity_log_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."expense_splits" ADD CONSTRAINT "expense_splits_expenseId_expenses_id_fk" FOREIGN KEY ("expenseId") REFERENCES "mcp_familia"."expenses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."expense_splits" ADD CONSTRAINT "expense_splits_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."expenses" ADD CONSTRAINT "expenses_familyId_families_id_fk" FOREIGN KEY ("familyId") REFERENCES "mcp_familia"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."expenses" ADD CONSTRAINT "expenses_paidBy_user_id_fk" FOREIGN KEY ("paidBy") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."families" ADD CONSTRAINT "families_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."invites" ADD CONSTRAINT "invites_familyId_families_id_fk" FOREIGN KEY ("familyId") REFERENCES "mcp_familia"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."invites" ADD CONSTRAINT "invites_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."invites" ADD CONSTRAINT "invites_usedBy_user_id_fk" FOREIGN KEY ("usedBy") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."members" ADD CONSTRAINT "members_familyId_families_id_fk" FOREIGN KEY ("familyId") REFERENCES "mcp_familia"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."members" ADD CONSTRAINT "members_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."notes" ADD CONSTRAINT "notes_familyId_families_id_fk" FOREIGN KEY ("familyId") REFERENCES "mcp_familia"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."notes" ADD CONSTRAINT "notes_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."notes" ADD CONSTRAINT "notes_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."shopping_list_items" ADD CONSTRAINT "shopping_list_items_listId_shopping_lists_id_fk" FOREIGN KEY ("listId") REFERENCES "mcp_familia"."shopping_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."shopping_list_items" ADD CONSTRAINT "shopping_list_items_checkedBy_user_id_fk" FOREIGN KEY ("checkedBy") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."shopping_list_items" ADD CONSTRAINT "shopping_list_items_addedBy_user_id_fk" FOREIGN KEY ("addedBy") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."shopping_lists" ADD CONSTRAINT "shopping_lists_familyId_families_id_fk" FOREIGN KEY ("familyId") REFERENCES "mcp_familia"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."shopping_lists" ADD CONSTRAINT "shopping_lists_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."tasks" ADD CONSTRAINT "tasks_familyId_families_id_fk" FOREIGN KEY ("familyId") REFERENCES "mcp_familia"."families"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."tasks" ADD CONSTRAINT "tasks_assignedTo_user_id_fk" FOREIGN KEY ("assignedTo") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_familia"."tasks" ADD CONSTRAINT "tasks_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;
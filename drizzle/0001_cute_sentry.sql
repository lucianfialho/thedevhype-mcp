CREATE TABLE "mcp_nota_fiscal"."price_entries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_nota_fiscal"."price_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"userId" uuid NOT NULL,
	"extractionId" bigint NOT NULL,
	"productId" bigint NOT NULL,
	"storeId" bigint NOT NULL,
	"quantidade" numeric(12, 4) NOT NULL,
	"valorUnitario" numeric(12, 4) NOT NULL,
	"valorTotal" numeric(12, 2) NOT NULL,
	"dataCompra" date NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_nota_fiscal"."products" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_nota_fiscal"."products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"userId" uuid NOT NULL,
	"storeId" bigint NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"unidade" text,
	"categoria" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "products_user_store_codigo" UNIQUE("userId","storeId","codigo")
);
--> statement-breakpoint
CREATE TABLE "mcp_nota_fiscal"."stores" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_nota_fiscal"."stores_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"cnpj" text NOT NULL,
	"nome" text NOT NULL,
	"endereco" text,
	"cidade" text,
	"estado" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "stores_cnpj_unique" UNIQUE("cnpj")
);
--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."price_entries" ADD CONSTRAINT "price_entries_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."price_entries" ADD CONSTRAINT "price_entries_extractionId_extractions_id_fk" FOREIGN KEY ("extractionId") REFERENCES "mcp_nota_fiscal"."extractions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."price_entries" ADD CONSTRAINT "price_entries_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "mcp_nota_fiscal"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."price_entries" ADD CONSTRAINT "price_entries_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "mcp_nota_fiscal"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."products" ADD CONSTRAINT "products_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "neon_auth"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_nota_fiscal"."products" ADD CONSTRAINT "products_storeId_stores_id_fk" FOREIGN KEY ("storeId") REFERENCES "mcp_nota_fiscal"."stores"("id") ON DELETE no action ON UPDATE no action;
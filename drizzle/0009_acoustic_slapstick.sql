CREATE TABLE "mcp_nota_fiscal"."shopping_cache" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "mcp_nota_fiscal"."shopping_cache_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"queryKey" text NOT NULL,
	"results" jsonb NOT NULL,
	"cachedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	CONSTRAINT "shopping_cache_queryKey_unique" UNIQUE("queryKey")
);

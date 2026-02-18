-- Otto: Second Brain MCP Server
CREATE SCHEMA IF NOT EXISTS "mcp_otto";

-- Entries: unified table for notes, links, highlights
CREATE TABLE "mcp_otto"."entries" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" uuid NOT NULL REFERENCES "neon_auth"."user"("id"),
  "type" text NOT NULL,
  "title" text NOT NULL,
  "content" text,
  "url" text,
  "source" text,
  "excerpt" text,
  "tags" text[],
  "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "search_vector" tsvector
);

CREATE INDEX "entries_user_type_idx" ON "mcp_otto"."entries" ("userId", "type");
CREATE INDEX "entries_tags_idx" ON "mcp_otto"."entries" USING GIN ("tags");
CREATE INDEX "entries_search_idx" ON "mcp_otto"."entries" USING GIN ("search_vector");

-- Trigger to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION mcp_otto.entries_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.excerpt, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags, ' '), '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entries_search_vector_trigger
  BEFORE INSERT OR UPDATE ON mcp_otto.entries
  FOR EACH ROW EXECUTE FUNCTION mcp_otto.entries_search_vector_update();

-- Connections: bidirectional links between entries
CREATE TABLE "mcp_otto"."connections" (
  "id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" uuid NOT NULL REFERENCES "neon_auth"."user"("id"),
  "fromId" bigint NOT NULL REFERENCES "mcp_otto"."entries"("id") ON DELETE CASCADE,
  "toId" bigint NOT NULL REFERENCES "mcp_otto"."entries"("id") ON DELETE CASCADE,
  "note" text,
  "createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "connections_user_from_to" UNIQUE ("userId", "fromId", "toId")
);

CREATE INDEX "connections_from_idx" ON "mcp_otto"."connections" ("fromId");
CREATE INDEX "connections_to_idx" ON "mcp_otto"."connections" ("toId");

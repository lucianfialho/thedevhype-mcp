ALTER TABLE mcp_eloa.articles ADD COLUMN "isRead" boolean DEFAULT false NOT NULL;
ALTER TABLE mcp_eloa.articles ADD COLUMN "readAt" timestamptz;
CREATE INDEX idx_articles_user_read ON mcp_eloa.articles ("userId", "isRead");

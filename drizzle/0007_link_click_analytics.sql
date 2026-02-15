-- shortCode em articles
ALTER TABLE mcp_eloa.articles ADD COLUMN "shortCode" text;
ALTER TABLE mcp_eloa.articles ADD CONSTRAINT articles_short_code_unique UNIQUE ("shortCode");
CREATE INDEX idx_articles_short_code ON mcp_eloa.articles ("shortCode");

-- Backfill artigos existentes
UPDATE mcp_eloa.articles
SET "shortCode" = substr(md5(random()::text || id::text), 1, 8)
WHERE "shortCode" IS NULL;

-- Tabela de clicks
CREATE TABLE mcp_eloa.link_clicks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "articleId" bigint NOT NULL REFERENCES mcp_eloa.articles(id) ON DELETE CASCADE,
  "clickedAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "userAgent" text,
  referer text,
  ip text
);

CREATE INDEX idx_link_clicks_article ON mcp_eloa.link_clicks ("articleId");
CREATE INDEX idx_link_clicks_clicked_at ON mcp_eloa.link_clicks ("clickedAt");

-- 1. Criar tabela user_sources
CREATE TABLE mcp_eloa.user_sources (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "userId" uuid NOT NULL REFERENCES neon_auth."user"(id),
  "sourceId" bigint NOT NULL,
  category text,
  "createdAt" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Popular user_sources a partir dos sources existentes
INSERT INTO mcp_eloa.user_sources ("userId", "sourceId", category, "createdAt")
SELECT "userId", id, category, "createdAt" FROM mcp_eloa.sources;

-- 3. Deduplicar sources por URL (manter menor id por URL)
-- 3a. Remapear user_sources.sourceId para o source canônico
UPDATE mcp_eloa.user_sources us
SET "sourceId" = canonical.keep_id
FROM (
  SELECT s.id AS old_id, m.keep_id
  FROM mcp_eloa.sources s
  JOIN (SELECT url, MIN(id) AS keep_id FROM mcp_eloa.sources GROUP BY url) m
    ON s.url = m.url
  WHERE s.id != m.keep_id
) canonical
WHERE us."sourceId" = canonical.old_id;

-- 3b. Deduplicar user_sources caso mesmo user+source após remap
DELETE FROM mcp_eloa.user_sources a
USING mcp_eloa.user_sources b
WHERE a."userId" = b."userId" AND a."sourceId" = b."sourceId" AND a.id > b.id;

-- 3c. Remapear articles.sourceId para o source canônico
UPDATE mcp_eloa.articles a
SET "sourceId" = canonical.keep_id
FROM (
  SELECT s.id AS old_id, m.keep_id
  FROM mcp_eloa.sources s
  JOIN (SELECT url, MIN(id) AS keep_id FROM mcp_eloa.sources GROUP BY url) m
    ON s.url = m.url
  WHERE s.id != m.keep_id
) canonical
WHERE a."sourceId" = canonical.old_id;

-- 3d. Deletar sources duplicados
DELETE FROM mcp_eloa.sources
WHERE id NOT IN (SELECT MIN(id) FROM mcp_eloa.sources GROUP BY url);

-- 4. Remover colunas userId e category de sources
ALTER TABLE mcp_eloa.sources DROP COLUMN "userId";
ALTER TABLE mcp_eloa.sources DROP COLUMN category;

-- 5. Unique na URL + constraints + índices
ALTER TABLE mcp_eloa.sources ADD CONSTRAINT sources_url_unique UNIQUE (url);
ALTER TABLE mcp_eloa.user_sources ADD CONSTRAINT user_sources_user_source UNIQUE ("userId", "sourceId");
ALTER TABLE mcp_eloa.user_sources ADD CONSTRAINT "user_sources_sourceId_fk" FOREIGN KEY ("sourceId") REFERENCES mcp_eloa.sources(id) ON DELETE CASCADE;
CREATE INDEX idx_user_sources_userId ON mcp_eloa.user_sources ("userId");
CREATE INDEX idx_user_sources_sourceId ON mcp_eloa.user_sources ("sourceId");

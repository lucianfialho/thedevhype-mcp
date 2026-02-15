-- ============================================================
-- Full-Text Search for mcp_eloa.articles and mcp_eloa.bookmarks
-- Config: 'simple' (no stemming — mixed PT/EN content)
-- ============================================================

-- 1. Add tsvector columns
ALTER TABLE mcp_eloa.articles ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE mcp_eloa.bookmarks ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. GIN indexes
CREATE INDEX IF NOT EXISTS idx_articles_search_vector ON mcp_eloa.articles USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_bookmarks_search_vector ON mcp_eloa.bookmarks USING GIN (search_vector);

-- 3. Trigger functions

-- Articles: title (A) + content (B)
CREATE OR REPLACE FUNCTION mcp_eloa.articles_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bookmarks: title (A) + content (B) + notes (C) + tags (C)
CREATE OR REPLACE FUNCTION mcp_eloa.bookmarks_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.content, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW.notes, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Triggers (BEFORE INSERT OR UPDATE)
DROP TRIGGER IF EXISTS trg_articles_search_vector ON mcp_eloa.articles;
CREATE TRIGGER trg_articles_search_vector
  BEFORE INSERT OR UPDATE OF title, content
  ON mcp_eloa.articles
  FOR EACH ROW EXECUTE FUNCTION mcp_eloa.articles_search_vector_update();

DROP TRIGGER IF EXISTS trg_bookmarks_search_vector ON mcp_eloa.bookmarks;
CREATE TRIGGER trg_bookmarks_search_vector
  BEFORE INSERT OR UPDATE OF title, content, notes, tags
  ON mcp_eloa.bookmarks
  FOR EACH ROW EXECUTE FUNCTION mcp_eloa.bookmarks_search_vector_update();

-- 5. Backfill existing rows
UPDATE mcp_eloa.articles SET search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(content, '')), 'B');

UPDATE mcp_eloa.bookmarks SET search_vector =
  setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(content, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(notes, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(array_to_string(tags, ' '), '')), 'C');

-- ============================================================
-- Bookmark improvements: deduplicate + unique constraint
-- ============================================================

-- 1. Deduplicate bookmarks (keep most recent per userId+url)
DELETE FROM mcp_eloa.bookmarks a
USING mcp_eloa.bookmarks b
WHERE a."userId" = b."userId"
  AND a.url = b.url
  AND a.id < b.id;

-- 2. Add unique constraint
ALTER TABLE mcp_eloa.bookmarks
  ADD CONSTRAINT bookmarks_user_url UNIQUE ("userId", url);

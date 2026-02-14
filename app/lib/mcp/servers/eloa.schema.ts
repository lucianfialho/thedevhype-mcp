import {
  pgSchema,
  bigint,
  uuid,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { userInNeonAuth } from '../../db/public.schema';

export const mcpEloa = pgSchema('mcp_eloa');

// --- Sources (RSS feeds per user) ---

export const sources = mcpEloa.table('sources', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  url: text().notNull(),
  title: text().notNull(),
  siteUrl: text(),
  category: text(),
  lastFetchedAt: timestamp({ withTimezone: true, mode: 'string' }),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Source = InferSelectModel<typeof sources>;
export type NewSource = InferInsertModel<typeof sources>;

// --- Articles (fetched from RSS feeds, per user) ---

export const articles = mcpEloa.table(
  'articles',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    sourceId: bigint({ mode: 'number' })
      .notNull()
      .references(() => sources.id),
    title: text().notNull(),
    url: text().notNull(),
    author: text(),
    content: text(),
    summary: text(),
    publishedAt: timestamp({ withTimezone: true, mode: 'string' }),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique('articles_user_url').on(table.userId, table.url)],
);

export type Article = InferSelectModel<typeof articles>;
export type NewArticle = InferInsertModel<typeof articles>;

// --- Bookmarks (user-saved URLs with tags) ---

export const bookmarks = mcpEloa.table('bookmarks', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  url: text().notNull(),
  title: text().notNull(),
  content: text(),
  summary: text(),
  tags: text().array(),
  notes: text(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Bookmark = InferSelectModel<typeof bookmarks>;
export type NewBookmark = InferInsertModel<typeof bookmarks>;

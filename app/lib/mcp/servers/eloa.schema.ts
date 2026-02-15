import {
  pgSchema,
  bigint,
  uuid,
  text,
  timestamp,
  boolean,
  unique,
} from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { userInNeonAuth } from '../../db/public.schema';

export const mcpEloa = pgSchema('mcp_eloa');

// --- Sources (shared RSS feeds, unique per URL) ---

export const sources = mcpEloa.table('sources', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  url: text().notNull().unique('sources_url_unique'),
  title: text().notNull(),
  siteUrl: text(),
  lastFetchedAt: timestamp({ withTimezone: true, mode: 'string' }),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Source = InferSelectModel<typeof sources>;
export type NewSource = InferInsertModel<typeof sources>;

// --- User Sources (subscription: user → source) ---

export const userSources = mcpEloa.table(
  'user_sources',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    sourceId: bigint({ mode: 'number' })
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    category: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique('user_sources_user_source').on(table.userId, table.sourceId)],
);

export type UserSource = InferSelectModel<typeof userSources>;
export type NewUserSource = InferInsertModel<typeof userSources>;

// --- SourceWithSubscription (for UI) ---

export type SourceWithSubscription = {
  id: number;
  url: string;
  title: string;
  siteUrl: string | null;
  lastFetchedAt: string | null;
  createdAt: string;
  category: string | null;
  subscriberCount: number;
};

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
    shortCode: text().unique('articles_short_code_unique'),
    author: text(),
    content: text(),
    summary: text(),
    publishedAt: timestamp({ withTimezone: true, mode: 'string' }),
    isRead: boolean().default(false).notNull(),
    readAt: timestamp({ withTimezone: true, mode: 'string' }),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique('articles_user_url').on(table.userId, table.url)],
);

export type Article = InferSelectModel<typeof articles>;
export type NewArticle = InferInsertModel<typeof articles>;

// --- Bookmarks (user-saved URLs with tags) ---

export const bookmarks = mcpEloa.table(
  'bookmarks',
  {
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
  },
  (table) => [unique('bookmarks_user_url').on(table.userId, table.url)],
);

export type Bookmark = InferSelectModel<typeof bookmarks>;
export type NewBookmark = InferInsertModel<typeof bookmarks>;

// --- Link Clicks (analytics for proxy redirects) ---

export const linkClicks = mcpEloa.table('link_clicks', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  articleId: bigint({ mode: 'number' }).notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  clickedAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`).notNull(),
  userAgent: text(),
  referer: text(),
  ip: text(),
});

export type LinkClick = InferSelectModel<typeof linkClicks>;
export type NewLinkClick = InferInsertModel<typeof linkClicks>;

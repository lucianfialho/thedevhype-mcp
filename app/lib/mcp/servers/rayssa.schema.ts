import {
  pgSchema,
  bigint,
  uuid,
  text,
  timestamp,
  integer,
  unique,
} from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { userInNeonAuth } from '../../db/public.schema';

export const mcpRayssa = pgSchema('mcp_rayssa');

// --- Social Accounts (connected platforms) ---

export const socialAccounts = mcpRayssa.table(
  'social_accounts',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    platform: text().notNull(), // 'twitter'
    platformUserId: text().notNull(),
    username: text(),
    displayName: text(),
    accessToken: text().notNull(),
    refreshToken: text(),
    tokenExpiresAt: timestamp({ withTimezone: true, mode: 'string' }),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique('social_accounts_user_platform').on(table.userId, table.platform)],
);

export type SocialAccount = InferSelectModel<typeof socialAccounts>;
export type NewSocialAccount = InferInsertModel<typeof socialAccounts>;

// --- Posts (drafts, scheduled, published) ---

export const posts = mcpRayssa.table('posts', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  accountId: bigint({ mode: 'number' })
    .notNull()
    .references(() => socialAccounts.id, { onDelete: 'cascade' }),
  content: text().notNull(),
  status: text().notNull().default('draft'), // draft | scheduled | publishing | published | failed
  scheduledAt: timestamp({ withTimezone: true, mode: 'string' }),
  publishedAt: timestamp({ withTimezone: true, mode: 'string' }),
  platformPostId: text(),
  platformPostUrl: text(),
  errorMessage: text(),
  threadParentId: bigint({ mode: 'number' }),
  threadOrder: integer(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Post = InferSelectModel<typeof posts>;
export type NewPost = InferInsertModel<typeof posts>;

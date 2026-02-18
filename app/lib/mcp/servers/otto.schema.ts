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

export const mcpOtto = pgSchema('mcp_otto');

// --- Entries (unified table for notes, links, highlights) ---

export const entries = mcpOtto.table('entries', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  type: text().notNull(), // 'note' | 'link' | 'highlight'
  title: text().notNull(),
  content: text(), // full markdown content
  url: text(), // for links
  source: text(), // for highlights
  excerpt: text(), // short preview for listings
  tags: text().array(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Entry = InferSelectModel<typeof entries>;
export type NewEntry = InferInsertModel<typeof entries>;

// --- Connections (bidirectional links between entries) ---

export const connections = mcpOtto.table(
  'connections',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    fromId: bigint({ mode: 'number' })
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    toId: bigint({ mode: 'number' })
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    note: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique('connections_user_from_to').on(table.userId, table.fromId, table.toId)],
);

export type Connection = InferSelectModel<typeof connections>;
export type NewConnection = InferInsertModel<typeof connections>;

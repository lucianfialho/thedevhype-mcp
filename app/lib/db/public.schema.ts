import {
  pgSchema,
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  unique,
  bigint,
} from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';

export const neonAuth = pgSchema('neon_auth');

export const userInNeonAuth = neonAuth.table(
  'user',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    emailVerified: boolean().notNull(),
    image: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    role: text(),
    banned: boolean(),
    banReason: text(),
    banExpires: timestamp({ withTimezone: true, mode: 'string' }),
  },
  (table) => [unique('user_email_key').on(table.email)],
);

// --- public schema tables ---

export const userMcpAccess = pgTable(
  'user_mcp_access',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    mcpName: text().notNull(),
    apiKey: text(),
    enabled: boolean().default(true).notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique('user_mcp_access_user_mcp').on(table.userId, table.mcpName)],
);

export type UserMcpAccess = InferSelectModel<typeof userMcpAccess>;
export type NewUserMcpAccess = InferInsertModel<typeof userMcpAccess>;

import {
  pgSchema,
  bigint,
  uuid,
  text,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { userInNeonAuth } from '../../db/public.schema';

export const mcpNotaFiscal = pgSchema('mcp_nota_fiscal');

export const extractions = mcpNotaFiscal.table('extractions', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  url: text().notNull(),
  data: jsonb().notNull(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Extraction = InferSelectModel<typeof extractions>;
export type NewExtraction = InferInsertModel<typeof extractions>;

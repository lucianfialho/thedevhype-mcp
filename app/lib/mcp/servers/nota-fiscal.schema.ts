import {
  pgSchema,
  bigint,
  uuid,
  text,
  jsonb,
  timestamp,
  numeric,
  date,
  unique,
} from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { userInNeonAuth } from '../../db/public.schema';

export const mcpNotaFiscal = pgSchema('mcp_nota_fiscal');

// --- Extractions (existing) ---

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

// --- Stores (shared, keyed by CNPJ) ---

export const stores = mcpNotaFiscal.table('stores', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  cnpj: text().notNull().unique(),
  nome: text().notNull(),
  endereco: text(),
  cidade: text(),
  estado: text(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Store = InferSelectModel<typeof stores>;
export type NewStore = InferInsertModel<typeof stores>;

// --- Products (per-user product catalog, scoped by store) ---

export const products = mcpNotaFiscal.table(
  'products',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    storeId: bigint({ mode: 'number' })
      .notNull()
      .references(() => stores.id),
    codigo: text().notNull(),
    nome: text().notNull(),
    unidade: text(),
    categoria: text(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique('products_user_store_codigo').on(table.userId, table.storeId, table.codigo)],
);

export type Product = InferSelectModel<typeof products>;
export type NewProduct = InferInsertModel<typeof products>;

// --- Price entries (price history, one row per product per invoice) ---

export const priceEntries = mcpNotaFiscal.table('price_entries', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  extractionId: bigint({ mode: 'number' })
    .notNull()
    .references(() => extractions.id),
  productId: bigint({ mode: 'number' })
    .notNull()
    .references(() => products.id),
  storeId: bigint({ mode: 'number' })
    .notNull()
    .references(() => stores.id),
  quantidade: numeric({ precision: 12, scale: 4 }).notNull(),
  valorUnitario: numeric({ precision: 12, scale: 4 }).notNull(),
  valorTotal: numeric({ precision: 12, scale: 2 }).notNull(),
  dataCompra: date().notNull(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type PriceEntry = InferSelectModel<typeof priceEntries>;
export type NewPriceEntry = InferInsertModel<typeof priceEntries>;

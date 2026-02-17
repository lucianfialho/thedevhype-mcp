import {
  pgSchema,
  bigint,
  uuid,
  text,
  jsonb,
  timestamp,
  numeric,
  date,
  integer,
  unique,
} from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { userInNeonAuth } from '../../db/public.schema';

export const mcpNotaFiscal = pgSchema('mcp_nota_fiscal');

// --- Extractions (existing) ---

export const extractions = mcpNotaFiscal.table(
  'extractions',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    url: text().notNull(),
    data: jsonb().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique('extractions_user_url').on(table.userId, table.url)],
);

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

// --- Canonical products (de-duplicated catalog for public API) ---

export const canonicalProducts = mcpNotaFiscal.table(
  'canonical_products',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    storeId: bigint({ mode: 'number' })
      .notNull()
      .references(() => stores.id),
    codigo: text().notNull(),
    nome: text().notNull(),
    unidade: text(),
    categoria: text(),
    contributorCount: integer().default(1).notNull(),
    lastSeenAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique('canonical_products_store_codigo').on(table.storeId, table.codigo)],
);

export type CanonicalProduct = InferSelectModel<typeof canonicalProducts>;
export type NewCanonicalProduct = InferInsertModel<typeof canonicalProducts>;

// --- Public price entries (anonymized prices for public API) ---

export const publicPriceEntries = mcpNotaFiscal.table('public_price_entries', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  canonicalProductId: bigint({ mode: 'number' })
    .notNull()
    .references(() => canonicalProducts.id),
  storeId: bigint({ mode: 'number' })
    .notNull()
    .references(() => stores.id),
  valorUnitario: numeric({ precision: 12, scale: 4 }).notNull(),
  valorTotal: numeric({ precision: 12, scale: 2 }).notNull(),
  quantidade: numeric({ precision: 12, scale: 4 }).notNull(),
  dataCompra: date().notNull(),
  contributorHash: text().notNull(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type PublicPriceEntry = InferSelectModel<typeof publicPriceEntries>;
export type NewPublicPriceEntry = InferInsertModel<typeof publicPriceEntries>;

// --- Shopping cache (Google Shopping results with lazy expiry) ---

export const shoppingCache = mcpNotaFiscal.table('shopping_cache', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  queryKey: text().notNull().unique(),
  results: jsonb().notNull(),
  cachedAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
});

export type ShoppingCache = InferSelectModel<typeof shoppingCache>;
export type NewShoppingCache = InferInsertModel<typeof shoppingCache>;

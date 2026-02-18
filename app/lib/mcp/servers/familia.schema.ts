import {
  pgSchema,
  bigint,
  uuid,
  text,
  timestamp,
  boolean,
  numeric,
  date,
  integer,
  unique,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql, type InferSelectModel, type InferInsertModel } from 'drizzle-orm';
import { userInNeonAuth } from '../../db/public.schema';

export const mcpFamilia = pgSchema('mcp_familia');

// --- Families ---

export const families = mcpFamilia.table('families', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  name: text().notNull(),
  description: text(),
  createdBy: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  settings: jsonb(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Family = InferSelectModel<typeof families>;
export type NewFamily = InferInsertModel<typeof families>;

// --- Members ---

export const members = mcpFamilia.table(
  'members',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    familyId: bigint({ mode: 'number' })
      .notNull()
      .references(() => families.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    role: text().notNull().default('member'), // 'admin' | 'member' | 'viewer'
    nickname: text(),
    joinedAt: timestamp({ withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique('members_family_user').on(table.familyId, table.userId)],
);

export type Member = InferSelectModel<typeof members>;
export type NewMember = InferInsertModel<typeof members>;

// --- Invites ---

export const invites = mcpFamilia.table('invites', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  familyId: bigint({ mode: 'number' })
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  code: text().notNull().unique(),
  role: text().notNull().default('member'), // role assigned on join
  createdBy: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  usedBy: uuid().references(() => userInNeonAuth.id),
  expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Invite = InferSelectModel<typeof invites>;
export type NewInvite = InferInsertModel<typeof invites>;

// --- Shopping Lists ---

export const shoppingLists = mcpFamilia.table('shopping_lists', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  familyId: bigint({ mode: 'number' })
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  status: text().notNull().default('active'), // 'active' | 'completed'
  createdBy: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type ShoppingList = InferSelectModel<typeof shoppingLists>;
export type NewShoppingList = InferInsertModel<typeof shoppingLists>;

// --- Shopping List Items ---

export const shoppingListItems = mcpFamilia.table('shopping_list_items', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  listId: bigint({ mode: 'number' })
    .notNull()
    .references(() => shoppingLists.id, { onDelete: 'cascade' }),
  name: text().notNull(),
  quantity: integer().default(1),
  unit: text(),
  checked: boolean().default(false).notNull(),
  checkedBy: uuid().references(() => userInNeonAuth.id),
  addedBy: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  notes: text(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type ShoppingListItem = InferSelectModel<typeof shoppingListItems>;
export type NewShoppingListItem = InferInsertModel<typeof shoppingListItems>;

// --- Tasks ---

export const tasks = mcpFamilia.table('tasks', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  familyId: bigint({ mode: 'number' })
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  description: text(),
  status: text().notNull().default('pending'), // 'pending' | 'in_progress' | 'done'
  assignedTo: uuid().references(() => userInNeonAuth.id),
  dueDate: date({ mode: 'string' }),
  priority: text().default('medium'), // 'low' | 'medium' | 'high'
  createdBy: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;

// --- Notes ---

export const notes = mcpFamilia.table('notes', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  familyId: bigint({ mode: 'number' })
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  title: text().notNull(),
  content: text(), // markdown
  pinned: boolean().default(false).notNull(),
  createdBy: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  updatedBy: uuid().references(() => userInNeonAuth.id),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Note = InferSelectModel<typeof notes>;
export type NewNote = InferInsertModel<typeof notes>;

// --- Expenses ---

export const expenses = mcpFamilia.table('expenses', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  familyId: bigint({ mode: 'number' })
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  description: text().notNull(),
  amount: numeric({ precision: 10, scale: 2 }).notNull(),
  category: text(),
  paidBy: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  splitType: text().notNull().default('equal'), // 'equal' | 'custom'
  date: date({ mode: 'string' }).notNull(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Expense = InferSelectModel<typeof expenses>;
export type NewExpense = InferInsertModel<typeof expenses>;

// --- Expense Splits ---

export const expenseSplits = mcpFamilia.table(
  'expense_splits',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    expenseId: bigint({ mode: 'number' })
      .notNull()
      .references(() => expenses.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => userInNeonAuth.id),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    settled: boolean().default(false).notNull(),
  },
  (table) => [unique('expense_splits_expense_user').on(table.expenseId, table.userId)],
);

export type ExpenseSplit = InferSelectModel<typeof expenseSplits>;
export type NewExpenseSplit = InferInsertModel<typeof expenseSplits>;

// --- Activity Log ---

export const activityLog = mcpFamilia.table('activity_log', {
  id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  familyId: bigint({ mode: 'number' })
    .notNull()
    .references(() => families.id, { onDelete: 'cascade' }),
  userId: uuid()
    .notNull()
    .references(() => userInNeonAuth.id),
  action: text().notNull(),
  entityType: text().notNull(),
  entityId: bigint({ mode: 'number' }),
  metadata: jsonb(),
  createdAt: timestamp({ withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type ActivityLogEntry = InferSelectModel<typeof activityLog>;
export type NewActivityLogEntry = InferInsertModel<typeof activityLog>;

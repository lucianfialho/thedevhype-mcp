'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  families,
  members,
  invites,
  shoppingLists,
  shoppingListItems,
  tasks,
  notes,
  expenses,
  expenseSplits,
  activityLog,
} from '@/app/lib/mcp/servers/familia.schema';
import type {
  Family,
  Member,
  ShoppingListItem,
  Task,
  Note,
  Expense,
  ActivityLogEntry,
} from '@/app/lib/mcp/servers/familia.schema';
import { userInNeonAuth } from '@/app/lib/db/public.schema';
import { getUserMcpUsage } from '../components/user-mcp-usage';

async function requireUserId() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

// ─── Family & Members ───

export async function getUserFamilies() {
  const userId = await requireUserId();

  return db
    .select({
      id: families.id,
      name: families.name,
      description: families.description,
      role: members.role,
      memberCount: sql<number>`(SELECT count(*) FROM mcp_familia.members WHERE "familyId" = ${families.id})::int`,
    })
    .from(members)
    .innerJoin(families, eq(members.familyId, families.id))
    .where(eq(members.userId, userId));
}

export async function getFamilyMembers(familyId: number) {
  const userId = await requireUserId();

  // Verify membership
  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.familyId, familyId), eq(members.userId, userId)));
  if (!membership) return [];

  return db
    .select({
      userId: members.userId,
      role: members.role,
      nickname: members.nickname,
      joinedAt: members.joinedAt,
      name: userInNeonAuth.name,
      email: userInNeonAuth.email,
    })
    .from(members)
    .leftJoin(userInNeonAuth, eq(members.userId, userInNeonAuth.id))
    .where(eq(members.familyId, familyId))
    .orderBy(
      sql`CASE WHEN ${members.role} = 'admin' THEN 0 WHEN ${members.role} = 'member' THEN 1 ELSE 2 END`,
      members.joinedAt,
    );
}

export async function getFamilyInvites(familyId: number) {
  const userId = await requireUserId();

  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.familyId, familyId), eq(members.userId, userId)));
  if (!membership || membership.role !== 'admin') return [];

  return db
    .select()
    .from(invites)
    .where(eq(invites.familyId, familyId))
    .orderBy(desc(invites.createdAt));
}

// ─── Shopping ───

export async function getShoppingItems(familyId: number) {
  const userId = await requireUserId();

  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.familyId, familyId), eq(members.userId, userId)));
  if (!membership) return { list: null, items: [] };

  const [list] = await db
    .select()
    .from(shoppingLists)
    .where(and(eq(shoppingLists.familyId, familyId), eq(shoppingLists.status, 'active')))
    .orderBy(desc(shoppingLists.createdAt))
    .limit(1);

  if (!list) return { list: null, items: [] };

  const items = await db
    .select({
      id: shoppingListItems.id,
      name: shoppingListItems.name,
      quantity: shoppingListItems.quantity,
      unit: shoppingListItems.unit,
      checked: shoppingListItems.checked,
      notes: shoppingListItems.notes,
      addedByName: userInNeonAuth.name,
    })
    .from(shoppingListItems)
    .leftJoin(userInNeonAuth, eq(shoppingListItems.addedBy, userInNeonAuth.id))
    .where(eq(shoppingListItems.listId, list.id))
    .orderBy(shoppingListItems.checked, shoppingListItems.createdAt);

  return { list, items };
}

// ─── Tasks ───

export async function getFamilyTasks(familyId: number) {
  const userId = await requireUserId();

  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.familyId, familyId), eq(members.userId, userId)));
  if (!membership) return [];

  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      assignedToName: userInNeonAuth.name,
      assignedToNickname: members.nickname,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .leftJoin(userInNeonAuth, eq(tasks.assignedTo, userInNeonAuth.id))
    .leftJoin(members, and(eq(members.familyId, familyId), eq(members.userId, tasks.assignedTo)))
    .where(eq(tasks.familyId, familyId))
    .orderBy(
      sql`CASE WHEN ${tasks.status} = 'done' THEN 1 ELSE 0 END`,
      sql`CASE WHEN ${tasks.priority} = 'high' THEN 0 WHEN ${tasks.priority} = 'medium' THEN 1 ELSE 2 END`,
      desc(tasks.createdAt),
    );
}

// ─── Notes ───

export async function getFamilyNotes(familyId: number) {
  const userId = await requireUserId();

  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.familyId, familyId), eq(members.userId, userId)));
  if (!membership) return [];

  return db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      pinned: notes.pinned,
      createdByName: userInNeonAuth.name,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .leftJoin(userInNeonAuth, eq(notes.createdBy, userInNeonAuth.id))
    .where(eq(notes.familyId, familyId))
    .orderBy(desc(notes.pinned), desc(notes.updatedAt));
}

// ─── Expenses ───

export async function getFamilyExpenses(familyId: number) {
  const userId = await requireUserId();

  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.familyId, familyId), eq(members.userId, userId)));
  if (!membership) return [];

  return db
    .select({
      id: expenses.id,
      description: expenses.description,
      amount: expenses.amount,
      category: expenses.category,
      date: expenses.date,
      splitType: expenses.splitType,
      paidByName: userInNeonAuth.name,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .leftJoin(userInNeonAuth, eq(expenses.paidBy, userInNeonAuth.id))
    .where(eq(expenses.familyId, familyId))
    .orderBy(desc(expenses.date));
}

export async function getExpenseBalances(familyId: number) {
  const userId = await requireUserId();

  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.familyId, familyId), eq(members.userId, userId)));
  if (!membership) return { settlements: [], summary: 'All settled!' };

  const unsettled = await db
    .select({
      userId: expenseSplits.userId,
      splitAmount: expenseSplits.amount,
      paidBy: expenses.paidBy,
    })
    .from(expenseSplits)
    .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
    .where(and(eq(expenses.familyId, familyId), eq(expenseSplits.settled, false)));

  const balances: Record<string, number> = {};
  for (const row of unsettled) {
    const amount = parseFloat(row.splitAmount);
    balances[row.userId] = (balances[row.userId] || 0) - amount;
    balances[row.paidBy] = (balances[row.paidBy] || 0) + amount;
  }

  const memberList = await db
    .select({
      userId: members.userId,
      nickname: members.nickname,
      name: userInNeonAuth.name,
    })
    .from(members)
    .leftJoin(userInNeonAuth, eq(members.userId, userInNeonAuth.id))
    .where(eq(members.familyId, familyId));

  const nameMap: Record<string, string> = {};
  for (const m of memberList) {
    nameMap[m.userId] = m.nickname || m.name || m.userId;
  }

  const debtors = Object.entries(balances)
    .filter(([, b]) => b < 0)
    .map(([uid, b]) => ({ userId: uid, name: nameMap[uid], amount: -b }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = Object.entries(balances)
    .filter(([, b]) => b > 0)
    .map(([uid, b]) => ({ userId: uid, name: nameMap[uid], amount: b }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Array<{ from: string; to: string; amount: string }> = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const pay = Math.min(debtors[di].amount, creditors[ci].amount);
    if (pay > 0.01) {
      settlements.push({ from: debtors[di].name, to: creditors[ci].name, amount: pay.toFixed(2) });
    }
    debtors[di].amount -= pay;
    creditors[ci].amount -= pay;
    if (debtors[di].amount < 0.01) di++;
    if (creditors[ci].amount < 0.01) ci++;
  }

  return {
    settlements,
    summary: settlements.length === 0
      ? 'All settled!'
      : settlements.map((s) => `${s.from} -> ${s.to}: R$${s.amount}`).join('\n'),
  };
}

// ─── Activity ───

export async function getFamilyFeed(familyId: number, limit = 30) {
  const userId = await requireUserId();

  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.familyId, familyId), eq(members.userId, userId)));
  if (!membership) return [];

  return db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      entityType: activityLog.entityType,
      entityId: activityLog.entityId,
      metadata: activityLog.metadata,
      createdAt: activityLog.createdAt,
      userName: userInNeonAuth.name,
      userNickname: members.nickname,
    })
    .from(activityLog)
    .leftJoin(userInNeonAuth, eq(activityLog.userId, userInNeonAuth.id))
    .leftJoin(members, and(eq(members.familyId, familyId), eq(members.userId, activityLog.userId)))
    .where(eq(activityLog.familyId, familyId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}

// ─── Counts ───

export async function getFamilyCounts(familyId: number) {
  const userId = await requireUserId();

  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.familyId, familyId), eq(members.userId, userId)));
  if (!membership) return { members: 0, pendingItems: 0, pendingTasks: 0, notes: 0, totalExpenses: 0 };

  const [row] = await db
    .select({
      memberCount: sql<number>`(SELECT count(*) FROM mcp_familia.members WHERE "familyId" = ${familyId})::int`,
      pendingItems: sql<number>`(SELECT count(*) FROM mcp_familia.shopping_list_items sli JOIN mcp_familia.shopping_lists sl ON sli."listId" = sl.id WHERE sl."familyId" = ${familyId} AND sl.status = 'active' AND sli.checked = false)::int`,
      pendingTasks: sql<number>`(SELECT count(*) FROM mcp_familia.tasks WHERE "familyId" = ${familyId} AND status != 'done')::int`,
      noteCount: sql<number>`(SELECT count(*) FROM mcp_familia.notes WHERE "familyId" = ${familyId})::int`,
      totalExpenses: sql<number>`COALESCE((SELECT sum(amount::numeric) FROM mcp_familia.expenses WHERE "familyId" = ${familyId}), 0)::numeric`,
    })
    .from(sql`(SELECT 1) as _`);

  return {
    members: row.memberCount,
    pendingItems: row.pendingItems,
    pendingTasks: row.pendingTasks,
    notes: row.noteCount,
    totalExpenses: Number(row.totalExpenses),
  };
}

// ─── Usage ───

export async function getUserFamiliaUsage() {
  return getUserMcpUsage('familia');
}

'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { eq, and, desc, sql, gt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
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

// ─── Helpers (internal) ───

async function requireFamilyMember(userId: string, familyId: number, minRole?: 'admin') {
  const [membership] = await db
    .select()
    .from(members)
    .where(and(eq(members.familyId, familyId), eq(members.userId, userId)));
  if (!membership) throw new Error('Not a member of this family');
  if (minRole === 'admin' && membership.role !== 'admin') throw new Error('Admin role required');
  return membership;
}

async function logActivity(
  familyId: number,
  userId: string,
  action: string,
  entityType: string,
  entityId?: number,
  metadata?: Record<string, unknown>,
) {
  await db.insert(activityLog).values({
    familyId,
    userId,
    action,
    entityType,
    entityId: entityId ?? null,
    metadata: metadata ?? null,
  });
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
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

// ─── Write Actions ───

export async function createFamily(name: string, description?: string) {
  try {
    const userId = await requireUserId();

    const [family] = await db
      .insert(families)
      .values({ name, description: description || null, createdBy: userId })
      .returning();

    await db.insert(members).values({ familyId: family.id, userId, role: 'admin' });
    await logActivity(family.id, userId, 'created', 'family', family.id, { name });

    revalidatePath('/dashboard/familia');
    return { data: family };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create family' };
  }
}

export async function joinFamily(code: string) {
  try {
    const userId = await requireUserId();

    const [invite] = await db
      .select()
      .from(invites)
      .where(and(eq(invites.code, code), gt(invites.expiresAt, new Date().toISOString())));

    if (!invite) return { error: 'Convite inválido ou expirado' };
    if (invite.usedBy) return { error: 'Convite já utilizado' };

    // Check not already a member
    const [existing] = await db
      .select()
      .from(members)
      .where(and(eq(members.familyId, invite.familyId), eq(members.userId, userId)));
    if (existing) return { error: 'Você já faz parte desta família' };

    await db.insert(members).values({ familyId: invite.familyId, userId, role: invite.role });
    await db.update(invites).set({ usedBy: userId }).where(eq(invites.id, invite.id));
    await logActivity(invite.familyId, userId, 'joined', 'member', undefined, { role: invite.role });

    revalidatePath('/dashboard/familia');
    return { data: { familyId: invite.familyId } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to join family' };
  }
}

export async function addShoppingItem(
  familyId: number,
  item: string,
  quantity?: number,
  unit?: string,
  itemNotes?: string,
) {
  try {
    const userId = await requireUserId();
    await requireFamilyMember(userId, familyId);

    // Find or create active list
    let [list] = await db
      .select()
      .from(shoppingLists)
      .where(and(eq(shoppingLists.familyId, familyId), eq(shoppingLists.status, 'active')))
      .orderBy(desc(shoppingLists.createdAt))
      .limit(1);

    if (!list) {
      [list] = await db
        .insert(shoppingLists)
        .values({ familyId, name: 'Lista de Compras', createdBy: userId })
        .returning();
    }

    const [newItem] = await db
      .insert(shoppingListItems)
      .values({
        listId: list.id,
        name: item,
        quantity: quantity || 1,
        unit: unit || null,
        notes: itemNotes || null,
        addedBy: userId,
      })
      .returning();

    await logActivity(familyId, userId, 'added', 'shopping_item', newItem.id, { item });

    revalidatePath('/dashboard/familia');
    return { data: newItem };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to add item' };
  }
}

export async function toggleShoppingItem(familyId: number, itemId: number, checked: boolean) {
  try {
    const userId = await requireUserId();
    await requireFamilyMember(userId, familyId);

    await db
      .update(shoppingListItems)
      .set({ checked, checkedBy: checked ? userId : null })
      .where(eq(shoppingListItems.id, itemId));

    await logActivity(familyId, userId, checked ? 'checked' : 'unchecked', 'shopping_item', itemId);

    revalidatePath('/dashboard/familia');
    return { data: { id: itemId, checked } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to toggle item' };
  }
}

export async function addTask(
  familyId: number,
  title: string,
  description?: string,
  assignedTo?: string,
  priority?: string,
  dueDate?: string,
) {
  try {
    const userId = await requireUserId();
    await requireFamilyMember(userId, familyId);

    const [task] = await db
      .insert(tasks)
      .values({
        familyId,
        title,
        description: description || null,
        assignedTo: assignedTo || null,
        priority: priority || 'medium',
        dueDate: dueDate || null,
        createdBy: userId,
      })
      .returning();

    await logActivity(familyId, userId, 'created', 'task', task.id, { title });

    revalidatePath('/dashboard/familia');
    return { data: task };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to add task' };
  }
}

export async function updateTaskStatus(familyId: number, taskId: number, status: string) {
  try {
    const userId = await requireUserId();
    await requireFamilyMember(userId, familyId);

    await db
      .update(tasks)
      .set({ status, updatedAt: new Date().toISOString() })
      .where(eq(tasks.id, taskId));

    await logActivity(familyId, userId, 'updated', 'task', taskId, { status });

    revalidatePath('/dashboard/familia');
    return { data: { id: taskId, status } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to update task' };
  }
}

export async function deleteTask(familyId: number, taskId: number) {
  try {
    const userId = await requireUserId();
    await requireFamilyMember(userId, familyId);

    await db.delete(tasks).where(eq(tasks.id, taskId));
    await logActivity(familyId, userId, 'removed', 'task', taskId);

    revalidatePath('/dashboard/familia');
    return { data: { id: taskId } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete task' };
  }
}

export async function addNote(familyId: number, title: string, content: string) {
  try {
    const userId = await requireUserId();
    await requireFamilyMember(userId, familyId);

    const [note] = await db
      .insert(notes)
      .values({ familyId, title, content, createdBy: userId })
      .returning();

    await logActivity(familyId, userId, 'created', 'note', note.id, { title });

    revalidatePath('/dashboard/familia');
    return { data: note };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to add note' };
  }
}

export async function toggleNotePin(familyId: number, noteId: number, pinned: boolean) {
  try {
    const userId = await requireUserId();
    await requireFamilyMember(userId, familyId);

    await db
      .update(notes)
      .set({ pinned, updatedBy: userId, updatedAt: new Date().toISOString() })
      .where(eq(notes.id, noteId));

    await logActivity(familyId, userId, 'updated', 'note', noteId, { pinned });

    revalidatePath('/dashboard/familia');
    return { data: { id: noteId, pinned } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to toggle pin' };
  }
}

export async function deleteNote(familyId: number, noteId: number) {
  try {
    const userId = await requireUserId();
    await requireFamilyMember(userId, familyId);

    await db.delete(notes).where(eq(notes.id, noteId));
    await logActivity(familyId, userId, 'removed', 'note', noteId);

    revalidatePath('/dashboard/familia');
    return { data: { id: noteId } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete note' };
  }
}

export async function deleteShoppingItem(familyId: number, itemId: number) {
  try {
    const userId = await requireUserId();
    await requireFamilyMember(userId, familyId);

    await db.delete(shoppingListItems).where(eq(shoppingListItems.id, itemId));
    await logActivity(familyId, userId, 'removed', 'shopping_item', itemId);

    revalidatePath('/dashboard/familia');
    return { data: { id: itemId } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete item' };
  }
}

export async function addExpense(
  familyId: number,
  description: string,
  amount: number,
  category?: string,
  splitType?: string,
  expenseDate?: string,
) {
  try {
    const userId = await requireUserId();
    await requireFamilyMember(userId, familyId);

    const dateStr = expenseDate || new Date().toISOString().split('T')[0];
    const split = splitType || 'equal';

    const [expense] = await db
      .insert(expenses)
      .values({
        familyId,
        description,
        amount: amount.toFixed(2),
        category: category || null,
        paidBy: userId,
        splitType: split,
        date: dateStr,
      })
      .returning();

    // Equal split among all members
    if (split === 'equal') {
      const familyMembers = await db
        .select({ userId: members.userId })
        .from(members)
        .where(eq(members.familyId, familyId));

      const splitAmount = (amount / familyMembers.length).toFixed(2);
      await db.insert(expenseSplits).values(
        familyMembers.map((m) => ({
          expenseId: expense.id,
          userId: m.userId,
          amount: splitAmount,
        })),
      );
    }

    await logActivity(familyId, userId, 'logged', 'expense', expense.id, {
      description,
      amount: amount.toFixed(2),
    });

    revalidatePath('/dashboard/familia');
    return { data: expense };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to add expense' };
  }
}

export async function deleteExpense(familyId: number, expenseId: number) {
  try {
    const userId = await requireUserId();
    await requireFamilyMember(userId, familyId);

    // Splits cascade-delete via FK
    await db.delete(expenses).where(eq(expenses.id, expenseId));
    await logActivity(familyId, userId, 'removed', 'expense', expenseId);

    revalidatePath('/dashboard/familia');
    return { data: { id: expenseId } };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to delete expense' };
  }
}

export async function generateInvite(familyId: number, role?: string, expiresInHours?: number) {
  try {
    const userId = await requireUserId();
    await requireFamilyMember(userId, familyId, 'admin');

    const code = generateInviteCode();
    const hours = expiresInHours || 72;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

    const [invite] = await db
      .insert(invites)
      .values({
        familyId,
        code,
        role: role || 'member',
        createdBy: userId,
        expiresAt,
      })
      .returning();

    await logActivity(familyId, userId, 'created_invite', 'invite', invite.id, {
      role: role || 'member',
      code,
    });

    revalidatePath('/dashboard/familia');
    return { data: invite };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to generate invite' };
  }
}

// ─── Pagination ───

export async function getMoreFeed(familyId: number, offset: number, limit = 30) {
  const userId = await requireUserId();
  await requireFamilyMember(userId, familyId);

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
    .limit(limit)
    .offset(offset);
}

// ─── Usage ───

export async function getUserFamiliaUsage() {
  return getUserMcpUsage('familia');
}

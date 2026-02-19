import { z } from 'zod';
import { eq, and, sql, desc, isNull } from 'drizzle-orm';
import { db } from '../../db';
import { getUserId } from '../auth-helpers';
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
} from './familia.schema';
import { userInNeonAuth } from '../../db/public.schema';
import type { McpServerDefinition } from '../types';
import { toolError } from '../errors';

const ROLE_HIERARCHY: Record<string, number> = { viewer: 0, member: 1, admin: 2 };

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
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

/**
 * Central helper: verifies user is a member of the family with at least `minRole`.
 * - If user belongs to 1 family and no familyId given: auto-selects it.
 * - If user belongs to N families and no familyId: returns error listing options.
 */
async function requireFamilyMember(
  userId: string,
  familyId: number | undefined,
  minRole: 'viewer' | 'member' | 'admin' = 'viewer',
): Promise<{ ok: true; familyId: number; member: typeof members.$inferSelect } | { ok: false; error: string }> {
  const userMemberships = await db
    .select({
      member: members,
      familyName: families.name,
    })
    .from(members)
    .innerJoin(families, eq(members.familyId, families.id))
    .where(eq(members.userId, userId));

  if (userMemberships.length === 0) {
    return { ok: false, error: 'You are not a member of any family. Create one with create_family or join one with join_family using an invite code.' };
  }

  let membership: (typeof userMemberships)[number] | undefined;

  if (familyId !== undefined) {
    membership = userMemberships.find((m) => m.member.familyId === familyId);
    if (!membership) {
      return { ok: false, error: `You are not a member of family #${familyId}.` };
    }
  } else if (userMemberships.length === 1) {
    membership = userMemberships[0];
  } else {
    const list = userMemberships.map((m) => `  - #${m.member.familyId}: ${m.familyName} (${m.member.role})`).join('\n');
    return { ok: false, error: `You belong to multiple families. Please specify familyId:\n${list}` };
  }

  const userLevel = ROLE_HIERARCHY[membership.member.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

  if (userLevel < requiredLevel) {
    return { ok: false, error: `Requires ${minRole} role. Your role: ${membership.member.role}.` };
  }

  return { ok: true, familyId: membership.member.familyId, member: membership.member };
}

/** Resolve a nickname to userId within a family */
async function resolveNickname(familyId: number, nickname: string): Promise<string | null> {
  const [match] = await db
    .select({ userId: members.userId })
    .from(members)
    .where(and(eq(members.familyId, familyId), sql`LOWER(${members.nickname}) = LOWER(${nickname})`));
  return match?.userId ?? null;
}

export const familiaServer: McpServerDefinition = {
  name: 'familia',
  description:
    'Familia — Shared family workspace: shopping lists, tasks, notes, expenses and activity feed for family members',
  category: 'Family Tools',
  icon: '/familia.png',
  badge: 'New',
  instructions: `# Familia — Shared Family Workspace

## Purpose
Familia provides a shared workspace for family members: shopping lists, tasks, notes, expense tracking with balance splitting, and an activity feed. All data is scoped to a family group with role-based access.

## Key Concepts
- **Family**: A group of users. Created by one person (admin), others join via invite codes.
- **Roles**: admin (full control + invites), member (read/write), viewer (read-only). Role hierarchy: viewer < member < admin.
- **Invite Code**: 8-character alphanumeric code. Single use, expires (default 72h).
- **Family ID**: If a user belongs to one family, familyId is auto-detected. For multi-family users, familyId must be specified in every call.

## Modules
| Module | Tools | Min Role |
|--------|-------|----------|
| Family | create_family, invite_member, join_family, manage_members | varies |
| Shopping | add_shopping_item, list_shopping, check_shopping_item | member/viewer |
| Tasks | create_task, list_tasks, update_task | member/viewer |
| Notes | create_note, list_notes | member/viewer |
| Expenses | log_expense, expense_balances | member/viewer |
| Feed | family_feed | viewer |

## Typical Workflows
1. **Setup**: create_family → invite_member → (other person) join_family
2. **Shopping**: add_shopping_item → list_shopping → check_shopping_item
3. **Tasks**: create_task → list_tasks → update_task (status: done)
4. **Expenses**: log_expense → expense_balances (who owes whom)
5. **Coordination**: family_feed to see recent activity

## Conventions
- IDs are numeric. Get them from list/creation responses.
- Nicknames can be used instead of userIds for task assignment and expense splits.
- Dates in YYYY-MM-DD format.
- All write operations are logged in the activity feed automatically.`,
  tools: [
    {
      name: 'create_family',
      description: 'Create a new family group. You become the admin with full control. Provide a name, optional description, and your nickname in this family. After creating, use invite_member to generate codes for family members to join.',
    },
    {
      name: 'invite_member',
      description: 'Generate a single-use invite code for someone to join the family. Requires admin role. The code is 8 alphanumeric characters, expires after the specified hours (default 72h). Share the code with the person — they use join_family to redeem it.',
    },
    {
      name: 'join_family',
      description: 'Join a family using an 8-character invite code. Optionally set your nickname. The code is single-use and must not be expired. You get the role specified when the invite was created (usually member).',
    },
    {
      name: 'manage_members',
      description: 'List, change role, or remove family members. Action "list" requires viewer role, "change_role" and "remove" require admin role. For list: returns all members with userId, role, nickname, name, and join date. For change_role: provide targetUserId and newRole. For remove: provide targetUserId (cannot remove yourself).',
    },
    {
      name: 'add_shopping_item',
      description: 'Add an item to the active family shopping list. Creates a new list if none exists. Requires member role. Provide the item name, optional quantity, unit, and notes. The list is shared — all family members see it.',
    },
    {
      name: 'list_shopping',
      description: 'List all items from the active family shopping list, grouped by pending and checked. Shows who added each item. Use showChecked=false to see only pending items. Read-only — requires viewer role.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'check_shopping_item',
      description: 'Mark a shopping list item as bought (or uncheck it). Requires member role and the item ID from list_shopping. Records who checked it. Use uncheck=true to revert. Idempotent.',
      annotations: { idempotentHint: true },
    },
    {
      name: 'create_task',
      description: 'Create a family task with optional assignee, due date, and priority. Requires member role. Assignee can be a nickname or userId — must be a family member. Priority: low, medium (default), or high. Returns the created task.',
    },
    {
      name: 'list_tasks',
      description: 'List family tasks with optional filters by status, assignee, and limit. Shows assignee name/nickname. Ordered by: active before done, high priority first, then newest. Read-only — requires viewer role.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'update_task',
      description: 'Update a task\'s status, assignment, priority, title, or description. Requires member role and the task ID from list_tasks. Status flow: pending → in_progress → done. Assignee can be nickname or userId.',
      annotations: { idempotentHint: true },
    },
    {
      name: 'create_note',
      description: 'Create a shared family note in markdown. Requires member role. Optionally pin the note so it appears first in list_notes. All family members can see it. Use for recipes, instructions, shared info.',
    },
    {
      name: 'list_notes',
      description: 'List family notes, pinned notes first, then by last updated. Shows author name and timestamps. Read-only — requires viewer role.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'log_expense',
      description: 'Log a family expense and split it among members. Requires member role. Split equally (default — divides among all members) or custom (specify amounts per nickname). The payer\'s share is auto-settled. Date defaults to today.',
    },
    {
      name: 'expense_balances',
      description: 'Calculate who owes whom based on unsettled expenses. Uses a debt simplification algorithm to minimize the number of transfers. Read-only — requires viewer role. Returns a list of settlements: "A → B: R$X.XX".',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'family_feed',
      description: 'Recent family activity feed showing who did what. All write operations (adding items, completing tasks, logging expenses, etc.) are automatically logged. Returns entries with action, entity type, actor name/nickname, and timestamp. Read-only — requires viewer role.',
      annotations: { readOnlyHint: true },
    },
  ],
  init: (server) => {
    // ─── create_family ───
    server.tool(
      'create_family',
      'Create a new family group. You become the admin with full control. Provide a name, optional description, and your nickname in this family. After creating, use invite_member to generate codes for family members to join.',
      {
        name: z.string().describe('Family name, e.g. "Silva Family" or "Roommates"'),
        description: z.string().optional().describe('Family description'),
        nickname: z.string().optional().describe('Your display name within this family'),
      },
      async ({ name, description, nickname }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [family] = await db.insert(families).values({
          name,
          description: description || null,
          createdBy: userId,
        }).returning();

        await db.insert(members).values({
          familyId: family.id,
          userId,
          role: 'admin',
          nickname: nickname || null,
        });

        await logActivity(family.id, userId, 'created', 'family', family.id, { name });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: family.id,
              name: family.name,
              role: 'admin',
              message: 'Family created! Share an invite code with family members.',
            }, null, 2),
          }],
        };
      },
    );

    // ─── invite_member ───
    server.tool(
      'invite_member',
      'Generate a single-use invite code for someone to join the family. Requires admin role. The code is 8 alphanumeric characters, expires after the specified hours (default 72h). Share the code with the person — they use join_family to redeem it.',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
        role: z.enum(['member', 'viewer']).optional().default('member').describe('Role for the invitee: "member" (read/write) or "viewer" (read-only)'),
        expiresInHours: z.number().optional().default(72).describe('Hours until the invite expires (default: 72, i.e. 3 days)'),
      },
      async ({ familyId, role, expiresInHours }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const check = await requireFamilyMember(userId, familyId, 'admin');
        if (!check.ok) return toolError(check.error);

        const code = generateInviteCode();
        const expiresAt = new Date(Date.now() + expiresInHours * 3600000).toISOString();

        await db.insert(invites).values({
          familyId: check.familyId,
          code,
          role,
          createdBy: userId,
          expiresAt,
        });

        await logActivity(check.familyId, userId, 'created_invite', 'invite', undefined, { code, role });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              code,
              role,
              expiresAt,
              message: `Share this code: ${code}. They can join with: join_family(code="${code}")`,
            }, null, 2),
          }],
        };
      },
    );

    // ─── join_family ───
    server.tool(
      'join_family',
      'Join a family using an 8-character invite code. Optionally set your nickname. The code is single-use and must not be expired. You get the role specified when the invite was created (usually member).',
      {
        code: z.string().describe('8-character alphanumeric invite code (case-insensitive)'),
        nickname: z.string().optional().describe('Your display name within this family'),
      },
      async ({ code, nickname }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [invite] = await db
          .select()
          .from(invites)
          .where(and(eq(invites.code, code.toUpperCase()), isNull(invites.usedBy)));

        if (!invite) {
          return toolError('Invalid or already-used invite code.', 'Ask the family admin to generate a new invite code with invite_member.');
        }

        if (new Date(invite.expiresAt) < new Date()) {
          return toolError('Invite code has expired.', 'Ask the family admin to generate a new invite code with invite_member.');
        }

        // Check if already a member
        const [existing] = await db
          .select()
          .from(members)
          .where(and(eq(members.familyId, invite.familyId), eq(members.userId, userId)));

        if (existing) {
          return toolError('You are already a member of this family.');
        }

        await db.insert(members).values({
          familyId: invite.familyId,
          userId,
          role: invite.role,
          nickname: nickname || null,
        });

        await db.update(invites).set({ usedBy: userId }).where(eq(invites.id, invite.id));

        const [family] = await db.select({ name: families.name }).from(families).where(eq(families.id, invite.familyId));

        await logActivity(invite.familyId, userId, 'joined', 'member', undefined, { nickname });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              familyId: invite.familyId,
              familyName: family?.name,
              role: invite.role,
              message: `Welcome to ${family?.name}!`,
            }, null, 2),
          }],
        };
      },
    );

    // ─── manage_members ───
    server.tool(
      'manage_members',
      'List, change role, or remove family members. Action "list" requires viewer role, "change_role" and "remove" require admin role. For list: returns all members with userId, role, nickname, name, and join date. For change_role: provide targetUserId and newRole. For remove: provide targetUserId (cannot remove yourself).',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
        action: z.enum(['list', 'change_role', 'remove']).describe('Action: "list" (see members), "change_role" (change a member role), "remove" (remove a member)'),
        targetUserId: z.string().optional().describe('UUID of the target user — get from manage_members action="list"'),
        newRole: z.enum(['admin', 'member', 'viewer']).optional().describe('New role: "admin", "member", or "viewer"'),
      },
      async ({ familyId, action, targetUserId, newRole }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const minRole = action === 'list' ? 'viewer' : 'admin';
        const check = await requireFamilyMember(userId, familyId, minRole as 'viewer' | 'admin');
        if (!check.ok) return toolError(check.error);

        if (action === 'list') {
          const memberList = await db
            .select({
              userId: members.userId,
              role: members.role,
              nickname: members.nickname,
              joinedAt: members.joinedAt,
              name: userInNeonAuth.name,
            })
            .from(members)
            .leftJoin(userInNeonAuth, eq(members.userId, userInNeonAuth.id))
            .where(eq(members.familyId, check.familyId));

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(memberList, null, 2),
            }],
          };
        }

        if (!targetUserId) {
          return toolError('targetUserId is required for this action.', 'Use manage_members with action="list" to see member userIds.');
        }

        if (action === 'change_role') {
          if (!newRole) {
            return toolError('newRole is required for change_role action.', 'Valid roles: "admin", "member", "viewer".');
          }
          await db
            .update(members)
            .set({ role: newRole })
            .where(and(eq(members.familyId, check.familyId), eq(members.userId, targetUserId)));

          await logActivity(check.familyId, userId, 'changed_role', 'member', undefined, { targetUserId, newRole });

          return { content: [{ type: 'text' as const, text: `Role changed to ${newRole}.` }] };
        }

        if (action === 'remove') {
          if (targetUserId === userId) {
            return toolError('Cannot remove yourself from the family.', 'Ask another admin to remove you, or leave the family.');
          }
          await db
            .delete(members)
            .where(and(eq(members.familyId, check.familyId), eq(members.userId, targetUserId)));

          await logActivity(check.familyId, userId, 'removed', 'member', undefined, { targetUserId });

          return { content: [{ type: 'text' as const, text: 'Member removed.' }] };
        }

        return toolError('Unknown action.', 'Valid actions: "list", "change_role", "remove".');
      },
    );

    // ─── add_shopping_item ───
    server.tool(
      'add_shopping_item',
      'Add an item to the active family shopping list. Creates a new list if none exists. Requires member role. Provide the item name, optional quantity, unit, and notes. The list is shared — all family members see it.',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
        item: z.string().describe('Item name, e.g. "milk", "bread", "2kg rice"'),
        quantity: z.number().optional().default(1).describe('Quantity (default: 1)'),
        unit: z.string().optional().describe('Unit: "kg", "un", "L", "g", "ml", etc.'),
        listName: z.string().optional().default('Shopping List').describe('List name if creating new'),
        notes: z.string().optional().describe('Notes about the item'),
      },
      async ({ familyId, item, quantity, unit, listName, notes: itemNotes }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const check = await requireFamilyMember(userId, familyId, 'member');
        if (!check.ok) return toolError(check.error);

        // Find or create active list
        let [list] = await db
          .select()
          .from(shoppingLists)
          .where(and(eq(shoppingLists.familyId, check.familyId), eq(shoppingLists.status, 'active')))
          .orderBy(desc(shoppingLists.createdAt))
          .limit(1);

        if (!list) {
          [list] = await db.insert(shoppingLists).values({
            familyId: check.familyId,
            name: listName,
            createdBy: userId,
          }).returning();
        }

        const [added] = await db.insert(shoppingListItems).values({
          listId: list.id,
          name: item,
          quantity,
          unit: unit || null,
          addedBy: userId,
          notes: itemNotes || null,
        }).returning();

        await logActivity(check.familyId, userId, 'added', 'shopping_item', added.id, { item, quantity, unit });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: added.id,
              item: added.name,
              quantity: added.quantity,
              unit: added.unit,
              list: list.name,
            }, null, 2),
          }],
        };
      },
    );

    // ─── list_shopping ───
    server.tool(
      'list_shopping',
      'List all items from the active family shopping list, grouped by pending and checked. Shows who added each item. Use showChecked=false to see only pending items. Read-only — requires viewer role.',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
        showChecked: z.boolean().optional().default(true).describe('Include checked/bought items in the list (default: true)'),
      },
      { readOnlyHint: true },
      async ({ familyId, showChecked }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const check = await requireFamilyMember(userId, familyId, 'viewer');
        if (!check.ok) return toolError(check.error);

        const [list] = await db
          .select()
          .from(shoppingLists)
          .where(and(eq(shoppingLists.familyId, check.familyId), eq(shoppingLists.status, 'active')))
          .orderBy(desc(shoppingLists.createdAt))
          .limit(1);

        if (!list) {
          return toolError('No active shopping list.', 'Create one by adding an item with add_shopping_item.');
        }

        const conditions = [eq(shoppingListItems.listId, list.id)];
        if (!showChecked) {
          conditions.push(eq(shoppingListItems.checked, false));
        }

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
          .where(and(...conditions))
          .orderBy(shoppingListItems.checked, shoppingListItems.createdAt);

        const pending = items.filter((i) => !i.checked);
        const checked = items.filter((i) => i.checked);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              list: list.name,
              pending: pending.length,
              checked: checked.length,
              items,
            }, null, 2),
          }],
        };
      },
    );

    // ─── check_shopping_item ───
    server.tool(
      'check_shopping_item',
      'Mark a shopping list item as bought (or uncheck it). Requires member role and the item ID from list_shopping. Records who checked it. Use uncheck=true to revert. Idempotent.',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
        itemId: z.number().describe('Numeric item ID — get from list_shopping'),
        uncheck: z.boolean().optional().default(false).describe('Set to true to uncheck'),
      },
      { idempotentHint: true },
      async ({ familyId, itemId, uncheck }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const check = await requireFamilyMember(userId, familyId, 'member');
        if (!check.ok) return toolError(check.error);

        // Verify item belongs to family's list
        const [item] = await db
          .select({
            id: shoppingListItems.id,
            name: shoppingListItems.name,
            listFamilyId: shoppingLists.familyId,
          })
          .from(shoppingListItems)
          .innerJoin(shoppingLists, eq(shoppingListItems.listId, shoppingLists.id))
          .where(and(eq(shoppingListItems.id, itemId), eq(shoppingLists.familyId, check.familyId)));

        if (!item) {
          return toolError('Item not found in your family shopping list.', 'Use list_shopping to see current items and their IDs.');
        }

        await db
          .update(shoppingListItems)
          .set({
            checked: !uncheck,
            checkedBy: uncheck ? null : userId,
          })
          .where(eq(shoppingListItems.id, itemId));

        await logActivity(check.familyId, userId, uncheck ? 'unchecked' : 'checked', 'shopping_item', itemId, { item: item.name });

        return {
          content: [{
            type: 'text' as const,
            text: `"${item.name}" ${uncheck ? 'unchecked' : 'checked off'}.`,
          }],
        };
      },
    );

    // ─── create_task ───
    server.tool(
      'create_task',
      'Create a family task with optional assignee, due date, and priority. Requires member role. Assignee can be a nickname or userId — must be a family member. Priority: low, medium (default), or high. Returns the created task.',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
        title: z.string().describe('Task title — clear and actionable, e.g. "Buy groceries", "Fix kitchen light"'),
        description: z.string().optional().describe('Task description'),
        assignedTo: z.string().optional().describe('Nickname or userId of the assignee — must be a family member'),
        dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format'),
        priority: z.enum(['low', 'medium', 'high']).optional().default('medium').describe('Priority: "low", "medium" (default), or "high"'),
      },
      async ({ familyId, title, description, assignedTo, dueDate, priority }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const check = await requireFamilyMember(userId, familyId, 'member');
        if (!check.ok) return toolError(check.error);

        let assigneeId: string | null = null;
        if (assignedTo) {
          // Try as nickname first, then as userId
          assigneeId = await resolveNickname(check.familyId, assignedTo) || assignedTo;
          // Verify assignee is a family member
          const [isMember] = await db
            .select()
            .from(members)
            .where(and(eq(members.familyId, check.familyId), eq(members.userId, assigneeId)));
          if (!isMember) {
            return toolError(`"${assignedTo}" is not a family member.`, 'Use manage_members with action="list" to see family members and their nicknames.');
          }
        }

        const [task] = await db.insert(tasks).values({
          familyId: check.familyId,
          title,
          description: description || null,
          assignedTo: assigneeId,
          dueDate: dueDate || null,
          priority,
          createdBy: userId,
        }).returning();

        await logActivity(check.familyId, userId, 'created', 'task', task.id, { title, assignedTo });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: task.id,
              title: task.title,
              status: task.status,
              priority: task.priority,
              assignedTo: task.assignedTo,
              dueDate: task.dueDate,
            }, null, 2),
          }],
        };
      },
    );

    // ─── list_tasks ───
    server.tool(
      'list_tasks',
      'List family tasks with optional filters by status, assignee, and limit. Shows assignee name/nickname. Ordered by: active before done, high priority first, then newest. Read-only — requires viewer role.',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
        status: z.enum(['pending', 'in_progress', 'done', 'all']).optional().default('all').describe('Filter: "pending", "in_progress", "done", or "all" (default)'),
        assignedTo: z.string().optional().describe('Nickname or userId of the assignee — must be a family member'),
        limit: z.number().optional().default(20).describe('Max results to return (default: 20)'),
      },
      { readOnlyHint: true },
      async ({ familyId, status, assignedTo, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const check = await requireFamilyMember(userId, familyId, 'viewer');
        if (!check.ok) return toolError(check.error);

        const conditions = [eq(tasks.familyId, check.familyId)];
        if (status !== 'all') conditions.push(eq(tasks.status, status));
        if (assignedTo) {
          const resolvedId = await resolveNickname(check.familyId, assignedTo) || assignedTo;
          conditions.push(eq(tasks.assignedTo, resolvedId));
        }

        const result = await db
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
          })
          .from(tasks)
          .leftJoin(userInNeonAuth, eq(tasks.assignedTo, userInNeonAuth.id))
          .leftJoin(members, and(eq(members.familyId, check.familyId), eq(members.userId, tasks.assignedTo)))
          .where(and(...conditions))
          .orderBy(
            sql`CASE WHEN ${tasks.status} = 'done' THEN 1 ELSE 0 END`,
            sql`CASE WHEN ${tasks.priority} = 'high' THEN 0 WHEN ${tasks.priority} = 'medium' THEN 1 ELSE 2 END`,
            desc(tasks.createdAt),
          )
          .limit(limit);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      },
    );

    // ─── update_task ───
    server.tool(
      'update_task',
      'Update a task\'s status, assignment, priority, title, or description. Requires member role and the task ID from list_tasks. Status flow: pending → in_progress → done. Assignee can be nickname or userId.',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
        taskId: z.number().describe('Numeric task ID — get from list_tasks'),
        status: z.enum(['pending', 'in_progress', 'done']).optional().describe('New status: "pending", "in_progress", or "done"'),
        assignedTo: z.string().optional().describe('Nickname or userId of the assignee — must be a family member'),
        priority: z.enum(['low', 'medium', 'high']).optional().describe('Priority: "low", "medium" (default), or "high"'),
        title: z.string().optional().describe('Task title — clear and actionable, e.g. "Buy groceries", "Fix kitchen light"'),
        description: z.string().optional().describe('Task description'),
      },
      { idempotentHint: true },
      async ({ familyId, taskId, status: newStatus, assignedTo, priority, title, description }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const check = await requireFamilyMember(userId, familyId, 'member');
        if (!check.ok) return toolError(check.error);

        const [task] = await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, taskId), eq(tasks.familyId, check.familyId)));

        if (!task) {
          return toolError('Task not found.', 'Use list_tasks to see tasks and their IDs.');
        }

        const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
        if (newStatus !== undefined) updates.status = newStatus;
        if (priority !== undefined) updates.priority = priority;
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (assignedTo !== undefined) {
          const resolvedId = await resolveNickname(check.familyId, assignedTo) || assignedTo;
          updates.assignedTo = resolvedId;
        }

        await db.update(tasks).set(updates).where(eq(tasks.id, taskId));

        await logActivity(check.familyId, userId, 'updated', 'task', taskId, { changes: Object.keys(updates).filter((k) => k !== 'updatedAt') });

        return {
          content: [{
            type: 'text' as const,
            text: `Task "${task.title}" updated.`,
          }],
        };
      },
    );

    // ─── create_note ───
    server.tool(
      'create_note',
      'Create a shared family note in markdown. Requires member role. Optionally pin the note so it appears first in list_notes. All family members can see it. Use for recipes, instructions, shared info.',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
        title: z.string().describe('Note title'),
        content: z.string().describe('Note content in markdown format'),
        pinned: z.boolean().optional().default(false).describe('Pin this note to appear first in list_notes (default: false)'),
      },
      async ({ familyId, title, content, pinned }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const check = await requireFamilyMember(userId, familyId, 'member');
        if (!check.ok) return toolError(check.error);

        const [note] = await db.insert(notes).values({
          familyId: check.familyId,
          title,
          content,
          pinned,
          createdBy: userId,
        }).returning();

        await logActivity(check.familyId, userId, 'created', 'note', note.id, { title });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: note.id,
              title: note.title,
              pinned: note.pinned,
              createdAt: note.createdAt,
            }, null, 2),
          }],
        };
      },
    );

    // ─── list_notes ───
    server.tool(
      'list_notes',
      'List family notes, pinned notes first, then by last updated. Shows author name and timestamps. Read-only — requires viewer role.',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
        limit: z.number().optional().default(20).describe('Max results to return (default: 20)'),
      },
      { readOnlyHint: true },
      async ({ familyId, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const check = await requireFamilyMember(userId, familyId, 'viewer');
        if (!check.ok) return toolError(check.error);

        const result = await db
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
          .where(eq(notes.familyId, check.familyId))
          .orderBy(desc(notes.pinned), desc(notes.updatedAt))
          .limit(limit);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      },
    );

    // ─── log_expense ───
    server.tool(
      'log_expense',
      'Log a family expense and split it among members. Requires member role. Split equally (default — divides among all members) or custom (specify amounts per nickname). The payer\'s share is auto-settled. Date defaults to today.',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
        description: z.string().describe('What the expense was for, e.g. "Groceries at Carrefour"'),
        amount: z.number().describe('Total amount in R$ (e.g. 150.50)'),
        category: z.string().optional().describe('Expense category: "food", "transport", "utilities", "health", "entertainment", etc.'),
        date: z.string().optional().describe('Expense date in YYYY-MM-DD format (defaults to today)'),
        splitType: z.enum(['equal', 'custom']).optional().default('equal').describe('How to split: "equal" (divide among all members) or "custom" (specify per person)'),
        customSplits: z
          .array(z.object({ nickname: z.string(), amount: z.number() }))
          .optional()
          .describe('Custom split amounts per person: [{nickname: "Mom", amount: 50}, {nickname: "Dad", amount: 100}]'),
      },
      async ({ familyId, description, amount, category, date: expDate, splitType, customSplits }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const check = await requireFamilyMember(userId, familyId, 'member');
        if (!check.ok) return toolError(check.error);

        const dateStr = expDate || new Date().toISOString().slice(0, 10);

        const [expense] = await db.insert(expenses).values({
          familyId: check.familyId,
          description,
          amount: amount.toFixed(2),
          category: category || null,
          paidBy: userId,
          splitType,
          date: dateStr,
        }).returning();

        // Create splits
        if (splitType === 'equal') {
          const familyMembers = await db
            .select({ userId: members.userId })
            .from(members)
            .where(eq(members.familyId, check.familyId));

          const splitAmount = (amount / familyMembers.length).toFixed(2);

          for (const m of familyMembers) {
            await db.insert(expenseSplits).values({
              expenseId: expense.id,
              userId: m.userId,
              amount: splitAmount,
              settled: m.userId === userId, // payer's share is auto-settled
            });
          }
        } else if (customSplits) {
          for (const split of customSplits) {
            const resolvedId = await resolveNickname(check.familyId, split.nickname) || split.nickname;
            await db.insert(expenseSplits).values({
              expenseId: expense.id,
              userId: resolvedId,
              amount: split.amount.toFixed(2),
              settled: resolvedId === userId,
            });
          }
        }

        await logActivity(check.familyId, userId, 'logged', 'expense', expense.id, { description, amount, category });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: expense.id,
              description: expense.description,
              amount: expense.amount,
              splitType,
              date: dateStr,
            }, null, 2),
          }],
        };
      },
    );

    // ─── expense_balances ───
    server.tool(
      'expense_balances',
      'Calculate who owes whom based on unsettled expenses. Uses a debt simplification algorithm to minimize the number of transfers. Read-only — requires viewer role. Returns a list of settlements: "A → B: R$X.XX".',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
      },
      { readOnlyHint: true },
      async ({ familyId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const check = await requireFamilyMember(userId, familyId, 'viewer');
        if (!check.ok) return toolError(check.error);

        // Get all unsettled splits with expense info
        const unsettled = await db
          .select({
            userId: expenseSplits.userId,
            splitAmount: expenseSplits.amount,
            paidBy: expenses.paidBy,
          })
          .from(expenseSplits)
          .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
          .where(and(eq(expenses.familyId, check.familyId), eq(expenseSplits.settled, false)));

        // Calculate net balances: positive = owed money, negative = owes money
        const balances: Record<string, number> = {};
        for (const row of unsettled) {
          const amount = parseFloat(row.splitAmount);
          // row.userId owes row.paidBy this amount
          balances[row.userId] = (balances[row.userId] || 0) - amount;
          balances[row.paidBy] = (balances[row.paidBy] || 0) + amount;
        }

        // Get names
        const memberList = await db
          .select({
            userId: members.userId,
            nickname: members.nickname,
            name: userInNeonAuth.name,
          })
          .from(members)
          .leftJoin(userInNeonAuth, eq(members.userId, userInNeonAuth.id))
          .where(eq(members.familyId, check.familyId));

        const nameMap: Record<string, string> = {};
        for (const m of memberList) {
          nameMap[m.userId] = m.nickname || m.name || m.userId;
        }

        // Simplify debts
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
            settlements.push({
              from: debtors[di].name,
              to: creditors[ci].name,
              amount: pay.toFixed(2),
            });
          }
          debtors[di].amount -= pay;
          creditors[ci].amount -= pay;
          if (debtors[di].amount < 0.01) di++;
          if (creditors[ci].amount < 0.01) ci++;
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              settlements,
              summary: settlements.length === 0
                ? 'All settled!'
                : settlements.map((s) => `${s.from} -> ${s.to}: R$${s.amount}`).join('\n'),
            }, null, 2),
          }],
        };
      },
    );

    // ─── family_feed ───
    server.tool(
      'family_feed',
      'Recent family activity feed showing who did what. All write operations (adding items, completing tasks, logging expenses, etc.) are automatically logged. Returns entries with action, entity type, actor name/nickname, and timestamp. Read-only — requires viewer role.',
      {
        familyId: z.number().optional().describe('Family ID — omit if you belong to only one family, required if multiple'),
        limit: z.number().optional().default(20).describe('Max results to return (default: 20)'),
      },
      { readOnlyHint: true },
      async ({ familyId, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const check = await requireFamilyMember(userId, familyId, 'viewer');
        if (!check.ok) return toolError(check.error);

        const feed = await db
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
          .leftJoin(members, and(eq(members.familyId, check.familyId), eq(members.userId, activityLog.userId)))
          .where(eq(activityLog.familyId, check.familyId))
          .orderBy(desc(activityLog.createdAt))
          .limit(limit);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(feed, null, 2),
          }],
        };
      },
    );
  },
};

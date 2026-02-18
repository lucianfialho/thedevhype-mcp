'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { eq, and, sql, desc } from 'drizzle-orm';
import { entries, connections } from '@/app/lib/mcp/servers/otto.schema';
import type { Entry } from '@/app/lib/mcp/servers/otto.schema';
import { getUserMcpUsage } from '../components/user-mcp-usage';

async function requireUserId() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

// ─── Entries ───

export async function getEntries(type?: string, tag?: string, page = 0, limit = 20): Promise<Entry[]> {
  const userId = await requireUserId();

  const conditions = [eq(entries.userId, userId)];
  if (type && type !== 'todos') conditions.push(eq(entries.type, type));
  if (tag) conditions.push(sql`${tag} = ANY(${entries.tags})`);

  return db
    .select()
    .from(entries)
    .where(and(...conditions))
    .orderBy(desc(entries.updatedAt))
    .limit(limit)
    .offset(page * limit);
}

export async function getEntryCounts() {
  const userId = await requireUserId();

  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      notes: sql<number>`count(*) FILTER (WHERE type = 'note')::int`,
      links: sql<number>`count(*) FILTER (WHERE type = 'link')::int`,
      highlights: sql<number>`count(*) FILTER (WHERE type = 'highlight')::int`,
      people: sql<number>`count(*) FILTER (WHERE type = 'person')::int`,
      companies: sql<number>`count(*) FILTER (WHERE type = 'company')::int`,
    })
    .from(entries)
    .where(eq(entries.userId, userId));

  return row;
}

export async function getAllTags(): Promise<string[]> {
  const userId = await requireUserId();

  const result = await db.execute<{ tag: string }>(
    sql`SELECT DISTINCT unnest(tags) as tag FROM mcp_otto.entries WHERE "userId" = ${userId} ORDER BY tag`,
  );

  return result.rows.map((r) => r.tag);
}

// ─── Search ───

export async function searchEntries(query: string, type?: string) {
  const userId = await requireUserId();

  try {
    const tsquery = sql`websearch_to_tsquery('simple', ${query})`;
    const conditions = [
      eq(entries.userId, userId),
      sql`search_vector @@ ${tsquery}`,
    ];
    if (type && type !== 'todos') conditions.push(eq(entries.type, type));

    return db
      .select({
        id: entries.id,
        type: entries.type,
        title: entries.title,
        url: entries.url,
        source: entries.source,
        excerpt: entries.excerpt,
        tags: entries.tags,
        createdAt: entries.createdAt,
        rank: sql<number>`ts_rank(search_vector, ${tsquery})`.as('rank'),
      })
      .from(entries)
      .where(and(...conditions))
      .orderBy(sql`rank DESC`)
      .limit(20);
  } catch {
    return [];
  }
}

// ─── Entry Detail ───

export async function getEntryDetail(id: number) {
  const userId = await requireUserId();

  const [entry] = await db
    .select()
    .from(entries)
    .where(and(eq(entries.id, id), eq(entries.userId, userId)));
  if (!entry) return null;

  // Get connected entries
  const outgoing = await db
    .select({
      id: entries.id,
      type: entries.type,
      title: entries.title,
    })
    .from(connections)
    .innerJoin(entries, eq(connections.toId, entries.id))
    .where(and(eq(connections.userId, userId), eq(connections.fromId, id)));

  const incoming = await db
    .select({
      id: entries.id,
      type: entries.type,
      title: entries.title,
    })
    .from(connections)
    .innerJoin(entries, eq(connections.fromId, entries.id))
    .where(and(eq(connections.userId, userId), eq(connections.toId, id)));

  const seen = new Set<number>();
  const linked = [...outgoing, ...incoming].filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  return { entry, linked };
}

// ─── Connections ───

export async function getConnectionCount() {
  const userId = await requireUserId();

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(connections)
    .where(eq(connections.userId, userId));

  return row.count;
}

// ─── Graph ───

export async function getGraphData() {
  const userId = await requireUserId();

  const nodes = await db
    .select({
      id: entries.id,
      type: entries.type,
      title: entries.title,
    })
    .from(entries)
    .where(eq(entries.userId, userId))
    .orderBy(desc(entries.updatedAt));

  const edges = await db
    .select({
      fromId: connections.fromId,
      toId: connections.toId,
    })
    .from(connections)
    .where(eq(connections.userId, userId));

  return { nodes, edges };
}

// ─── Usage ───

export async function getUserOttoUsage() {
  return getUserMcpUsage('otto');
}

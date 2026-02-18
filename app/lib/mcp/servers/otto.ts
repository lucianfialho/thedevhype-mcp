import { z } from 'zod';
import { eq, and, sql, desc, or } from 'drizzle-orm';
import { db } from '../../db';
import { getUserId } from '../auth-helpers';
import { entries, connections } from './otto.schema';
import type { McpServerDefinition } from '../types';

function makeExcerpt(content: string, maxLen = 200): string {
  const plain = content.replace(/[#*_`~>\[\]()!-]/g, '').replace(/\s+/g, ' ').trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + '...' : plain;
}

export const ottoServer: McpServerDefinition = {
  name: 'otto',
  description:
    'Otto — Second Brain: save notes, links, highlights, people and companies in markdown with full-text search and bidirectional connections',
  category: 'Knowledge Tools',
  icon: '/otto.png',
  badge: 'New',
  tools: [
    { name: 'create_note', description: 'Create a markdown note with title and content' },
    { name: 'edit_entry', description: 'Edit the content of an existing entry' },
    { name: 'read_entry', description: 'Read the full content of an entry' },
    { name: 'delete_entry', description: 'Delete an entry and its connections' },
    { name: 'save_link', description: 'Save a link with title and optional notes' },
    { name: 'save_highlight', description: 'Save a highlight/clipping with its source' },
    { name: 'save_person', description: 'Save a person with info and context' },
    { name: 'save_company', description: 'Save a company with info and context' },
    { name: 'search', description: 'Full-text search across all entries' },
    { name: 'list_entries', description: 'List entries with optional type and tag filters' },
    { name: 'connect', description: 'Create a bidirectional connection between two entries' },
    { name: 'list_connections', description: 'List all connections of an entry' },
  ],
  init: (server) => {
    // ─── create_note ───
    server.tool(
      'create_note',
      'Create a markdown note with title and content.',
      {
        title: z.string().describe('Note title'),
        content: z.string().describe('Content in markdown'),
        tags: z.array(z.string()).optional().describe('Tags for categorization'),
      },
      async ({ title, content, tags }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [entry] = await db.insert(entries).values({
          userId,
          type: 'note',
          title,
          content,
          excerpt: makeExcerpt(content),
          tags: tags || null,
        }).returning();

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: entry.id,
              title: entry.title,
              tags: entry.tags,
              createdAt: entry.createdAt,
            }, null, 2),
          }],
        };
      },
    );

    // ─── edit_entry ───
    server.tool(
      'edit_entry',
      'Edit the content of an existing entry.',
      {
        id: z.number().describe('Entry ID'),
        content: z.string().describe('New content in markdown'),
        title: z.string().optional().describe('New title (optional)'),
        tags: z.array(z.string()).optional().describe('New tags (optional, replaces current)'),
      },
      async ({ id, content, title, tags }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [entry] = await db
          .select()
          .from(entries)
          .where(and(eq(entries.id, id), eq(entries.userId, userId)));
        if (!entry) {
          return { content: [{ type: 'text' as const, text: 'Error: entry not found.' }] };
        }

        const updates: Record<string, unknown> = {
          content,
          excerpt: makeExcerpt(content),
          updatedAt: new Date().toISOString(),
        };
        if (title !== undefined) updates.title = title;
        if (tags !== undefined) updates.tags = tags;

        await db.update(entries)
          .set(updates)
          .where(eq(entries.id, id));

        return {
          content: [{
            type: 'text' as const,
            text: `Entry "${title || entry.title}" updated.`,
          }],
        };
      },
    );

    // ─── read_entry ───
    server.tool(
      'read_entry',
      'Read the full content of an entry (note, link, highlight, person or company).',
      {
        id: z.number().describe('Entry ID'),
      },
      async ({ id }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [entry] = await db
          .select()
          .from(entries)
          .where(and(eq(entries.id, id), eq(entries.userId, userId)));
        if (!entry) {
          return { content: [{ type: 'text' as const, text: 'Error: entry not found.' }] };
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: entry.id,
              type: entry.type,
              title: entry.title,
              url: entry.url,
              source: entry.source,
              tags: entry.tags,
              createdAt: entry.createdAt,
              updatedAt: entry.updatedAt,
              content: entry.content,
            }, null, 2),
          }],
        };
      },
    );

    // ─── delete_entry ───
    server.tool(
      'delete_entry',
      'Delete an entry and all its connections.',
      {
        id: z.number().describe('Entry ID to delete'),
      },
      async ({ id }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [entry] = await db
          .select()
          .from(entries)
          .where(and(eq(entries.id, id), eq(entries.userId, userId)));
        if (!entry) {
          return { content: [{ type: 'text' as const, text: 'Error: entry not found.' }] };
        }

        // Delete connections involving this entry
        await db.delete(connections).where(
          and(
            eq(connections.userId, userId),
            or(eq(connections.fromId, id), eq(connections.toId, id)),
          ),
        );

        // Delete entry
        await db.delete(entries).where(eq(entries.id, id));

        return {
          content: [{ type: 'text' as const, text: `"${entry.title}" deleted.` }],
        };
      },
    );

    // ─── save_link ───
    server.tool(
      'save_link',
      'Save a link with title and optional notes.',
      {
        url: z.string().url().describe('Link URL'),
        title: z.string().describe('Link title'),
        notes: z.string().optional().describe('Notes/annotations in markdown'),
        tags: z.array(z.string()).optional().describe('Tags for categorization'),
      },
      async ({ url, title, notes, tags }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const markdownContent = notes
          ? `# ${title}\n\n**URL:** ${url}\n\n${notes}`
          : `# ${title}\n\n**URL:** ${url}`;

        const [entry] = await db.insert(entries).values({
          userId,
          type: 'link',
          title,
          content: markdownContent,
          url,
          excerpt: notes ? makeExcerpt(notes) : url,
          tags: tags || null,
        }).returning();

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: entry.id,
              title: entry.title,
              url: entry.url,
              tags: entry.tags,
              createdAt: entry.createdAt,
            }, null, 2),
          }],
        };
      },
    );

    // ─── save_highlight ───
    server.tool(
      'save_highlight',
      'Save a highlight/clipping with its source.',
      {
        passage: z.string().describe('The highlighted passage'),
        source: z.string().describe('Source of the highlight (book, article, URL, etc)'),
        title: z.string().optional().describe('Optional title for the highlight'),
        notes: z.string().optional().describe('Additional notes about the highlight'),
        tags: z.array(z.string()).optional().describe('Tags for categorization'),
      },
      async ({ passage, source, title, notes, tags }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const highlightTitle = title || passage.slice(0, 80) + (passage.length > 80 ? '...' : '');
        const markdownContent = `> ${passage}\n\n**Source:** ${source}${notes ? `\n\n${notes}` : ''}`;

        const [entry] = await db.insert(entries).values({
          userId,
          type: 'highlight',
          title: highlightTitle,
          content: markdownContent,
          source,
          excerpt: makeExcerpt(passage),
          tags: tags || null,
        }).returning();

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: entry.id,
              title: entry.title,
              source: entry.source,
              tags: entry.tags,
              createdAt: entry.createdAt,
            }, null, 2),
          }],
        };
      },
    );

    // ─── save_person ───
    server.tool(
      'save_person',
      'Save a person with relevant info and context.',
      {
        name: z.string().describe('Person name'),
        info: z.string().optional().describe('Info in markdown (role, company, context, etc)'),
        tags: z.array(z.string()).optional().describe('Tags for categorization'),
      },
      async ({ name, info, tags }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const content = info || '';

        const [entry] = await db.insert(entries).values({
          userId,
          type: 'person',
          title: name,
          content,
          excerpt: content ? makeExcerpt(content) : name,
          tags: tags || null,
        }).returning();

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: entry.id,
              title: entry.title,
              tags: entry.tags,
              createdAt: entry.createdAt,
            }, null, 2),
          }],
        };
      },
    );

    // ─── save_company ───
    server.tool(
      'save_company',
      'Save a company with relevant info and context.',
      {
        name: z.string().describe('Company name'),
        info: z.string().optional().describe('Info in markdown (industry, funding, context, etc)'),
        url: z.string().url().optional().describe('Company website'),
        tags: z.array(z.string()).optional().describe('Tags for categorization'),
      },
      async ({ name, info, url, tags }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const content = info || '';

        const [entry] = await db.insert(entries).values({
          userId,
          type: 'company',
          title: name,
          content,
          url: url || null,
          excerpt: content ? makeExcerpt(content) : name,
          tags: tags || null,
        }).returning();

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: entry.id,
              title: entry.title,
              url: entry.url,
              tags: entry.tags,
              createdAt: entry.createdAt,
            }, null, 2),
          }],
        };
      },
    );

    // ─── search ───
    server.tool(
      'search',
      'Full-text search across all entries (notes, links, highlights, people, companies).',
      {
        query: z.string().describe('Search term'),
        type: z.enum(['note', 'link', 'highlight', 'person', 'company', 'all']).optional().default('all').describe('Filter by type'),
        limit: z.number().optional().default(20).describe('Max number of results'),
      },
      async ({ query, type, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        try {
          const tsquery = sql`websearch_to_tsquery('simple', ${query})`;
          const conditions = [
            eq(entries.userId, userId),
            sql`search_vector @@ ${tsquery}`,
          ];
          if (type !== 'all') {
            conditions.push(eq(entries.type, type));
          }

          const results = await db
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
            .limit(limit);

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(results, null, 2),
            }],
          };
        } catch {
          return { content: [{ type: 'text' as const, text: '[]' }] };
        }
      },
    );

    // ─── list_entries ───
    server.tool(
      'list_entries',
      'List entries with optional type and tag filters.',
      {
        type: z.enum(['note', 'link', 'highlight', 'person', 'company', 'all']).optional().default('all').describe('Filter by type'),
        tag: z.string().optional().describe('Filter by tag'),
        limit: z.number().optional().default(20).describe('Max number of results'),
      },
      async ({ type, tag, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const conditions = [eq(entries.userId, userId)];
        if (type !== 'all') conditions.push(eq(entries.type, type));
        if (tag) conditions.push(sql`${tag} = ANY(${entries.tags})`);

        const results = await db
          .select({
            id: entries.id,
            type: entries.type,
            title: entries.title,
            url: entries.url,
            source: entries.source,
            excerpt: entries.excerpt,
            tags: entries.tags,
            createdAt: entries.createdAt,
            updatedAt: entries.updatedAt,
          })
          .from(entries)
          .where(and(...conditions))
          .orderBy(desc(entries.updatedAt))
          .limit(limit);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(results, null, 2),
          }],
        };
      },
    );

    // ─── connect ───
    server.tool(
      'connect',
      'Create a bidirectional connection between two entries.',
      {
        fromId: z.number().describe('First entry ID'),
        toId: z.number().describe('Second entry ID'),
        note: z.string().optional().describe('Optional context about the connection'),
      },
      async ({ fromId, toId, note }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Verify both entries exist and belong to user
        const userEntries = await db
          .select({ id: entries.id, title: entries.title })
          .from(entries)
          .where(and(eq(entries.userId, userId), or(eq(entries.id, fromId), eq(entries.id, toId))));

        if (userEntries.length < 2) {
          return { content: [{ type: 'text' as const, text: 'Error: one or both entries not found.' }] };
        }

        // Create connection (ignore if already exists)
        await db.insert(connections).values({
          userId,
          fromId,
          toId,
          note: note || null,
        }).onConflictDoNothing();

        const fromTitle = userEntries.find((e) => e.id === fromId)?.title || '';
        const toTitle = userEntries.find((e) => e.id === toId)?.title || '';

        return {
          content: [{
            type: 'text' as const,
            text: `Connection created: "${fromTitle}" <-> "${toTitle}"${note ? ` (${note})` : ''}`,
          }],
        };
      },
    );

    // ─── list_connections ───
    server.tool(
      'list_connections',
      'List all connections of an entry.',
      {
        id: z.number().describe('Entry ID'),
      },
      async ({ id }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Verify entry exists
        const [entry] = await db
          .select({ id: entries.id, title: entries.title })
          .from(entries)
          .where(and(eq(entries.id, id), eq(entries.userId, userId)));
        if (!entry) {
          return { content: [{ type: 'text' as const, text: 'Error: entry not found.' }] };
        }

        // Get all connections where this entry is either fromId or toId
        const outgoing = await db
          .select({
            connectionId: connections.id,
            linkedId: connections.toId,
            linkedTitle: entries.title,
            linkedType: entries.type,
            note: connections.note,
          })
          .from(connections)
          .innerJoin(entries, eq(connections.toId, entries.id))
          .where(and(eq(connections.userId, userId), eq(connections.fromId, id)));

        const incoming = await db
          .select({
            connectionId: connections.id,
            linkedId: connections.fromId,
            linkedTitle: entries.title,
            linkedType: entries.type,
            note: connections.note,
          })
          .from(connections)
          .innerJoin(entries, eq(connections.fromId, entries.id))
          .where(and(eq(connections.userId, userId), eq(connections.toId, id)));

        // Merge and deduplicate
        const seen = new Set<number>();
        const allConnections = [...outgoing, ...incoming].filter((c) => {
          if (seen.has(c.linkedId)) return false;
          seen.add(c.linkedId);
          return true;
        });

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              entry: { id: entry.id, title: entry.title },
              connections: allConnections,
            }, null, 2),
          }],
        };
      },
    );
  },
};

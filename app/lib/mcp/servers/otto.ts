import { z } from 'zod';
import { eq, and, sql, desc, or } from 'drizzle-orm';
import { db } from '../../db';
import { getUserId } from '../auth-helpers';
import { entries, connections } from './otto.schema';
import { toolError } from '../errors';
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
  instructions: `# Otto — Second Brain

## Purpose
Otto is a personal knowledge management system. It stores notes, links, highlights, people, and companies as markdown entries with full-text search and bidirectional connections.

## Key Concepts
- **Entry**: The core unit. Every item (note, link, highlight, person, company) is an entry with a type, title, content (markdown), optional tags, and timestamps.
- **Connection**: A bidirectional link between two entries with an optional note. Use to create a knowledge graph.
- **Excerpt**: Auto-generated plain-text preview (200 chars) of each entry's content.
- **Full-Text Search**: PostgreSQL websearch_to_tsquery across title + content.

## Entry Types
| Type | Use for | Key fields |
|------|---------|-----------|
| note | Ideas, meeting notes, journals | title, content (markdown) |
| link | URLs worth remembering | title, url, notes (optional) |
| highlight | Quotes, clippings | passage, source, notes |
| person | Contacts, collaborators | name, info (role, context) |
| company | Organizations | name, info, url |

## Typical Workflows
1. **Capture**: create_note / save_link / save_highlight / save_person / save_company
2. **Connect**: connect two entries → list_connections to explore the graph
3. **Find**: search (full-text) or list_entries (browse by type/tag)
4. **Maintain**: edit_entry to update, delete_entry to remove

## Conventions
- IDs are numeric integers. Get them from list_entries, search, or creation responses.
- Tags are string arrays. Use consistent lowercase tags.
- Content is always markdown. Excerpts are auto-generated.`,
  tools: [
    { name: 'create_note', description: 'Create a new markdown note. Use for ideas, meeting notes, journals, or any free-form text. Provide a title and content in markdown. Optionally add tags for categorization. Returns the created entry with ID and timestamp.' },
    { name: 'edit_entry', description: 'Update the content, title, or tags of an existing entry. Requires the entry ID from list_entries or search. Replaces the content entirely — send the full updated markdown, not a diff. Excerpt is auto-regenerated. Idempotent.', annotations: { idempotentHint: true } },
    { name: 'read_entry', description: 'Read the full content of an entry by its ID. Returns all fields: type, title, content (full markdown), URL, source, tags, and timestamps. Use when you need the complete text — list_entries and search only return excerpts. Read-only.', annotations: { readOnlyHint: true } },
    { name: 'delete_entry', description: 'Permanently delete an entry and all its connections. Requires the entry ID. Destructive — this cannot be undone. Both incoming and outgoing connections are removed.', annotations: { destructiveHint: true } },
    { name: 'save_link', description: 'Save a URL as a knowledge entry. Creates a formatted markdown note with the link, title, and optional notes. Use for articles, tools, references worth remembering. Returns the entry with ID. Not idempotent — saving the same URL creates a new entry each time.' },
    { name: 'save_highlight', description: 'Save a highlighted passage or quote with its source. Creates a blockquote-formatted entry. Use for book highlights, article clippings, or memorable quotes. Provide the passage text and source (book title, URL, or description). Auto-generates a title from the first 80 characters if none provided.' },
    { name: 'save_person', description: 'Save a person as a knowledge entry. Use for contacts, collaborators, or people worth remembering. Provide a name and optional info in markdown (role, company, how you met, context). Tags help categorize (e.g. "colleague", "mentor", "client").' },
    { name: 'save_company', description: 'Save a company as a knowledge entry. Use for organizations worth tracking. Provide a name, optional info in markdown (industry, funding, context), and optional website URL. Tags help categorize (e.g. "startup", "client", "competitor").' },
    { name: 'search', description: 'Full-text search across all entries using PostgreSQL websearch_to_tsquery. Supports natural language queries. Filter by entry type. Returns up to 20 results with ID, type, title, URL, source, excerpt, tags, and relevance rank. Read-only.', annotations: { readOnlyHint: true } },
    { name: 'list_entries', description: 'Browse entries with optional filters by type and tag. Returns entries ordered by last updated. Use to explore the knowledge base or find entries to connect. Read-only. Returns ID, type, title, URL, source, excerpt, tags, and timestamps.', annotations: { readOnlyHint: true } },
    { name: 'connect', description: 'Create a bidirectional connection between two entries. Use to build a knowledge graph — e.g. connect a person to a company, a note to a link, a highlight to a person. Provide an optional note describing the relationship. Idempotent — connecting already-connected entries is a no-op.', annotations: { idempotentHint: true } },
    { name: 'list_connections', description: 'List all entries connected to a given entry. Returns the connected entries with their type, title, and the connection note. Use to explore the knowledge graph from a starting point. Read-only.', annotations: { readOnlyHint: true } },
  ],
  init: (server) => {
    // ─── create_note ───
    server.tool(
      'create_note',
      'Create a new markdown note. Use for ideas, meeting notes, journals, or any free-form text. Provide a title and content in markdown. Optionally add tags for categorization. Returns the created entry with ID and timestamp.',
      {
        title: z.string().describe('Note title — descriptive and searchable'),
        content: z.string().describe('Content in markdown format'),
        tags: z.array(z.string()).optional().describe('Tags for categorization — use consistent lowercase, e.g. ["react", "performance"]'),
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
      'Update the content, title, or tags of an existing entry. Requires the entry ID from list_entries or search. Replaces the content entirely — send the full updated markdown, not a diff. Excerpt is auto-regenerated. Idempotent.',
      {
        id: z.number().describe('Numeric entry ID — get from list_entries, search, or creation response'),
        content: z.string().describe('Content in markdown format'),
        title: z.string().optional().describe('New title (optional)'),
        tags: z.array(z.string()).optional().describe('Tags for categorization — use consistent lowercase, e.g. ["react", "performance"]'),
      },
      { idempotentHint: true },
      async ({ id, content, title, tags }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [entry] = await db
          .select()
          .from(entries)
          .where(and(eq(entries.id, id), eq(entries.userId, userId)));
        if (!entry) {
          return toolError('Entry not found.', 'Use list_entries or search to find entries and their IDs.');
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
      'Read the full content of an entry by its ID. Returns all fields: type, title, content (full markdown), URL, source, tags, and timestamps. Use when you need the complete text — list_entries and search only return excerpts. Read-only.',
      {
        id: z.number().describe('Numeric entry ID — get from list_entries, search, or creation response'),
      },
      { readOnlyHint: true },
      async ({ id }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [entry] = await db
          .select()
          .from(entries)
          .where(and(eq(entries.id, id), eq(entries.userId, userId)));
        if (!entry) {
          return toolError('Entry not found.', 'Use list_entries or search to find entries and their IDs.');
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
      'Permanently delete an entry and all its connections. Requires the entry ID. Destructive — this cannot be undone. Both incoming and outgoing connections are removed.',
      {
        id: z.number().describe('Numeric entry ID — get from list_entries, search, or creation response'),
      },
      { destructiveHint: true },
      async ({ id }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [entry] = await db
          .select()
          .from(entries)
          .where(and(eq(entries.id, id), eq(entries.userId, userId)));
        if (!entry) {
          return toolError('Entry not found.', 'Use list_entries or search to find entries and their IDs.');
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
      'Save a URL as a knowledge entry. Creates a formatted markdown note with the link, title, and optional notes. Use for articles, tools, references worth remembering. Returns the entry with ID. Not idempotent — saving the same URL creates a new entry each time.',
      {
        url: z.string().url().describe('Link URL'),
        title: z.string().describe('Note title — descriptive and searchable'),
        notes: z.string().optional().describe('Notes/annotations in markdown'),
        tags: z.array(z.string()).optional().describe('Tags for categorization — use consistent lowercase, e.g. ["react", "performance"]'),
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
      'Save a highlighted passage or quote with its source. Creates a blockquote-formatted entry. Use for book highlights, article clippings, or memorable quotes. Provide the passage text and source (book title, URL, or description). Auto-generates a title from the first 80 characters if none provided.',
      {
        passage: z.string().describe('The highlighted text passage or quote'),
        source: z.string().describe('Source of the highlight — book title, article URL, podcast name, etc.'),
        title: z.string().optional().describe('Optional title for the highlight'),
        notes: z.string().optional().describe('Additional notes about the highlight'),
        tags: z.array(z.string()).optional().describe('Tags for categorization — use consistent lowercase, e.g. ["react", "performance"]'),
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
      'Save a person as a knowledge entry. Use for contacts, collaborators, or people worth remembering. Provide a name and optional info in markdown (role, company, how you met, context). Tags help categorize (e.g. "colleague", "mentor", "client").',
      {
        name: z.string().describe('Person name'),
        info: z.string().optional().describe('Info in markdown (role, company, context, etc)'),
        tags: z.array(z.string()).optional().describe('Tags for categorization — use consistent lowercase, e.g. ["react", "performance"]'),
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
      'Save a company as a knowledge entry. Use for organizations worth tracking. Provide a name, optional info in markdown (industry, funding, context), and optional website URL. Tags help categorize (e.g. "startup", "client", "competitor").',
      {
        name: z.string().describe('Company name'),
        info: z.string().optional().describe('Info in markdown (industry, funding, context, etc)'),
        url: z.string().url().optional().describe('Company website'),
        tags: z.array(z.string()).optional().describe('Tags for categorization — use consistent lowercase, e.g. ["react", "performance"]'),
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
      'Full-text search across all entries using PostgreSQL websearch_to_tsquery. Supports natural language queries. Filter by entry type. Returns up to 20 results with ID, type, title, URL, source, excerpt, tags, and relevance rank. Read-only.',
      {
        query: z.string().describe('Search query — supports natural language, e.g. "react performance tips"'),
        type: z.enum(['note', 'link', 'highlight', 'person', 'company', 'all']).optional().default('all').describe('Filter by entry type: "note", "link", "highlight", "person", "company", or "all" (default)'),
        limit: z.number().optional().default(20).describe('Max results to return (default: 20)'),
      },
      { readOnlyHint: true },
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
        } catch (err) {
          console.error('[Otto] Search failed:', err);
          return toolError('Search failed — the query may contain unsupported syntax.', 'Try simpler search terms without special characters.');
        }
      },
    );

    // ─── list_entries ───
    server.tool(
      'list_entries',
      'Browse entries with optional filters by type and tag. Returns entries ordered by last updated. Use to explore the knowledge base or find entries to connect. Read-only. Returns ID, type, title, URL, source, excerpt, tags, and timestamps.',
      {
        type: z.enum(['note', 'link', 'highlight', 'person', 'company', 'all']).optional().default('all').describe('Filter by entry type: "note", "link", "highlight", "person", "company", or "all" (default)'),
        tag: z.string().optional().describe('Filter by tag (exact match, case-sensitive)'),
        limit: z.number().optional().default(20).describe('Max results to return (default: 20)'),
      },
      { readOnlyHint: true },
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
      'Create a bidirectional connection between two entries. Use to build a knowledge graph — e.g. connect a person to a company, a note to a link, a highlight to a person. Provide an optional note describing the relationship. Idempotent — connecting already-connected entries is a no-op.',
      {
        fromId: z.number().describe('First entry ID — get from list_entries or search'),
        toId: z.number().describe('Second entry ID — get from list_entries or search'),
        note: z.string().optional().describe('Optional context about the relationship, e.g. "works at", "mentioned in", "related to"'),
      },
      { idempotentHint: true },
      async ({ fromId, toId, note }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Verify both entries exist and belong to user
        const userEntries = await db
          .select({ id: entries.id, title: entries.title })
          .from(entries)
          .where(and(eq(entries.userId, userId), or(eq(entries.id, fromId), eq(entries.id, toId))));

        if (userEntries.length < 2) {
          return toolError('One or both entries not found.', 'Both fromId and toId must be valid entry IDs. Use list_entries to find them.');
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
      'List all entries connected to a given entry. Returns the connected entries with their type, title, and the connection note. Use to explore the knowledge graph from a starting point. Read-only.',
      {
        id: z.number().describe('Numeric entry ID — get from list_entries, search, or creation response'),
      },
      { readOnlyHint: true },
      async ({ id }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Verify entry exists
        const [entry] = await db
          .select({ id: entries.id, title: entries.title })
          .from(entries)
          .where(and(eq(entries.id, id), eq(entries.userId, userId)));
        if (!entry) {
          return toolError('Entry not found.', 'Use list_entries or search to find entries and their IDs.');
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

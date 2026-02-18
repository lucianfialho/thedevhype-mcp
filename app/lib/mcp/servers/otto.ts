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
    'Otto — Second Brain: salva notas, links e destaques em markdown com busca full-text e conexoes entre ideias',
  category: 'Knowledge Tools',
  icon: '/otto.png',
  tools: [
    { name: 'criar_nota', description: 'Cria uma nota markdown com titulo e conteudo' },
    { name: 'editar_nota', description: 'Edita o conteudo de uma entrada existente' },
    { name: 'ler_nota', description: 'Le o conteudo completo de uma entrada' },
    { name: 'deletar', description: 'Remove uma entrada' },
    { name: 'salvar_link', description: 'Salva um link com titulo e notas opcionais' },
    { name: 'salvar_destaque', description: 'Salva um destaque/clipping com fonte' },
    { name: 'buscar', description: 'Busca full-text em todas as entradas' },
    { name: 'listar', description: 'Lista entradas com filtros por tipo e tags' },
    { name: 'conectar', description: 'Cria conexao bidirecional entre duas entradas' },
    { name: 'listar_conexoes', description: 'Lista conexoes de uma entrada' },
  ],
  init: (server) => {
    // ─── criar_nota ───
    server.tool(
      'criar_nota',
      'Cria uma nota markdown com titulo e conteudo.',
      {
        titulo: z.string().describe('Titulo da nota'),
        conteudo: z.string().describe('Conteudo em markdown'),
        tags: z.array(z.string()).optional().describe('Tags para categorizar'),
      },
      async ({ titulo, conteudo, tags }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [entry] = await db.insert(entries).values({
          userId,
          type: 'note',
          title: titulo,
          content: conteudo,
          excerpt: makeExcerpt(conteudo),
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

    // ─── editar_nota ───
    server.tool(
      'editar_nota',
      'Edita o conteudo de uma entrada existente.',
      {
        id: z.number().describe('ID da entrada'),
        conteudo: z.string().describe('Novo conteudo em markdown'),
        titulo: z.string().optional().describe('Novo titulo (opcional)'),
        tags: z.array(z.string()).optional().describe('Novas tags (opcional, substitui as atuais)'),
      },
      async ({ id, conteudo, titulo, tags }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [entry] = await db
          .select()
          .from(entries)
          .where(and(eq(entries.id, id), eq(entries.userId, userId)));
        if (!entry) {
          return { content: [{ type: 'text' as const, text: 'Erro: entrada nao encontrada.' }] };
        }

        const updates: Record<string, unknown> = {
          content: conteudo,
          excerpt: makeExcerpt(conteudo),
          updatedAt: new Date().toISOString(),
        };
        if (titulo !== undefined) updates.title = titulo;
        if (tags !== undefined) updates.tags = tags;

        await db.update(entries)
          .set(updates)
          .where(eq(entries.id, id));

        return {
          content: [{
            type: 'text' as const,
            text: `Entrada "${titulo || entry.title}" atualizada.`,
          }],
        };
      },
    );

    // ─── ler_nota ───
    server.tool(
      'ler_nota',
      'Le o conteudo completo de uma entrada (nota, link ou destaque).',
      {
        id: z.number().describe('ID da entrada'),
      },
      async ({ id }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [entry] = await db
          .select()
          .from(entries)
          .where(and(eq(entries.id, id), eq(entries.userId, userId)));
        if (!entry) {
          return { content: [{ type: 'text' as const, text: 'Erro: entrada nao encontrada.' }] };
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

    // ─── deletar ───
    server.tool(
      'deletar',
      'Remove uma entrada e suas conexoes.',
      {
        id: z.number().describe('ID da entrada a remover'),
      },
      async ({ id }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [entry] = await db
          .select()
          .from(entries)
          .where(and(eq(entries.id, id), eq(entries.userId, userId)));
        if (!entry) {
          return { content: [{ type: 'text' as const, text: 'Erro: entrada nao encontrada.' }] };
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
          content: [{ type: 'text' as const, text: `"${entry.title}" removido.` }],
        };
      },
    );

    // ─── salvar_link ───
    server.tool(
      'salvar_link',
      'Salva um link com titulo e notas opcionais.',
      {
        url: z.string().url().describe('URL do link'),
        titulo: z.string().describe('Titulo do link'),
        notas: z.string().optional().describe('Notas/anotacoes em markdown'),
        tags: z.array(z.string()).optional().describe('Tags para categorizar'),
      },
      async ({ url, titulo, notas, tags }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const markdownContent = notas
          ? `# ${titulo}\n\n**URL:** ${url}\n\n${notas}`
          : `# ${titulo}\n\n**URL:** ${url}`;

        const [entry] = await db.insert(entries).values({
          userId,
          type: 'link',
          title: titulo,
          content: markdownContent,
          url,
          excerpt: notas ? makeExcerpt(notas) : url,
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

    // ─── salvar_destaque ───
    server.tool(
      'salvar_destaque',
      'Salva um destaque/clipping com a fonte de onde foi extraido.',
      {
        trecho: z.string().describe('O trecho/destaque em si'),
        fonte: z.string().describe('Fonte do destaque (livro, artigo, URL, etc)'),
        titulo: z.string().optional().describe('Titulo opcional para o destaque'),
        notas: z.string().optional().describe('Notas adicionais sobre o destaque'),
        tags: z.array(z.string()).optional().describe('Tags para categorizar'),
      },
      async ({ trecho, fonte, titulo, notas, tags }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const highlightTitle = titulo || trecho.slice(0, 80) + (trecho.length > 80 ? '...' : '');
        const markdownContent = `> ${trecho}\n\n**Fonte:** ${fonte}${notas ? `\n\n${notas}` : ''}`;

        const [entry] = await db.insert(entries).values({
          userId,
          type: 'highlight',
          title: highlightTitle,
          content: markdownContent,
          source: fonte,
          excerpt: makeExcerpt(trecho),
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

    // ─── buscar ───
    server.tool(
      'buscar',
      'Busca full-text em todas as entradas do usuario (notas, links, destaques).',
      {
        query: z.string().describe('Termo de busca'),
        tipo: z.enum(['note', 'link', 'highlight', 'todos']).optional().default('todos').describe('Filtrar por tipo'),
        limit: z.number().optional().default(20).describe('Numero maximo de resultados'),
      },
      async ({ query, tipo, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        try {
          const tsquery = sql`websearch_to_tsquery('simple', ${query})`;
          const conditions = [
            eq(entries.userId, userId),
            sql`search_vector @@ ${tsquery}`,
          ];
          if (tipo !== 'todos') {
            conditions.push(eq(entries.type, tipo));
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

    // ─── listar ───
    server.tool(
      'listar',
      'Lista entradas com filtros opcionais por tipo e tags.',
      {
        tipo: z.enum(['note', 'link', 'highlight', 'todos']).optional().default('todos').describe('Filtrar por tipo'),
        tag: z.string().optional().describe('Filtrar por tag'),
        limit: z.number().optional().default(20).describe('Numero maximo de resultados'),
      },
      async ({ tipo, tag, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const conditions = [eq(entries.userId, userId)];
        if (tipo !== 'todos') conditions.push(eq(entries.type, tipo));
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

    // ─── conectar ───
    server.tool(
      'conectar',
      'Cria uma conexao bidirecional entre duas entradas.',
      {
        deId: z.number().describe('ID da primeira entrada'),
        paraId: z.number().describe('ID da segunda entrada'),
        nota: z.string().optional().describe('Contexto opcional sobre a conexao'),
      },
      async ({ deId, paraId, nota }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Verify both entries exist and belong to user
        const userEntries = await db
          .select({ id: entries.id, title: entries.title })
          .from(entries)
          .where(and(eq(entries.userId, userId), or(eq(entries.id, deId), eq(entries.id, paraId))));

        if (userEntries.length < 2) {
          return { content: [{ type: 'text' as const, text: 'Erro: uma ou ambas as entradas nao foram encontradas.' }] };
        }

        // Create connection (ignore if already exists)
        await db.insert(connections).values({
          userId,
          fromId: deId,
          toId: paraId,
          note: nota || null,
        }).onConflictDoNothing();

        const fromTitle = userEntries.find((e) => e.id === deId)?.title || '';
        const toTitle = userEntries.find((e) => e.id === paraId)?.title || '';

        return {
          content: [{
            type: 'text' as const,
            text: `Conexao criada: "${fromTitle}" <-> "${toTitle}"${nota ? ` (${nota})` : ''}`,
          }],
        };
      },
    );

    // ─── listar_conexoes ───
    server.tool(
      'listar_conexoes',
      'Lista todas as conexoes de uma entrada.',
      {
        id: z.number().describe('ID da entrada'),
      },
      async ({ id }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Verify entry exists
        const [entry] = await db
          .select({ id: entries.id, title: entries.title })
          .from(entries)
          .where(and(eq(entries.id, id), eq(entries.userId, userId)));
        if (!entry) {
          return { content: [{ type: 'text' as const, text: 'Erro: entrada nao encontrada.' }] };
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

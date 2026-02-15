import { z } from 'zod';
import { eq, and, sql, desc } from 'drizzle-orm';
import RssParser from 'rss-parser';
import { db } from '../../db';
import { getUserId } from '../auth-helpers';
import { sources, userSources, articles, bookmarks } from './eloa.schema';
import type { McpServerDefinition } from '../types';

const MAX_SOURCES = 20;
const rssParser = new RssParser();

export const eloaServer: McpServerDefinition = {
  name: 'eloa',
  description:
    'Eloa — AI Content Curator: gerencia fontes RSS, bookmarks e busca em todo seu conteudo salvo',
  category: 'Content Tools',
  icon: '/eloa.png',
  tools: [
    {
      name: 'adicionar_fonte',
      description: 'Adiciona uma fonte RSS/Atom validando o feed e extraindo titulo automaticamente',
    },
    {
      name: 'listar_fontes',
      description: 'Lista todas as fontes RSS cadastradas',
    },
    {
      name: 'remover_fonte',
      description: 'Remove uma fonte RSS e seus artigos associados',
    },
    {
      name: 'buscar_novidades',
      description: 'Busca ultimos artigos de todas as fontes ou de uma fonte especifica',
    },
    {
      name: 'salvar_bookmark',
      description: 'Salva uma URL como bookmark com tags e anotacoes',
    },
    {
      name: 'listar_bookmarks',
      description: 'Lista bookmarks salvos com filtro por tag',
    },
    {
      name: 'remover_bookmark',
      description: 'Remove um bookmark por ID',
    },
    {
      name: 'buscar_conteudo',
      description: 'Busca em todo conteudo salvo (artigos + bookmarks) por palavra-chave',
    },
    {
      name: 'extrair_conteudo',
      description: 'Extrai conteudo completo de uma URL via scrape API ou fetch direto',
    },
  ],
  init: (server) => {
    // ─── adicionar_fonte ───
    server.tool(
      'adicionar_fonte',
      'Adiciona uma fonte RSS/Atom. Valida o feed, extrai titulo e salva. Limite de 20 fontes por usuario.',
      {
        url: z.string().url().describe('URL do feed RSS/Atom'),
        category: z.string().optional().describe('Categoria da fonte (ex: tech, design, news)'),
      },
      async ({ url, category }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Check subscription limit
        const existing = await db
          .select({ count: sql<number>`count(*)` })
          .from(userSources)
          .where(eq(userSources.userId, userId));
        if (existing[0].count >= MAX_SOURCES) {
          return { content: [{ type: 'text' as const, text: `Erro: limite de ${MAX_SOURCES} fontes atingido. Remova uma fonte antes de adicionar.` }] };
        }

        // Check if source already exists by URL
        let [source] = await db
          .select()
          .from(sources)
          .where(eq(sources.url, url));

        if (!source) {
          // Validate and parse feed
          let feed;
          try {
            feed = await rssParser.parseURL(url);
          } catch {
            return { content: [{ type: 'text' as const, text: 'Erro: URL nao e um feed RSS/Atom valido.' }] };
          }

          [source] = await db.insert(sources).values({
            url,
            title: feed.title || url,
            siteUrl: feed.link || null,
          }).returning();
        }

        // Create subscription (ignore if already exists)
        await db.insert(userSources).values({
          userId,
          sourceId: source.id,
          category: category || null,
        }).onConflictDoNothing();

        // Get subscriber count
        const [countRow] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(userSources)
          .where(eq(userSources.sourceId, source.id));

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: source.id,
              title: source.title,
              url: source.url,
              siteUrl: source.siteUrl,
              category: category || null,
              subscriberCount: countRow.count,
            }, null, 2),
          }],
        };
      },
    );

    // ─── listar_fontes ───
    server.tool(
      'listar_fontes',
      'Lista todas as fontes RSS do usuario.',
      {},
      async (_params, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const result = await db
          .select({
            id: sources.id,
            title: sources.title,
            url: sources.url,
            siteUrl: sources.siteUrl,
            lastFetchedAt: sources.lastFetchedAt,
            category: userSources.category,
            subscriberCount: sql<number>`(SELECT count(*)::int FROM mcp_eloa.user_sources WHERE "sourceId" = ${sources.id})`,
          })
          .from(userSources)
          .innerJoin(sources, eq(userSources.sourceId, sources.id))
          .where(eq(userSources.userId, userId))
          .orderBy(desc(sources.createdAt));

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      },
    );

    // ─── remover_fonte ───
    server.tool(
      'remover_fonte',
      'Remove uma fonte RSS e todos os artigos associados do usuario.',
      {
        sourceId: z.number().describe('ID da fonte a remover'),
      },
      async ({ sourceId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Verify subscription
        const [subscription] = await db
          .select()
          .from(userSources)
          .where(and(eq(userSources.sourceId, sourceId), eq(userSources.userId, userId)));
        if (!subscription) {
          return { content: [{ type: 'text' as const, text: 'Erro: fonte nao encontrada.' }] };
        }

        // Get source title
        const [source] = await db
          .select()
          .from(sources)
          .where(eq(sources.id, sourceId));

        // Delete user's articles for this source
        await db.delete(articles).where(
          and(eq(articles.sourceId, sourceId), eq(articles.userId, userId)),
        );

        // Delete subscription
        await db.delete(userSources).where(
          and(eq(userSources.sourceId, sourceId), eq(userSources.userId, userId)),
        );

        // If no subscribers left, delete the source
        const [remaining] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(userSources)
          .where(eq(userSources.sourceId, sourceId));
        if (remaining.count === 0) {
          await db.delete(sources).where(eq(sources.id, sourceId));
        }

        return {
          content: [{ type: 'text' as const, text: `Fonte "${source?.title || 'Fonte'}" removida. Seus artigos foram apagados.` }],
        };
      },
    );

    // ─── buscar_novidades ───
    server.tool(
      'buscar_novidades',
      'Busca ultimos artigos das fontes RSS. Pode filtrar por fonte especifica.',
      {
        sourceId: z.number().optional().describe('ID da fonte (opcional, busca todas se omitido)'),
        limit: z.number().optional().default(20).describe('Numero maximo de artigos (default 20)'),
      },
      async ({ sourceId, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Get sources the user is subscribed to
        const sourceFilter = sourceId
          ? and(eq(userSources.sourceId, sourceId), eq(userSources.userId, userId))
          : eq(userSources.userId, userId);

        const subscriptions = await db
          .select({
            sourceId: sources.id,
            url: sources.url,
            title: sources.title,
          })
          .from(userSources)
          .innerJoin(sources, eq(userSources.sourceId, sources.id))
          .where(sourceFilter);

        if (subscriptions.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Nenhuma fonte cadastrada.' }] };
        }

        const newArticles: Array<{ title: string; url: string; author?: string; publishedAt?: string; content?: string; source: string }> = [];

        for (const sub of subscriptions) {
          try {
            const feed = await rssParser.parseURL(sub.url);
            for (const item of feed.items || []) {
              if (!item.link) continue;

              const articleContent = item.contentSnippet || item.content || '';
              const [inserted] = await db
                .insert(articles)
                .values({
                  userId,
                  sourceId: sub.sourceId,
                  title: item.title || 'Sem titulo',
                  url: item.link,
                  author: item.creator || item.author || null,
                  content: articleContent,
                  publishedAt: item.isoDate || null,
                })
                .onConflictDoUpdate({
                  target: [articles.userId, articles.url],
                  set: {
                    title: sql`EXCLUDED.title`,
                    content: sql`EXCLUDED.content`,
                    author: sql`EXCLUDED.author`,
                    publishedAt: sql`EXCLUDED."publishedAt"`,
                  },
                })
                .returning();

              newArticles.push({
                title: inserted.title,
                url: inserted.url,
                author: inserted.author || undefined,
                publishedAt: inserted.publishedAt || undefined,
                content: articleContent.slice(0, 500),
                source: sub.title,
              });
            }

            // Update lastFetchedAt
            await db
              .update(sources)
              .set({ lastFetchedAt: new Date().toISOString() })
              .where(eq(sources.id, sub.sourceId));
          } catch {
            // Skip failed feeds silently
          }
        }

        // Sort by publishedAt desc and limit
        const sorted = newArticles
          .sort((a, b) => {
            const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
            const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, limit);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(sorted, null, 2),
          }],
        };
      },
    );

    // ─── salvar_bookmark ───
    server.tool(
      'salvar_bookmark',
      'Salva uma URL como bookmark. Extrai titulo automaticamente se nao informado.',
      {
        url: z.string().url().describe('URL para salvar'),
        title: z.string().optional().describe('Titulo (auto-extraido se omitido)'),
        tags: z.array(z.string()).optional().describe('Tags para categorizar'),
        notes: z.string().optional().describe('Anotacoes pessoais'),
      },
      async ({ url, title, tags, notes }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        let bookmarkTitle = title || '';
        let content = '';
        let summary = '';

        // Always fetch HTML to extract content for FTS
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(url, { signal: controller.signal });
          clearTimeout(timeout);
          const html = await res.text();

          if (!bookmarkTitle) {
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            bookmarkTitle = titleMatch ? titleMatch[1].trim() : url;
          }

          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          summary = descMatch ? descMatch[1].trim() : '';

          content = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 10000);
        } catch {
          if (!bookmarkTitle) bookmarkTitle = url;
        }

        const [bookmark] = await db.insert(bookmarks).values({
          userId,
          url,
          title: bookmarkTitle,
          content: content || null,
          summary: summary || null,
          tags: tags || null,
          notes: notes || null,
        }).onConflictDoUpdate({
          target: [bookmarks.userId, bookmarks.url],
          set: {
            title: sql`EXCLUDED.title`,
            content: sql`EXCLUDED.content`,
            summary: sql`EXCLUDED.summary`,
            tags: sql`EXCLUDED.tags`,
            notes: sql`EXCLUDED.notes`,
          },
        }).returning();

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: bookmark.id,
              title: bookmark.title,
              url: bookmark.url,
              tags: bookmark.tags,
              notes: bookmark.notes,
            }, null, 2),
          }],
        };
      },
    );

    // ─── listar_bookmarks ───
    server.tool(
      'listar_bookmarks',
      'Lista bookmarks salvos. Filtra por tag se informada.',
      {
        tag: z.string().optional().describe('Filtrar por tag'),
        limit: z.number().optional().default(20).describe('Numero maximo de resultados (default 20)'),
      },
      async ({ tag, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        let query = db
          .select()
          .from(bookmarks)
          .where(
            tag
              ? and(eq(bookmarks.userId, userId), sql`${tag} = ANY(${bookmarks.tags})`)
              : eq(bookmarks.userId, userId),
          )
          .orderBy(desc(bookmarks.createdAt))
          .limit(limit);

        const result = await query;

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result.map((b) => ({
              id: b.id,
              title: b.title,
              url: b.url,
              tags: b.tags,
              notes: b.notes,
              createdAt: b.createdAt,
            })), null, 2),
          }],
        };
      },
    );

    // ─── remover_bookmark ───
    server.tool(
      'remover_bookmark',
      'Remove um bookmark por ID.',
      {
        bookmarkId: z.number().describe('ID do bookmark a remover'),
      },
      async ({ bookmarkId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [bookmark] = await db
          .select()
          .from(bookmarks)
          .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)));
        if (!bookmark) {
          return { content: [{ type: 'text' as const, text: 'Erro: bookmark nao encontrado.' }] };
        }

        await db.delete(bookmarks).where(eq(bookmarks.id, bookmarkId));

        return {
          content: [{ type: 'text' as const, text: `Bookmark "${bookmark.title}" removido.` }],
        };
      },
    );

    // ─── buscar_conteudo ───
    server.tool(
      'buscar_conteudo',
      'Busca em todo conteudo salvo (artigos + bookmarks) por palavra-chave.',
      {
        query: z.string().describe('Termo de busca'),
        tipo: z.enum(['artigos', 'bookmarks', 'todos']).optional().default('todos').describe('Tipo de conteudo (default: todos)'),
      },
      async ({ query, tipo }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const results: Array<{ tipo: string; title: string; url: string; snippet: string; createdAt: string | null }> = [];

        try {
          const tsquery = sql`websearch_to_tsquery('simple', ${query})`;

          if (tipo === 'todos' || tipo === 'artigos') {
            const articleResults = await db
              .select({
                title: articles.title,
                url: articles.url,
                content: articles.content,
                createdAt: articles.createdAt,
                rank: sql<number>`ts_rank(search_vector, ${tsquery})`.as('rank'),
              })
              .from(articles)
              .where(
                and(
                  eq(articles.userId, userId),
                  sql`search_vector @@ ${tsquery}`,
                ),
              )
              .orderBy(sql`rank DESC`)
              .limit(20);

            for (const a of articleResults) {
              const text = a.content || a.title;
              const snippet = text.slice(0, 150);
              results.push({
                tipo: 'artigo',
                title: a.title,
                url: a.url,
                snippet: snippet + (snippet.length < text.length ? '...' : ''),
                createdAt: a.createdAt,
              });
            }
          }

          if (tipo === 'todos' || tipo === 'bookmarks') {
            const bookmarkResults = await db
              .select({
                title: bookmarks.title,
                url: bookmarks.url,
                content: bookmarks.content,
                notes: bookmarks.notes,
                createdAt: bookmarks.createdAt,
                rank: sql<number>`ts_rank(search_vector, ${tsquery})`.as('rank'),
              })
              .from(bookmarks)
              .where(
                and(
                  eq(bookmarks.userId, userId),
                  sql`search_vector @@ ${tsquery}`,
                ),
              )
              .orderBy(sql`rank DESC`)
              .limit(20);

            for (const b of bookmarkResults) {
              const text = b.notes || b.content || b.title;
              const snippet = text.slice(0, 150);
              results.push({
                tipo: 'bookmark',
                title: b.title,
                url: b.url,
                snippet: snippet + (snippet.length < text.length ? '...' : ''),
                createdAt: b.createdAt,
              });
            }
          }
        } catch {
          return {
            content: [{ type: 'text' as const, text: '[]' }],
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(results.slice(0, 20), null, 2),
          }],
        };
      },
    );

    // ─── extrair_conteudo ───
    server.tool(
      'extrair_conteudo',
      'Extrai conteudo completo de uma URL via scrape API ou fetch direto.',
      {
        url: z.string().url().describe('URL para extrair conteudo'),
        bookmarkId: z.number().optional().describe('ID do bookmark para atualizar content'),
        articleId: z.number().optional().describe('ID do artigo para atualizar content'),
      },
      async ({ url, bookmarkId, articleId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        let title = '';
        let content = '';
        let description = '';

        const scrapeApiUrl = process.env.SCRAPE_API_URL;
        const scrapeApiKey = process.env.SCRAPE_API_KEY;

        if (scrapeApiUrl && scrapeApiKey) {
          // Use scrape API
          try {
            const res = await fetch(scrapeApiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${scrapeApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url }),
            });
            const data = await res.json();
            title = data.title || '';
            content = data.content || data.text || '';
            description = data.description || '';
          } catch {
            // Fall through to direct fetch
          }
        }

        if (!content) {
          // Fallback: direct fetch + HTML strip
          try {
            const res = await fetch(url);
            const html = await res.text();
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            title = titleMatch ? titleMatch[1].trim() : '';
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
            description = descMatch ? descMatch[1].trim() : '';
            // Strip HTML tags for content
            content = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 10000);
          } catch {
            return { content: [{ type: 'text' as const, text: 'Erro: nao foi possivel acessar a URL.' }] };
          }
        }

        // Update bookmark or article if requested
        if (bookmarkId) {
          await db
            .update(bookmarks)
            .set({ content, summary: description })
            .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)));
        }
        if (articleId) {
          await db
            .update(articles)
            .set({ content, summary: description })
            .where(and(eq(articles.id, articleId), eq(articles.userId, userId)));
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ title, description, content: content.slice(0, 2000) }, null, 2),
          }],
        };
      },
    );
  },
};

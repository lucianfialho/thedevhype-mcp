import { z } from 'zod';
import crypto from 'crypto';
import { eq, and, sql, desc, ilike, gte, count } from 'drizzle-orm';
import { extractAccessKey, fetchNFCeFromInfosimples } from '../../infosimples';
import { db } from '../../db';
import { userMcpAccess } from '../../db/public.schema';
import { getUserId } from '../auth-helpers';
import {
  extractions,
  stores,
  products,
  priceEntries,
  canonicalProducts,
  publicPriceEntries,
  shoppingLists,
  shoppingListItems,
} from './nota-fiscal.schema';
import type { McpServerDefinition } from '../types';

export const notaFiscalServer: McpServerDefinition = {
  name: 'lucian',
  description:
    'Lucian — Gestor de Supermercado Virtual: extrai NFC-e, rastreia preços e categoriza gastos',
  category: 'Personal Finance',
  icon: '/lucian.png',
  tools: [
    {
      name: 'buscar_nota_fiscal',
      description:
        'Extrai dados de uma NFC-e a partir da URL, armazena produtos e preços no banco de dados',
    },
    {
      name: 'listar_notas_fiscais',
      description: 'Lista notas fiscais armazenadas com filtro opcional por loja',
    },
    {
      name: 'listar_produtos',
      description:
        'Lista produtos cadastrados com filtro por categoria ou busca por nome',
    },
    {
      name: 'comparar_precos',
      description:
        'Compara preços de um produto ao longo do tempo e entre lojas',
    },
    {
      name: 'resumo_gastos',
      description:
        'Resumo de gastos agrupado por categoria, loja ou mês',
    },
    {
      name: 'classificar_produto',
      description: 'Define a categoria de um produto',
    },
    {
      name: 'classificar_produtos_em_lote',
      description: 'Define categorias de vários produtos de uma vez',
    },
    {
      name: 'adicionar_item_lista',
      description:
        'Adiciona um item à lista de compras ativa. Aceita linguagem natural como "açúcar", "2kg de frango". Sugere preço e loja mais barata baseado no histórico.',
    },
    {
      name: 'ver_lista_compras',
      description: 'Mostra todos os itens da lista de compras ativa (pendentes e comprados)',
    },
    {
      name: 'marcar_comprado',
      description: 'Marca um item da lista como comprado (por ID ou nome)',
    },
    {
      name: 'finalizar_lista',
      description: 'Finaliza a lista de compras ativa e arquiva',
    },
    {
      name: 'remover_item_lista',
      description: 'Remove um item da lista de compras (por ID ou nome)',
    },
  ],
  init: (server) => {
    // ─── buscar_nota_fiscal ───
    server.tool(
      'buscar_nota_fiscal',
      'Busca e extrai dados de uma NFC-e a partir da URL ou chave de acesso, armazenando estabelecimento, produtos e preços no banco.',
      { input: z.string().describe('URL da NFC-e ou chave de acesso de 44 dígitos') },
      async ({ input }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Monthly extraction limit (free tier: 10/month)
        const MONTHLY_LIMIT = 10;
        const firstOfMonth = new Date();
        firstOfMonth.setDate(1);
        firstOfMonth.setHours(0, 0, 0, 0);

        const [{ total }] = await db
          .select({ total: count() })
          .from(extractions)
          .where(
            and(
              eq(extractions.userId, userId),
              gte(extractions.createdAt, firstOfMonth.toISOString()),
            ),
          );

        if (total >= MONTHLY_LIMIT) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Limite mensal atingido: você já usou ${total}/${MONTHLY_LIMIT} consultas este mês. Aguarde o próximo mês ou faça upgrade para o plano Pro.`,
              },
            ],
          };
        }

        const accessKey = extractAccessKey(input);
        if (!accessKey) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Erro: não foi possível extrair a chave de acesso de 44 dígitos do input fornecido.',
              },
            ],
          };
        }

        const resultado = await fetchNFCeFromInfosimples(accessKey);

        if (!resultado.sucesso || !resultado.notaFiscal) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Erro ao buscar nota fiscal: ${resultado.erro || 'Erro desconhecido'}`,
              },
            ],
          };
        }

        const nf = resultado.notaFiscal;

        // 1. Save extraction (skip if duplicate URL for this user)
        const [extraction] = await db
          .insert(extractions)
          .values({ userId, url: input, data: nf })
          .onConflictDoNothing({ target: [extractions.userId, extractions.url] })
          .returning({ id: extractions.id });

        if (!extraction) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'Esta nota fiscal já foi registrada anteriormente. Nenhuma duplicata foi criada.',
              },
            ],
          };
        }

        // 2. Upsert store by CNPJ
        const [store] = await db
          .insert(stores)
          .values({
            cnpj: nf.estabelecimento.cnpj,
            nome: nf.estabelecimento.nome,
            endereco: nf.estabelecimento.endereco,
            cidade: nf.estabelecimento.cidade,
            estado: nf.estabelecimento.estado,
          })
          .onConflictDoUpdate({
            target: stores.cnpj,
            set: {
              nome: nf.estabelecimento.nome,
              endereco: nf.estabelecimento.endereco,
              cidade: nf.estabelecimento.cidade,
              estado: nf.estabelecimento.estado,
            },
          })
          .returning({ id: stores.id });

        // 3. Upsert products and insert price entries
        const dataCompra = nf.dataEmissao.toISOString().split('T')[0];

        for (const p of nf.produtos) {
          const [product] = await db
            .insert(products)
            .values({
              userId,
              storeId: store.id,
              codigo: p.codigo,
              nome: p.nome,
              unidade: p.unidade,
            })
            .onConflictDoUpdate({
              target: [products.userId, products.storeId, products.codigo],
              set: {
                nome: p.nome,
                unidade: p.unidade,
                updatedAt: sql`CURRENT_TIMESTAMP`,
              },
            })
            .returning({ id: products.id });

          await db.insert(priceEntries).values({
            userId,
            extractionId: extraction.id,
            productId: product.id,
            storeId: store.id,
            quantidade: p.quantidade.toString(),
            valorUnitario: p.valorUnitario.toString(),
            valorTotal: p.valorTotal.toString(),
            dataCompra,
          });
        }

        // Contribute to public API if user opted in
        try {
          const [access] = await db
            .select({ contribute: userMcpAccess.contributePublicData })
            .from(userMcpAccess)
            .where(
              and(
                eq(userMcpAccess.userId, userId),
                eq(userMcpAccess.mcpName, 'lucian'),
                eq(userMcpAccess.contributePublicData, true),
              ),
            )
            .limit(1);

          if (access) {
            const contributorHash = crypto
              .createHash('sha256')
              .update(userId)
              .digest('hex');

            for (const p of nf.produtos) {
              const [canonical] = await db
                .insert(canonicalProducts)
                .values({
                  storeId: store.id,
                  codigo: p.codigo,
                  nome: p.nome,
                  unidade: p.unidade,
                })
                .onConflictDoUpdate({
                  target: [canonicalProducts.storeId, canonicalProducts.codigo],
                  set: {
                    nome: p.nome,
                    unidade: p.unidade,
                    contributorCount: sql`${canonicalProducts.contributorCount} + 1`,
                    lastSeenAt: sql`CURRENT_TIMESTAMP`,
                    updatedAt: sql`CURRENT_TIMESTAMP`,
                  },
                })
                .returning({ id: canonicalProducts.id });

              await db.insert(publicPriceEntries).values({
                canonicalProductId: canonical.id,
                storeId: store.id,
                valorUnitario: p.valorUnitario.toString(),
                valorTotal: p.valorTotal.toString(),
                quantidade: p.quantidade.toString(),
                dataCompra,
                contributorHash,
              });
            }
          }
        } catch {
          // Non-critical: don't fail the main flow if public contribution fails
        }

        // Format output (same as before)
        const produtosFormatados = nf.produtos
          .map(
            (p, i) =>
              `  ${i + 1}. ${p.nome} (Cód: ${p.codigo})\n     Qtd: ${p.quantidade} ${p.unidade} × R$ ${p.valorUnitario.toFixed(2)} = R$ ${p.valorTotal.toFixed(2)}`,
          )
          .join('\n');

        const pagamentosFormatados = nf.formasPagamento
          .map((fp) => `  - ${fp.tipo}: R$ ${fp.valorPago.toFixed(2)}`)
          .join('\n');

        const texto = [
          `# Nota Fiscal Eletrônica - NFC-e`,
          ``,
          `## Estabelecimento`,
          `- **Nome:** ${nf.estabelecimento.nome}`,
          `- **CNPJ:** ${nf.estabelecimento.cnpj}`,
          `- **Endereço:** ${nf.estabelecimento.endereco}`,
          ``,
          `## Informações da Nota`,
          `- **Número:** ${nf.numero}`,
          `- **Série:** ${nf.serie}`,
          `- **Chave de Acesso:** ${nf.chaveAcesso}`,
          `- **Protocolo:** ${nf.protocoloAutorizacao}`,
          `- **Emissão:** ${nf.dataEmissao.toLocaleString('pt-BR')}`,
          nf.dataAutorizacao
            ? `- **Autorização:** ${nf.dataAutorizacao.toLocaleString('pt-BR')}`
            : '',
          ``,
          `## Produtos (${nf.quantidadeTotalItens} itens)`,
          produtosFormatados,
          ``,
          `## Totais`,
          `- **Valor dos Produtos:** R$ ${nf.valorTotalProdutos.toFixed(2)}`,
          `- **Descontos:** R$ ${nf.descontos.toFixed(2)}`,
          `- **Valor a Pagar:** R$ ${nf.valorAPagar.toFixed(2)}`,
          `- **Tributos:** R$ ${nf.tributos.toFixed(2)}`,
          ``,
          `## Formas de Pagamento`,
          pagamentosFormatados,
          nf.troco > 0 ? `- **Troco:** R$ ${nf.troco.toFixed(2)}` : '',
          ``,
          `✅ Dados salvos: ${nf.produtos.length} produtos registrados.`,
        ]
          .filter(Boolean)
          .join('\n');

        return {
          content: [{ type: 'text' as const, text: texto }],
        };
      },
    );

    // ─── listar_notas_fiscais ───
    server.tool(
      'listar_notas_fiscais',
      'Lista notas fiscais armazenadas, com filtro opcional por loja.',
      {
        limite: z.number().int().min(1).max(50).default(10).describe('Número máximo de resultados'),
        loja: z.string().optional().describe('Filtrar por nome da loja (busca parcial)'),
      },
      async ({ limite, loja }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const rows = await db
          .select({
            id: extractions.id,
            url: extractions.url,
            createdAt: extractions.createdAt,
            loja: stores.nome,
            cnpj: stores.cnpj,
            totalItens: sql<number>`(${extractions.data}->>'quantidadeTotalItens')::int`,
            valorAPagar: sql<string>`${extractions.data}->>'valorAPagar'`,
          })
          .from(extractions)
          .leftJoin(
            stores,
            sql`${extractions.data}->'estabelecimento'->>'cnpj' = ${stores.cnpj}`,
          )
          .where(
            loja
              ? and(eq(extractions.userId, userId), ilike(stores.nome, `%${loja}%`))
              : eq(extractions.userId, userId),
          )
          .orderBy(desc(extractions.createdAt))
          .limit(limite);

        if (rows.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'Nenhuma nota fiscal encontrada.' }],
          };
        }

        const linhas = rows.map(
          (r, i) =>
            `${i + 1}. **${r.loja || 'Loja desconhecida'}** — R$ ${Number(r.valorAPagar || 0).toFixed(2)} (${r.totalItens || '?'} itens)\n   ${r.createdAt} | ID: ${r.id}`,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: `# Notas Fiscais (${rows.length})\n\n${linhas.join('\n\n')}`,
            },
          ],
        };
      },
    );

    // ─── listar_produtos ───
    server.tool(
      'listar_produtos',
      'Lista produtos cadastrados com filtro por categoria ou busca por nome.',
      {
        categoria: z.string().optional().describe('Filtrar por categoria'),
        busca: z.string().optional().describe('Busca parcial por nome do produto'),
        limite: z.number().int().min(1).max(100).default(20).describe('Número máximo de resultados'),
      },
      async ({ categoria, busca, limite }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const conditions = [eq(products.userId, userId)];
        if (categoria) conditions.push(ilike(products.categoria, `%${categoria}%`));
        if (busca) conditions.push(ilike(products.nome, `%${busca}%`));

        const rows = await db
          .select({
            id: products.id,
            nome: products.nome,
            codigo: products.codigo,
            unidade: products.unidade,
            categoria: products.categoria,
            loja: stores.nome,
          })
          .from(products)
          .innerJoin(stores, eq(products.storeId, stores.id))
          .where(and(...conditions))
          .orderBy(products.nome)
          .limit(limite);

        if (rows.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'Nenhum produto encontrado.' }],
          };
        }

        const linhas = rows.map(
          (r) =>
            `- **${r.nome}** (Cód: ${r.codigo}) — ${r.loja}\n  Categoria: ${r.categoria || '_sem categoria_'} | ID: ${r.id}`,
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: `# Produtos (${rows.length})\n\n${linhas.join('\n')}`,
            },
          ],
        };
      },
    );

    // ─── comparar_precos ───
    server.tool(
      'comparar_precos',
      'Compara preços de um produto ao longo do tempo e entre diferentes lojas.',
      {
        produto: z.string().describe('Nome do produto (busca parcial)'),
        periodo_dias: z.number().int().min(1).max(365).default(30).describe('Período em dias para análise'),
      },
      async ({ produto, periodo_dias }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const desde = new Date();
        desde.setDate(desde.getDate() - periodo_dias);

        const rows = await db
          .select({
            produtoNome: products.nome,
            loja: stores.nome,
            valorUnitario: priceEntries.valorUnitario,
            quantidade: priceEntries.quantidade,
            valorTotal: priceEntries.valorTotal,
            dataCompra: priceEntries.dataCompra,
          })
          .from(priceEntries)
          .innerJoin(products, eq(priceEntries.productId, products.id))
          .innerJoin(stores, eq(priceEntries.storeId, stores.id))
          .where(
            and(
              eq(priceEntries.userId, userId),
              ilike(products.nome, `%${produto}%`),
              gte(priceEntries.dataCompra, desde.toISOString().split('T')[0]),
            ),
          )
          .orderBy(products.nome, desc(priceEntries.dataCompra));

        if (rows.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Nenhum registro de preço encontrado para "${produto}" nos últimos ${periodo_dias} dias.`,
              },
            ],
          };
        }

        // Group by product name
        const grouped = new Map<string, typeof rows>();
        for (const r of rows) {
          const list = grouped.get(r.produtoNome) ?? [];
          list.push(r);
          grouped.set(r.produtoNome, list);
        }

        const sections: string[] = [];
        for (const [nome, entries] of grouped) {
          const prices = entries.map((e) => Number(e.valorUnitario));
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          const avg = prices.reduce((a, b) => a + b, 0) / prices.length;

          const header = `## ${nome}\nMín: R$ ${min.toFixed(2)} | Máx: R$ ${max.toFixed(2)} | Média: R$ ${avg.toFixed(2)}\n`;
          const linhas = entries.map(
            (e) =>
              `  - ${e.dataCompra} — **${e.loja}**: R$ ${Number(e.valorUnitario).toFixed(2)} (${e.quantidade} × R$ ${Number(e.valorUnitario).toFixed(2)} = R$ ${Number(e.valorTotal).toFixed(2)})`,
          );
          sections.push(header + linhas.join('\n'));
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `# Comparação de Preços — "${produto}" (${periodo_dias} dias)\n\n${sections.join('\n\n')}`,
            },
          ],
        };
      },
    );

    // ─── resumo_gastos ───
    server.tool(
      'resumo_gastos',
      'Gera um resumo de gastos agrupado por categoria, loja ou mês.',
      {
        periodo_dias: z.number().int().min(1).max(365).default(30).describe('Período em dias'),
        agrupar_por: z
          .enum(['categoria', 'loja', 'mes'])
          .default('categoria')
          .describe('Agrupar por: categoria, loja ou mes'),
      },
      async ({ periodo_dias, agrupar_por }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const desde = new Date();
        desde.setDate(desde.getDate() - periodo_dias);
        const desdeStr = desde.toISOString().split('T')[0];

        let groupExpr: ReturnType<typeof sql>;
        let groupLabel: string;

        switch (agrupar_por) {
          case 'loja':
            groupExpr = sql`${stores.nome}`;
            groupLabel = 'Loja';
            break;
          case 'mes':
            groupExpr = sql`to_char(${priceEntries.dataCompra}::date, 'YYYY-MM')`;
            groupLabel = 'Mês';
            break;
          default:
            groupExpr = sql`COALESCE(${products.categoria}, 'Sem categoria')`;
            groupLabel = 'Categoria';
        }

        const rows = await db
          .select({
            grupo: groupExpr.as('grupo'),
            total: sql<string>`SUM(${priceEntries.valorTotal}::numeric)`.as('total'),
            itens: sql<number>`COUNT(*)`.as('itens'),
          })
          .from(priceEntries)
          .innerJoin(products, eq(priceEntries.productId, products.id))
          .innerJoin(stores, eq(priceEntries.storeId, stores.id))
          .where(
            and(
              eq(priceEntries.userId, userId),
              gte(priceEntries.dataCompra, desdeStr),
            ),
          )
          .groupBy(groupExpr)
          .orderBy(sql`total DESC`);

        if (rows.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Nenhum gasto encontrado nos últimos ${periodo_dias} dias.`,
              },
            ],
          };
        }

        const totalGeral = rows.reduce((sum, r) => sum + Number(r.total), 0);
        const linhas = rows.map(
          (r) => {
            const pct = ((Number(r.total) / totalGeral) * 100).toFixed(1);
            return `| ${r.grupo} | R$ ${Number(r.total).toFixed(2)} | ${r.itens} | ${pct}% |`;
          },
        );

        const texto = [
          `# Resumo de Gastos — Últimos ${periodo_dias} dias`,
          `**Total geral: R$ ${totalGeral.toFixed(2)}**`,
          ``,
          `| ${groupLabel} | Valor | Itens | % |`,
          `|---|---|---|---|`,
          ...linhas,
        ].join('\n');

        return {
          content: [{ type: 'text' as const, text: texto }],
        };
      },
    );

    // ─── classificar_produto ───
    server.tool(
      'classificar_produto',
      'Define a categoria de um produto. Pode buscar por ID ou nome.',
      {
        produto_id: z.number().int().optional().describe('ID do produto'),
        nome_produto: z.string().optional().describe('Nome do produto (busca parcial, usado se produto_id não informado)'),
        categoria: z.string().describe('Categoria a atribuir (ex: Laticínios, Carnes, Bebidas, Limpeza, Higiene, Hortifruti, Padaria, Mercearia)'),
      },
      async ({ produto_id, nome_produto, categoria }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        if (!produto_id && !nome_produto) {
          return {
            content: [
              { type: 'text' as const, text: 'Informe produto_id ou nome_produto.' },
            ],
          };
        }

        let condition;
        if (produto_id) {
          condition = and(eq(products.id, produto_id), eq(products.userId, userId));
        } else {
          condition = and(eq(products.userId, userId), ilike(products.nome, `%${nome_produto}%`));
        }

        const updated = await db
          .update(products)
          .set({ categoria, updatedAt: sql`CURRENT_TIMESTAMP` })
          .where(condition!)
          .returning({ id: products.id, nome: products.nome });

        if (updated.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'Nenhum produto encontrado.' }],
          };
        }

        const nomes = updated.map((u) => `- ${u.nome} (ID: ${u.id})`).join('\n');
        return {
          content: [
            {
              type: 'text' as const,
              text: `✅ ${updated.length} produto(s) classificado(s) como **${categoria}**:\n${nomes}`,
            },
          ],
        };
      },
    );

    // ─── classificar_produtos_em_lote ───
    server.tool(
      'classificar_produtos_em_lote',
      'Define categorias de vários produtos de uma vez.',
      {
        classificacoes: z
          .array(
            z.object({
              produto_id: z.number().int().describe('ID do produto'),
              categoria: z.string().describe('Categoria a atribuir'),
            }),
          )
          .min(1)
          .describe('Lista de classificações'),
      },
      async ({ classificacoes }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const resultados: string[] = [];

        for (const { produto_id, categoria } of classificacoes) {
          const updated = await db
            .update(products)
            .set({ categoria, updatedAt: sql`CURRENT_TIMESTAMP` })
            .where(and(eq(products.id, produto_id), eq(products.userId, userId)))
            .returning({ id: products.id, nome: products.nome });

          if (updated.length > 0) {
            resultados.push(`✅ ${updated[0].nome} → ${categoria}`);
          } else {
            resultados.push(`❌ ID ${produto_id} não encontrado`);
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `# Classificação em Lote\n\n${resultados.join('\n')}`,
            },
          ],
        };
      },
    );

    // ─── Helper: get or create active shopping list ───
    async function getOrCreateActiveList(userId: string) {
      const [existing] = await db
        .select()
        .from(shoppingLists)
        .where(and(eq(shoppingLists.userId, userId), eq(shoppingLists.status, 'active')))
        .limit(1);

      if (existing) return existing;

      const [created] = await db
        .insert(shoppingLists)
        .values({ userId })
        .returning();

      return created;
    }

    // ─── adicionar_item_lista ───
    server.tool(
      'adicionar_item_lista',
      'Adiciona um item à lista de compras ativa. Aceita linguagem natural como "açúcar", "2kg de frango". Sugere preço e loja mais barata baseado no histórico.',
      {
        item: z.string().describe('Descrição do item, ex: "açúcar", "2kg de frango", "3 leites"'),
      },
      async ({ item }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const list = await getOrCreateActiveList(userId);

        // Parse quantity and unit from input (e.g. "2kg de frango" → qty=2, unit=kg, name=frango)
        const qtyMatch = item.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|un|und|unidades?|litros?|pacotes?|pct|caixas?|cx|latas?|garrafas?|dz|dúzias?)?\s*(?:de\s+)?(.+)$/i);

        let parsedName: string;
        let parsedQty: number | null = null;
        let parsedUnit: string | null = null;

        if (qtyMatch) {
          parsedQty = parseFloat(qtyMatch[1].replace(',', '.'));
          parsedUnit = qtyMatch[2]?.toLowerCase() || null;
          parsedName = qtyMatch[3].trim();
        } else {
          parsedName = item.trim();
        }

        // Fuzzy search products in history
        const matchedProducts = await db
          .select({
            id: products.id,
            nome: products.nome,
            unidade: products.unidade,
          })
          .from(products)
          .where(and(eq(products.userId, userId), ilike(products.nome, `%${parsedName}%`)))
          .limit(5);

        let productId: number | null = null;
        let estimatedPrice: string | null = null;
        let cheapestStore: string | null = null;
        let suggestedQty = parsedQty;
        let suggestedUnit = parsedUnit;
        let displayName = parsedName;

        if (matchedProducts.length > 0) {
          const bestMatch = matchedProducts[0];
          productId = bestMatch.id;
          displayName = bestMatch.nome;
          if (!suggestedUnit && bestMatch.unidade) suggestedUnit = bestMatch.unidade;

          // Get price history for this product
          const priceHistory = await db
            .select({
              valorUnitario: priceEntries.valorUnitario,
              quantidade: priceEntries.quantidade,
              storeName: stores.nome,
            })
            .from(priceEntries)
            .innerJoin(stores, eq(priceEntries.storeId, stores.id))
            .where(and(eq(priceEntries.userId, userId), eq(priceEntries.productId, bestMatch.id)))
            .orderBy(desc(priceEntries.dataCompra))
            .limit(20);

          if (priceHistory.length > 0) {
            // Average price
            const prices = priceHistory.map((p) => Number(p.valorUnitario));
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            estimatedPrice = avgPrice.toFixed(2);

            // Cheapest store (by lowest unit price)
            let minPrice = Infinity;
            for (const entry of priceHistory) {
              const p = Number(entry.valorUnitario);
              if (p < minPrice) {
                minPrice = p;
                cheapestStore = entry.storeName;
              }
            }

            // Use last quantity as suggestion if none provided
            if (!suggestedQty) {
              suggestedQty = Number(priceHistory[0].quantidade);
            }
          }
        }

        // Insert item into list
        const [newItem] = await db
          .insert(shoppingListItems)
          .values({
            listId: list.id,
            userId,
            productId,
            name: displayName,
            quantity: suggestedQty?.toString() || null,
            unit: suggestedUnit,
            estimatedPrice,
            cheapestStore,
          })
          .returning();

        const lines = [
          `✅ Item adicionado à lista de compras:`,
          ``,
          `**${displayName}**`,
          suggestedQty ? `Quantidade: ${suggestedQty} ${suggestedUnit || ''}`.trim() : null,
          estimatedPrice ? `Preço estimado: R$ ${estimatedPrice}` : null,
          cheapestStore ? `Loja mais barata: ${cheapestStore}` : null,
          productId ? `(Baseado no histórico de compras)` : `(Produto novo — sem histórico)`,
          ``,
          `ID: ${newItem.id}`,
        ].filter(Boolean);

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      },
    );

    // ─── ver_lista_compras ───
    server.tool(
      'ver_lista_compras',
      'Mostra todos os itens da lista de compras ativa (pendentes e comprados).',
      {},
      async (_params, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const list = await getOrCreateActiveList(userId);

        const items = await db
          .select()
          .from(shoppingListItems)
          .where(eq(shoppingListItems.listId, list.id))
          .orderBy(shoppingListItems.checked, shoppingListItems.createdAt);

        if (items.length === 0) {
          return {
            content: [{ type: 'text' as const, text: 'Lista de compras vazia. Use `adicionar_item_lista` para adicionar itens.' }],
          };
        }

        const pending = items.filter((i) => !i.checked);
        const checked = items.filter((i) => i.checked);

        const formatItem = (i: typeof items[number]) => {
          const qty = i.quantity ? `${i.quantity} ${i.unit || ''}`.trim() : '';
          const price = i.estimatedPrice ? `~R$ ${i.estimatedPrice}` : '';
          const store = i.cheapestStore ? `(${i.cheapestStore})` : '';
          return `- [${i.checked ? 'x' : ' '}] **${i.name}** ${qty} ${price} ${store} — ID: ${i.id}`.trim();
        };

        const sections: string[] = [`# Lista de Compras`];

        if (pending.length > 0) {
          sections.push(`\n## Pendentes (${pending.length})`);
          sections.push(pending.map(formatItem).join('\n'));
        }

        if (checked.length > 0) {
          sections.push(`\n## Comprados (${checked.length})`);
          sections.push(checked.map(formatItem).join('\n'));
        }

        const totalEstimado = items
          .filter((i) => !i.checked && i.estimatedPrice && i.quantity)
          .reduce((sum, i) => sum + Number(i.estimatedPrice) * Number(i.quantity), 0);

        if (totalEstimado > 0) {
          sections.push(`\n**Total estimado (pendentes): R$ ${totalEstimado.toFixed(2)}**`);
        }

        return {
          content: [{ type: 'text' as const, text: sections.join('\n') }],
        };
      },
    );

    // ─── marcar_comprado ───
    server.tool(
      'marcar_comprado',
      'Marca um item da lista como comprado. Busca por ID numérico ou nome parcial.',
      {
        item: z.string().describe('ID numérico ou nome do item'),
      },
      async ({ item }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const list = await getOrCreateActiveList(userId);

        const isId = /^\d+$/.test(item.trim());
        let updated;

        if (isId) {
          updated = await db
            .update(shoppingListItems)
            .set({ checked: true })
            .where(
              and(
                eq(shoppingListItems.id, parseInt(item)),
                eq(shoppingListItems.listId, list.id),
                eq(shoppingListItems.userId, userId),
              ),
            )
            .returning({ id: shoppingListItems.id, name: shoppingListItems.name });
        } else {
          updated = await db
            .update(shoppingListItems)
            .set({ checked: true })
            .where(
              and(
                eq(shoppingListItems.listId, list.id),
                eq(shoppingListItems.userId, userId),
                ilike(shoppingListItems.name, `%${item}%`),
              ),
            )
            .returning({ id: shoppingListItems.id, name: shoppingListItems.name });
        }

        if (updated.length === 0) {
          return {
            content: [{ type: 'text' as const, text: `Nenhum item encontrado para "${item}".` }],
          };
        }

        const names = updated.map((u) => `- ${u.name} (ID: ${u.id})`).join('\n');
        return {
          content: [{ type: 'text' as const, text: `✅ Marcado como comprado:\n${names}` }],
        };
      },
    );

    // ─── remover_item_lista ───
    server.tool(
      'remover_item_lista',
      'Remove um item da lista de compras. Busca por ID numérico ou nome parcial.',
      {
        item: z.string().describe('ID numérico ou nome do item'),
      },
      async ({ item }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const list = await getOrCreateActiveList(userId);

        const isId = /^\d+$/.test(item.trim());
        let deleted;

        if (isId) {
          deleted = await db
            .delete(shoppingListItems)
            .where(
              and(
                eq(shoppingListItems.id, parseInt(item)),
                eq(shoppingListItems.listId, list.id),
                eq(shoppingListItems.userId, userId),
              ),
            )
            .returning({ id: shoppingListItems.id, name: shoppingListItems.name });
        } else {
          deleted = await db
            .delete(shoppingListItems)
            .where(
              and(
                eq(shoppingListItems.listId, list.id),
                eq(shoppingListItems.userId, userId),
                ilike(shoppingListItems.name, `%${item}%`),
              ),
            )
            .returning({ id: shoppingListItems.id, name: shoppingListItems.name });
        }

        if (deleted.length === 0) {
          return {
            content: [{ type: 'text' as const, text: `Nenhum item encontrado para "${item}".` }],
          };
        }

        const names = deleted.map((d) => `- ${d.name} (ID: ${d.id})`).join('\n');
        return {
          content: [{ type: 'text' as const, text: `🗑️ Removido da lista:\n${names}` }],
        };
      },
    );

    // ─── finalizar_lista ───
    server.tool(
      'finalizar_lista',
      'Finaliza a lista de compras ativa, arquivando-a. Uma nova lista vazia será criada automaticamente na próxima interação.',
      {},
      async (_params, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [activeList] = await db
          .select()
          .from(shoppingLists)
          .where(and(eq(shoppingLists.userId, userId), eq(shoppingLists.status, 'active')))
          .limit(1);

        if (!activeList) {
          return {
            content: [{ type: 'text' as const, text: 'Nenhuma lista ativa para finalizar.' }],
          };
        }

        const items = await db
          .select()
          .from(shoppingListItems)
          .where(eq(shoppingListItems.listId, activeList.id));

        const checkedCount = items.filter((i) => i.checked).length;

        await db
          .update(shoppingLists)
          .set({ status: 'completed', completedAt: new Date().toISOString() })
          .where(eq(shoppingLists.id, activeList.id));

        return {
          content: [
            {
              type: 'text' as const,
              text: `✅ Lista finalizada!\n\n- Total de itens: ${items.length}\n- Comprados: ${checkedCount}\n- Não comprados: ${items.length - checkedCount}\n\nUma nova lista será criada automaticamente quando você adicionar o próximo item.`,
            },
          ],
        };
      },
    );
  },
};

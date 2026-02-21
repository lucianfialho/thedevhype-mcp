import { z } from 'zod';
import crypto from 'crypto';
import { eq, and, sql, desc, ilike, gte, count } from 'drizzle-orm';
import { extractAccessKey, fetchNFCeFromInfosimples } from '../../infosimples';
import { db } from '../../db';
import { userMcpAccess } from '../../db/public.schema';
import { getUserId } from '../auth-helpers';
import { toolError } from '../errors';
import { LUCIAN_LIMITS } from '../../billing/config';
import { hasLucianSubscription, isGrandfathered } from '../../billing/subscriptions';
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
  instructions: `# Lucian — Gestor de Supermercado Virtual

## Propósito
Lucian extrai dados de Notas Fiscais eletrônicas (NFC-e) brasileiras, armazena produtos e preços, e permite análise de gastos, comparação de preços entre lojas, classificação de produtos por categoria, e gerenciamento de lista de compras inteligente.

## Conceitos-Chave
- **NFC-e**: Nota Fiscal de Consumidor Eletrônica. Identificada por URL (fazenda.gov.br) ou chave de acesso de 44 dígitos.
- **Loja (Store)**: Estabelecimento identificado por CNPJ. Upsert automático.
- **Produto**: Item vinculado a uma loja e código. Pode ser classificado em categorias.
- **Preço (Price Entry)**: Registro histórico de preço unitário, quantidade e total por compra.
- **Lista de Compras**: Lista ativa com itens, quantidades estimadas e sugestão de loja mais barata baseada no histórico.

## Workflows Típicos
1. **Registrar Compra**: buscar_nota_fiscal (URL ou chave) → classificar_produtos_em_lote
2. **Analisar Gastos**: resumo_gastos (por categoria/loja/mês)
3. **Comparar Preços**: comparar_precos (histórico por produto)
4. **Lista de Compras**: adicionar_item_lista → ver_lista_compras → marcar_comprado → finalizar_lista

## Convenções
- IDs são numéricos. Obtenha de listar_notas_fiscais, listar_produtos, etc.
- Valores monetários em reais (R$) com 2 casas decimais.
- Datas no formato YYYY-MM-DD.
- Categorias sugeridas: Laticínios, Carnes, Bebidas, Limpeza, Higiene, Hortifruti, Padaria, Mercearia, Frios, Congelados.
- Limite: 10 extrações de NFC-e por mês (plano free).`,
  tools: [
    {
      name: 'buscar_nota_fiscal',
      description:
        'Extrai dados completos de uma NFC-e a partir da URL ou chave de acesso de 44 dígitos. Valida a chave, consulta a API de extração, e salva estabelecimento, produtos e preços no banco. Use quando o usuário compartilhar um link de nota fiscal ou colar a chave de acesso. Limite: 10 extrações/mês (plano free). Idempotente — mesma URL não cria duplicata. Retorna markdown formatado com todos os dados da nota.',
      annotations: { idempotentHint: true },
    },
    {
      name: 'listar_notas_fiscais',
      description:
        'Lista notas fiscais armazenadas com nome da loja, valor total, quantidade de itens e data. Filtro opcional por nome da loja (busca parcial). Use para ver o histórico de compras ou obter IDs de extração. Somente leitura.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'listar_produtos',
      description:
        'Lista produtos cadastrados com nome, código, unidade, categoria e loja. Filtro por categoria e/ou busca parcial por nome. Use para explorar produtos registrados ou encontrar IDs para classificação. Somente leitura.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'comparar_precos',
      description:
        'Compara o preço de um produto ao longo do tempo e entre diferentes lojas. Busca parcial pelo nome do produto. Retorna mínimo, máximo e média do período, com detalhes por compra. Use para descobrir onde comprar mais barato. Somente leitura.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'resumo_gastos',
      description:
        'Gera um resumo de gastos agrupado por categoria, loja ou mês. Retorna tabela com valor total, número de itens e percentual por grupo. Use para análise financeira de supermercado. Somente leitura.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'classificar_produto',
      description:
        'Define a categoria de um produto específico. Busca por ID ou nome parcial do produto. Categorias sugeridas: Laticínios, Carnes, Bebidas, Limpeza, Higiene, Hortifruti, Padaria, Mercearia, Frios, Congelados. Idempotente — reclassificar sobrescreve a categoria anterior.',
      annotations: { idempotentHint: true },
    },
    {
      name: 'classificar_produtos_em_lote',
      description:
        'Define categorias de vários produtos de uma vez. Recebe array de {produto_id, categoria}. Use após buscar_nota_fiscal para classificar todos os produtos novos. Mais eficiente que classificar_produto individual. Retorna status de cada classificação.',
      annotations: { idempotentHint: true },
    },
    {
      name: 'adicionar_item_lista',
      description:
        'Adiciona um item à lista de compras ativa. Aceita linguagem natural como "açúcar", "2kg de frango", "3 leites". Faz fuzzy match com produtos do histórico para sugerir preço estimado e loja mais barata. Cria lista automaticamente se não existir. Retorna item com preço estimado e sugestão de loja.',
    },
    {
      name: 'ver_lista_compras',
      description:
        'Mostra todos os itens da lista de compras ativa, separados em pendentes e comprados. Inclui preço estimado e loja sugerida por item. Calcula total estimado dos itens pendentes. Somente leitura.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'marcar_comprado',
      description:
        'Marca um item da lista como comprado. Busca por ID numérico ou nome parcial do item. Use conforme o usuário vai comprando itens no supermercado.',
      annotations: { idempotentHint: true },
    },
    {
      name: 'remover_item_lista',
      description:
        'Remove um item da lista de compras. Busca por ID numérico ou nome parcial. Destrutivo — remove permanentemente.',
      annotations: { destructiveHint: true },
    },
    {
      name: 'finalizar_lista',
      description:
        'Finaliza e arquiva a lista de compras ativa. Mostra resumo com total de itens, comprados e não comprados. Uma nova lista vazia será criada automaticamente na próxima adição de item.',
    },
  ],
  init: (server) => {
    // ─── buscar_nota_fiscal ───
    server.tool(
      'buscar_nota_fiscal',
      'Extrai dados completos de uma NFC-e a partir da URL ou chave de acesso de 44 dígitos. Valida a chave, consulta a API de extração, e salva estabelecimento, produtos e preços no banco. Use quando o usuário compartilhar um link de nota fiscal ou colar a chave de acesso. Limite: 10 extrações/mês (plano free). Idempotente — mesma URL não cria duplicata. Retorna markdown formatado com todos os dados da nota.',
      { input: z.string().describe('URL da NFC-e (ex: nfce.fazenda.gov.br/...) ou chave de acesso numérica de 44 dígitos') },
      { idempotentHint: true },
      async ({ input }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Monthly extraction limit: tier-aware (free: 10, subscribed: 50, grandfathered: 50)
        const grandfathered = await isGrandfathered(userId);
        const subscribed = await hasLucianSubscription(userId);
        const MONTHLY_LIMIT = (subscribed || grandfathered) ? LUCIAN_LIMITS.subscribed : LUCIAN_LIMITS.free;
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
          const upgradeHint = !subscribed && !grandfathered
            ? 'Faça upgrade em https://www.thedevhype.com/pricing para obter 50 extrações/mês.'
            : 'Aguarde o próximo mês para novas extrações.';
          return toolError(`Limite mensal atingido: ${total}/${MONTHLY_LIMIT} extrações usadas este mês.`, upgradeHint);
        }

        const accessKey = extractAccessKey(input);
        if (!accessKey) {
          return toolError('Não foi possível extrair a chave de acesso de 44 dígitos.', 'Forneça a URL completa da NFC-e (ex: nfce.fazenda.gov.br/...) ou a chave de acesso numérica de 44 dígitos.');
        }

        const resultado = await fetchNFCeFromInfosimples(accessKey);

        if (!resultado.sucesso || !resultado.notaFiscal) {
          return toolError(`Erro ao buscar nota fiscal: ${resultado.erro || 'Erro desconhecido'}`, 'Verifique se a URL/chave está correta. Nota fiscais muito antigas podem não estar disponíveis.');
        }

        const nf = resultado.notaFiscal;

        // 1. Save extraction (skip if duplicate URL for this user)
        const [extraction] = await db
          .insert(extractions)
          .values({ userId, url: input, data: nf })
          .onConflictDoNothing({ target: [extractions.userId, extractions.url] })
          .returning({ id: extractions.id });

        if (!extraction) {
          return toolError('Esta nota fiscal já foi registrada anteriormente.', 'Use listar_notas_fiscais para ver suas notas. Cada URL só pode ser processada uma vez.');
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
        } catch (err) {
          console.error('[Lucian] Failed to contribute public data:', err);
          // Non-critical: don't fail the main flow
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
      'Lista notas fiscais armazenadas com nome da loja, valor total, quantidade de itens e data. Filtro opcional por nome da loja (busca parcial). Use para ver o histórico de compras ou obter IDs de extração. Somente leitura.',
      {
        limite: z.number().int().min(1).max(50).default(10).describe('Número máximo de resultados (padrão: 10, máx: 50)'),
        loja: z.string().optional().describe('Filtrar por nome da loja (busca parcial, ex: "carrefour")'),
      },
      { readOnlyHint: true },
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
          return toolError('Nenhuma nota fiscal encontrada.', 'Use buscar_nota_fiscal com a URL de uma NFC-e para registrar sua primeira compra.');
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
      'Lista produtos cadastrados com nome, código, unidade, categoria e loja. Filtro por categoria e/ou busca parcial por nome. Use para explorar produtos registrados ou encontrar IDs para classificação. Somente leitura.',
      {
        categoria: z.string().optional().describe('Filtrar por categoria (ex: "Laticínios", "Carnes")'),
        busca: z.string().optional().describe('Busca parcial por nome do produto'),
        limite: z.number().int().min(1).max(100).default(20).describe('Número máximo de resultados (padrão: 10, máx: 50)'),
      },
      { readOnlyHint: true },
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
          return toolError('Nenhum produto encontrado.', 'Registre uma nota fiscal com buscar_nota_fiscal para popular seus produtos.');
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
      'Compara o preço de um produto ao longo do tempo e entre diferentes lojas. Busca parcial pelo nome do produto. Retorna mínimo, máximo e média do período, com detalhes por compra. Use para descobrir onde comprar mais barato. Somente leitura.',
      {
        produto: z.string().describe('Nome do produto para comparar (busca parcial, ex: "leite")'),
        periodo_dias: z.number().int().min(1).max(365).default(30).describe('Período em dias para análise (padrão: 30, máx: 365)'),
      },
      { readOnlyHint: true },
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
          return toolError(`Nenhum registro de preço para "${produto}" nos últimos ${periodo_dias} dias.`, 'Tente um nome de produto diferente (busca parcial) ou aumente o período.');
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
      'Gera um resumo de gastos agrupado por categoria, loja ou mês. Retorna tabela com valor total, número de itens e percentual por grupo. Use para análise financeira de supermercado. Somente leitura.',
      {
        periodo_dias: z.number().int().min(1).max(365).default(30).describe('Período em dias para análise (padrão: 30, máx: 365)'),
        agrupar_por: z
          .enum(['categoria', 'loja', 'mes'])
          .default('categoria')
          .describe('Agrupamento: "categoria", "loja" ou "mes"'),
      },
      { readOnlyHint: true },
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
          return toolError(`Nenhum gasto nos últimos ${periodo_dias} dias.`, 'Registre notas fiscais com buscar_nota_fiscal para gerar resumos de gastos.');
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
      'Define a categoria de um produto específico. Busca por ID ou nome parcial do produto. Categorias sugeridas: Laticínios, Carnes, Bebidas, Limpeza, Higiene, Hortifruti, Padaria, Mercearia, Frios, Congelados. Idempotente — reclassificar sobrescreve a categoria anterior.',
      {
        produto_id: z.number().int().optional().describe('ID numérico do produto — obtenha de listar_produtos'),
        nome_produto: z.string().optional().describe('Nome do produto para busca parcial (usado se produto_id não informado)'),
        categoria: z.string().describe('Categoria a atribuir: Laticínios, Carnes, Bebidas, Limpeza, Higiene, Hortifruti, Padaria, Mercearia, Frios, Congelados'),
      },
      { idempotentHint: true },
      async ({ produto_id, nome_produto, categoria }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        if (!produto_id && !nome_produto) {
          return toolError('Informe produto_id ou nome_produto.', 'Use listar_produtos para encontrar o ID ou nome do produto.');
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
          return toolError('Nenhum produto encontrado.', 'Use listar_produtos para ver os produtos disponíveis e seus IDs.');
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
      'Define categorias de vários produtos de uma vez. Recebe array de {produto_id, categoria}. Use após buscar_nota_fiscal para classificar todos os produtos novos. Mais eficiente que classificar_produto individual. Retorna status de cada classificação.',
      {
        classificacoes: z
          .array(
            z.object({
              produto_id: z.number().int().describe('ID numérico do produto — obtenha de listar_produtos'),
              categoria: z.string().describe('Categoria a atribuir: Laticínios, Carnes, Bebidas, Limpeza, Higiene, Hortifruti, Padaria, Mercearia, Frios, Congelados'),
            }),
          )
          .min(1)
          .describe('Array de classificações: [{produto_id: number, categoria: string}]'),
      },
      { idempotentHint: true },
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
      'Adiciona um item à lista de compras ativa. Aceita linguagem natural como "açúcar", "2kg de frango", "3 leites". Faz fuzzy match com produtos do histórico para sugerir preço estimado e loja mais barata. Cria lista automaticamente se não existir. Retorna item com preço estimado e sugestão de loja.',
      {
        item: z.string().describe('Descrição do item em linguagem natural, ex: "açúcar", "2kg de frango", "3 leites"'),
      },
      {},
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
      'Mostra todos os itens da lista de compras ativa, separados em pendentes e comprados. Inclui preço estimado e loja sugerida por item. Calcula total estimado dos itens pendentes. Somente leitura.',
      {},
      { readOnlyHint: true },
      async (_params, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const list = await getOrCreateActiveList(userId);

        const items = await db
          .select()
          .from(shoppingListItems)
          .where(eq(shoppingListItems.listId, list.id))
          .orderBy(shoppingListItems.checked, shoppingListItems.createdAt);

        if (items.length === 0) {
          return toolError('Lista de compras vazia.', 'Adicione itens com adicionar_item_lista — aceita linguagem natural como "açúcar", "2kg de frango".');
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
      'Marca um item da lista como comprado. Busca por ID numérico ou nome parcial do item. Use conforme o usuário vai comprando itens no supermercado.',
      {
        item: z.string().describe('ID numérico ou nome do item (busca parcial)'),
      },
      { idempotentHint: true },
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
          return toolError(`Nenhum item encontrado para "${item}".`, 'Use ver_lista_compras para ver os itens e seus IDs.');
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
      'Remove um item da lista de compras. Busca por ID numérico ou nome parcial. Destrutivo — remove permanentemente.',
      {
        item: z.string().describe('ID numérico ou nome do item a remover (busca parcial)'),
      },
      { destructiveHint: true },
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
          return toolError(`Nenhum item encontrado para "${item}".`, 'Use ver_lista_compras para ver os itens e seus IDs.');
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
      'Finaliza e arquiva a lista de compras ativa. Mostra resumo com total de itens, comprados e não comprados. Uma nova lista vazia será criada automaticamente na próxima adição de item.',
      {},
      {},
      async (_params, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [activeList] = await db
          .select()
          .from(shoppingLists)
          .where(and(eq(shoppingLists.userId, userId), eq(shoppingLists.status, 'active')))
          .limit(1);

        if (!activeList) {
          return toolError('Nenhuma lista ativa para finalizar.', 'Crie uma lista adicionando itens com adicionar_item_lista.');
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

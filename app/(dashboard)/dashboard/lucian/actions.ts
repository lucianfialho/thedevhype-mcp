'use server';

import { auth } from '@/app/lib/auth/server';
import { withRLS } from '@/app/lib/db';
import { eq, and, sql, desc, ilike } from 'drizzle-orm';
import {
  extractions,
  stores,
  products,
  priceEntries,
} from '@/app/lib/mcp/servers/nota-fiscal.schema';

async function requireUserId() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

// ─── Notas ───

export async function getNotas(loja?: string, limit = 20) {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const rows = await tx
      .select({
        id: extractions.id,
        data: extractions.data,
        createdAt: extractions.createdAt,
      })
      .from(extractions)
      .where(eq(extractions.userId, userId))
      .orderBy(desc(extractions.createdAt))
      .limit(limit);

    return rows
      .map((r) => {
        const d = r.data as Record<string, unknown> | null;
        const estabelecimento = d?.estabelecimento as Record<string, unknown> | undefined;
        const storeName = (estabelecimento?.nome as string) || 'Loja desconhecida';
        const cnpj = (estabelecimento?.cnpj as string) || '';
        const itens = Number(d?.quantidadeTotalItens) || (Array.isArray(d?.produtos) ? (d.produtos as unknown[]).length : 0);
        const valorAPagar = Number(d?.valorAPagar) || 0;

        return {
          id: r.id,
          storeName,
          cnpj,
          totalItens: itens,
          valorAPagar,
          createdAt: r.createdAt,
        };
      })
      .filter((n) => {
        if (!loja) return true;
        return n.storeName.toLowerCase().includes(loja.toLowerCase());
      });
  });
}

export async function getNotasSummary() {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const rows = await tx
      .select({ data: extractions.data })
      .from(extractions)
      .where(eq(extractions.userId, userId));

    const lojasSet = new Set<string>();
    let totalValor = 0;

    for (const r of rows) {
      const d = r.data as Record<string, unknown> | null;
      const estabelecimento = d?.estabelecimento as Record<string, unknown> | undefined;
      const cnpj = (estabelecimento?.cnpj as string) || '';
      if (cnpj) lojasSet.add(cnpj);
      totalValor += Number(d?.valorAPagar) || 0;
    }

    return {
      totalNotas: rows.length,
      totalValor,
      totalLojas: lojasSet.size,
    };
  });
}

// ─── Produtos ───

export async function getProdutos(categoria?: string, busca?: string, limit = 50) {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const conditions = [eq(products.userId, userId)];
    if (categoria) conditions.push(eq(products.categoria, categoria));
    if (busca) conditions.push(ilike(products.nome, `%${busca}%`));

    return tx
      .select({
        id: products.id,
        codigo: products.codigo,
        nome: products.nome,
        unidade: products.unidade,
        categoria: products.categoria,
        storeId: products.storeId,
        storeName: stores.nome,
      })
      .from(products)
      .innerJoin(stores, eq(products.storeId, stores.id))
      .where(and(...conditions))
      .orderBy(products.nome)
      .limit(limit);
  });
}

export async function getProdutosSummary() {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const [totals] = await tx
      .select({
        total: sql<number>`count(*)::int`,
        comCategoria: sql<number>`count(categoria)::int`,
        semCategoria: sql<number>`(count(*) - count(categoria))::int`,
      })
      .from(products)
      .where(eq(products.userId, userId));

    const categorias = await tx
      .select({ categoria: products.categoria })
      .from(products)
      .where(and(eq(products.userId, userId), sql`${products.categoria} IS NOT NULL`))
      .groupBy(products.categoria)
      .orderBy(products.categoria);

    return {
      total: totals.total,
      comCategoria: totals.comCategoria,
      semCategoria: totals.semCategoria,
      categorias: categorias.map((c) => c.categoria).filter(Boolean) as string[],
    };
  });
}

// ─── Precos ───

export async function getPrecos(produtoNome: string, periodDias = 90) {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const since = new Date();
    since.setDate(since.getDate() - periodDias);

    const rows = await tx
      .select({
        productId: products.id,
        produtoNome: products.nome,
        storeName: stores.nome,
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
          ilike(products.nome, `%${produtoNome}%`),
          sql`${priceEntries.dataCompra} >= ${since.toISOString().slice(0, 10)}`,
        ),
      )
      .orderBy(desc(priceEntries.dataCompra));

    const grouped: Record<
      string,
      {
        produtoNome: string;
        min: number;
        max: number;
        sum: number;
        count: number;
        entries: Array<{ storeName: string; valorUnitario: string; dataCompra: string }>;
      }
    > = {};

    for (const r of rows) {
      const key = r.produtoNome;
      const valor = Number(r.valorUnitario);
      if (!grouped[key]) {
        grouped[key] = { produtoNome: key, min: valor, max: valor, sum: 0, count: 0, entries: [] };
      }
      const g = grouped[key];
      g.min = Math.min(g.min, valor);
      g.max = Math.max(g.max, valor);
      g.sum += valor;
      g.count++;
      g.entries.push({
        storeName: r.storeName,
        valorUnitario: r.valorUnitario,
        dataCompra: r.dataCompra,
      });
    }

    return Object.values(grouped).map((g) => ({
      produtoNome: g.produtoNome,
      min: g.min,
      max: g.max,
      avg: g.count > 0 ? g.sum / g.count : 0,
      entries: g.entries,
    }));
  });
}

// ─── Gastos ───

export async function getGastosData(periodDias = 30, agruparPor: 'categoria' | 'loja' | 'mes' = 'categoria') {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const since = new Date();
    since.setDate(since.getDate() - periodDias);
    const sinceStr = since.toISOString().slice(0, 10);

    const dateFilter = and(
      eq(priceEntries.userId, userId),
      sql`${priceEntries.dataCompra} >= ${sinceStr}`,
    );

    let groupExpr: ReturnType<typeof sql>;
    let labelExpr: ReturnType<typeof sql<string>>;

    if (agruparPor === 'categoria') {
      groupExpr = sql`COALESCE(${products.categoria}, 'Sem categoria')`;
      labelExpr = sql<string>`COALESCE(${products.categoria}, 'Sem categoria')`;
    } else if (agruparPor === 'loja') {
      groupExpr = sql`${stores.nome}`;
      labelExpr = sql<string>`${stores.nome}`;
    } else {
      groupExpr = sql`to_char(${priceEntries.dataCompra}::date, 'YYYY-MM')`;
      labelExpr = sql<string>`to_char(${priceEntries.dataCompra}::date, 'YYYY-MM')`;
    }

    const rows = await tx
      .select({
        label: labelExpr,
        total: sql<number>`sum(${priceEntries.valorTotal}::numeric)::float`,
      })
      .from(priceEntries)
      .innerJoin(products, eq(priceEntries.productId, products.id))
      .innerJoin(stores, eq(priceEntries.storeId, stores.id))
      .where(dateFilter)
      .groupBy(groupExpr)
      .orderBy(sql`sum(${priceEntries.valorTotal}::numeric) DESC`);

    const [summaryRow] = await tx
      .select({
        totalGeral: sql<number>`COALESCE(sum(${priceEntries.valorTotal}::numeric), 0)::float`,
        comprasCount: sql<number>`count(DISTINCT ${priceEntries.extractionId})::int`,
      })
      .from(priceEntries)
      .where(dateFilter);

    const totalGeral = summaryRow.totalGeral;
    const comprasCount = summaryRow.comprasCount;

    return {
      gastos: rows.map((r) => ({
        label: r.label,
        total: r.total,
        percentual: totalGeral > 0 ? (r.total / totalGeral) * 100 : 0,
      })),
      summary: {
        totalGeral,
        comprasCount,
        mediaCompra: comprasCount > 0 ? totalGeral / comprasCount : 0,
      },
    };
  });
}

// ─── Deletar Nota ───

export async function deleteNota(notaId: number) {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const [nota] = await tx
      .select({ id: extractions.id })
      .from(extractions)
      .where(and(eq(extractions.id, notaId), eq(extractions.userId, userId)));

    if (!nota) return { error: 'Nota nao encontrada.' };

    await tx.delete(priceEntries).where(eq(priceEntries.extractionId, notaId));
    await tx.delete(extractions).where(eq(extractions.id, notaId));

    return { ok: true };
  });
}

// ─── Classificar Produto ───

export async function classificarProduto(produtoId: number, categoria: string) {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    await tx
      .update(products)
      .set({ categoria, updatedAt: new Date().toISOString() })
      .where(and(eq(products.id, produtoId), eq(products.userId, userId)));

    return { ok: true };
  });
}

'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { eq, and, sql, desc, ilike } from 'drizzle-orm';
import {
  extractions,
  stores,
  products,
  priceEntries,
  shoppingLists,
  shoppingListItems,
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

  const rows = await db
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
}

export async function getNotasSummary() {
  const userId = await requireUserId();

  const rows = await db
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
}

// ─── Produtos ───

export async function getProdutos(categoria?: string, busca?: string, limit = 50) {
  const userId = await requireUserId();

  const conditions = [eq(products.userId, userId)];
  if (categoria) conditions.push(eq(products.categoria, categoria));
  if (busca) conditions.push(ilike(products.nome, `%${busca}%`));

  return db
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
}

export async function getProdutosSummary() {
  const userId = await requireUserId();

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      comCategoria: sql<number>`count(categoria)::int`,
      semCategoria: sql<number>`(count(*) - count(categoria))::int`,
    })
    .from(products)
    .where(eq(products.userId, userId));

  const categorias = await db
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
}

// ─── Precos ───

export async function getPrecos(produtoNome: string, periodDias = 90) {
  const userId = await requireUserId();

  const since = new Date();
  since.setDate(since.getDate() - periodDias);

  const rows = await db
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
}

// ─── Gastos ───

export async function getGastosData(periodDias = 30, agruparPor: 'categoria' | 'loja' | 'mes' = 'categoria') {
  const userId = await requireUserId();

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

  const [rows, summaryRow] = await Promise.all([
    db
      .select({
        label: labelExpr,
        total: sql<number>`sum(${priceEntries.valorTotal}::numeric)::float`,
      })
      .from(priceEntries)
      .innerJoin(products, eq(priceEntries.productId, products.id))
      .innerJoin(stores, eq(priceEntries.storeId, stores.id))
      .where(dateFilter)
      .groupBy(groupExpr)
      .orderBy(sql`sum(${priceEntries.valorTotal}::numeric) DESC`),
    db
      .select({
        totalGeral: sql<number>`COALESCE(sum(${priceEntries.valorTotal}::numeric), 0)::float`,
        comprasCount: sql<number>`count(DISTINCT ${priceEntries.extractionId})::int`,
      })
      .from(priceEntries)
      .where(dateFilter)
      .then((r) => r[0]),
  ]);

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
}

// ─── Gastos Trend ───

export type Granularidade = 'diario' | 'semanal' | 'mensal';

export async function getGastosTrend(
  granularidade: Granularidade = 'mensal',
  dias = granularidade === 'diario' ? 30 : granularidade === 'semanal' ? 84 : 180,
) {
  const userId = await requireUserId();

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - dias);
  const sinceStr = sinceDate.toISOString().slice(0, 10);

  // SQL expressions per granularity
  let periodExpr: ReturnType<typeof sql<string>>;
  if (granularidade === 'diario') {
    periodExpr = sql<string>`to_char(${priceEntries.dataCompra}::date, 'YYYY-MM-DD')`;
  } else if (granularidade === 'semanal') {
    periodExpr = sql<string>`to_char(date_trunc('week', ${priceEntries.dataCompra}::date), 'YYYY-MM-DD')`;
  } else {
    periodExpr = sql<string>`to_char(${priceEntries.dataCompra}::date, 'YYYY-MM')`;
  }

  // Period totals
  const timeline = await db
    .select({
      period: periodExpr,
      total: sql<number>`COALESCE(sum(${priceEntries.valorTotal}::numeric), 0)::float`,
    })
    .from(priceEntries)
    .where(
      and(
        eq(priceEntries.userId, userId),
        sql`${priceEntries.dataCompra} >= ${sinceStr}`,
      ),
    )
    .groupBy(periodExpr)
    .orderBy(periodExpr);

  // Top 5 categories by total, then breakdown per period
  const topCategories = await db
    .select({
      categoria: sql<string>`COALESCE(${products.categoria}, 'Sem categoria')`,
      total: sql<number>`sum(${priceEntries.valorTotal}::numeric)::float`,
    })
    .from(priceEntries)
    .innerJoin(products, eq(priceEntries.productId, products.id))
    .where(
      and(
        eq(priceEntries.userId, userId),
        sql`${priceEntries.dataCompra} >= ${sinceStr}`,
      ),
    )
    .groupBy(sql`COALESCE(${products.categoria}, 'Sem categoria')`)
    .orderBy(sql`sum(${priceEntries.valorTotal}::numeric) DESC`)
    .limit(5);

  const top5Names = topCategories.map((c) => c.categoria);

  const byCategory = top5Names.length > 0
    ? await db
        .select({
          period: periodExpr,
          categoria: sql<string>`COALESCE(${products.categoria}, 'Sem categoria')`,
          total: sql<number>`sum(${priceEntries.valorTotal}::numeric)::float`,
        })
        .from(priceEntries)
        .innerJoin(products, eq(priceEntries.productId, products.id))
        .where(
          and(
            eq(priceEntries.userId, userId),
            sql`${priceEntries.dataCompra} >= ${sinceStr}`,
            sql`COALESCE(${products.categoria}, 'Sem categoria') IN (${sql.join(
              top5Names.map((n) => sql`${n}`),
              sql`, `,
            )})`,
          ),
        )
        .groupBy(periodExpr, sql`COALESCE(${products.categoria}, 'Sem categoria')`)
        .orderBy(periodExpr)
    : [];

  // Comparison: current period vs previous period
  const now = new Date();
  let currentPeriod: string;
  let previousPeriod: string;
  let compPeriodExpr: ReturnType<typeof sql<string>>;

  if (granularidade === 'diario') {
    currentPeriod = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    previousPeriod = yesterday.toISOString().slice(0, 10);
    compPeriodExpr = sql<string>`to_char(${priceEntries.dataCompra}::date, 'YYYY-MM-DD')`;
  } else if (granularidade === 'semanal') {
    compPeriodExpr = sql<string>`to_char(date_trunc('week', ${priceEntries.dataCompra}::date), 'YYYY-MM-DD')`;
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(monday.getDate() - ((dayOfWeek + 6) % 7));
    currentPeriod = monday.toISOString().slice(0, 10);
    const prevMonday = new Date(monday);
    prevMonday.setDate(prevMonday.getDate() - 7);
    previousPeriod = prevMonday.toISOString().slice(0, 10);
  } else {
    currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    previousPeriod = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    compPeriodExpr = sql<string>`to_char(${priceEntries.dataCompra}::date, 'YYYY-MM')`;
  }

  const comparisonRows = await db
    .select({
      period: compPeriodExpr,
      total: sql<number>`COALESCE(sum(${priceEntries.valorTotal}::numeric), 0)::float`,
      compras: sql<number>`count(DISTINCT ${priceEntries.extractionId})::int`,
    })
    .from(priceEntries)
    .where(
      and(
        eq(priceEntries.userId, userId),
        sql`${compPeriodExpr} IN (${currentPeriod}, ${previousPeriod})`,
      ),
    )
    .groupBy(compPeriodExpr);

  const currentData = comparisonRows.find((r) => r.period === currentPeriod) || {
    period: currentPeriod,
    total: 0,
    compras: 0,
  };
  const previousData = comparisonRows.find((r) => r.period === previousPeriod) || {
    period: previousPeriod,
    total: 0,
    compras: 0,
  };
  const change =
    previousData.total > 0
      ? ((currentData.total - previousData.total) / previousData.total) * 100
      : 0;

  return {
    granularidade,
    timeline,
    byCategory,
    categories: top5Names,
    comparison: {
      current: { period: currentData.period, total: currentData.total, compras: currentData.compras },
      previous: { period: previousData.period, total: previousData.total, compras: previousData.compras },
      change,
    },
  };
}

// ─── Deletar Nota ───

export async function deleteNota(notaId: number) {
  const userId = await requireUserId();

  const [nota] = await db
    .select({ id: extractions.id })
    .from(extractions)
    .where(and(eq(extractions.id, notaId), eq(extractions.userId, userId)));

  if (!nota) return { error: 'Nota nao encontrada.' };

  await db.delete(priceEntries).where(eq(priceEntries.extractionId, notaId));
  await db.delete(extractions).where(eq(extractions.id, notaId));

  return { ok: true };
}

// ─── Classificar Produto ───

export async function classificarProduto(produtoId: number, categoria: string) {
  const userId = await requireUserId();

  await db
    .update(products)
    .set({ categoria, updatedAt: new Date().toISOString() })
    .where(and(eq(products.id, produtoId), eq(products.userId, userId)));

  return { ok: true };
}

// ─── Lista de Compras ───

async function getOrCreateActiveListForUser(userId: string) {
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

export async function getActiveList() {
  const userId = await requireUserId();
  const list = await getOrCreateActiveListForUser(userId);

  const items = await db
    .select()
    .from(shoppingListItems)
    .where(eq(shoppingListItems.listId, list.id))
    .orderBy(shoppingListItems.checked, shoppingListItems.createdAt);

  return items.map((i) => ({
    id: i.id,
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
    estimatedPrice: i.estimatedPrice,
    cheapestStore: i.cheapestStore,
    checked: i.checked,
    notes: i.notes,
    createdAt: i.createdAt,
  }));
}

export async function getListSummary() {
  const userId = await requireUserId();
  const list = await getOrCreateActiveListForUser(userId);

  const items = await db
    .select({
      checked: shoppingListItems.checked,
      estimatedPrice: shoppingListItems.estimatedPrice,
      quantity: shoppingListItems.quantity,
    })
    .from(shoppingListItems)
    .where(eq(shoppingListItems.listId, list.id));

  const totalItems = items.length;
  const checkedItems = items.filter((i) => i.checked).length;
  const estimatedTotal = items
    .filter((i) => !i.checked && i.estimatedPrice && i.quantity)
    .reduce((sum, i) => sum + Number(i.estimatedPrice) * Number(i.quantity), 0);

  return { totalItems, checkedItems, estimatedTotal };
}

export async function toggleItemChecked(itemId: number, checked: boolean) {
  const userId = await requireUserId();

  await db
    .update(shoppingListItems)
    .set({ checked })
    .where(and(eq(shoppingListItems.id, itemId), eq(shoppingListItems.userId, userId)));

  return { ok: true };
}

export async function removeListItem(itemId: number) {
  const userId = await requireUserId();

  await db
    .delete(shoppingListItems)
    .where(and(eq(shoppingListItems.id, itemId), eq(shoppingListItems.userId, userId)));

  return { ok: true };
}

export async function finalizeList() {
  const userId = await requireUserId();

  const [activeList] = await db
    .select({ id: shoppingLists.id })
    .from(shoppingLists)
    .where(and(eq(shoppingLists.userId, userId), eq(shoppingLists.status, 'active')))
    .limit(1);

  if (!activeList) return { ok: false, error: 'Nenhuma lista ativa.' };

  await db
    .update(shoppingLists)
    .set({ status: 'completed', completedAt: new Date().toISOString() })
    .where(eq(shoppingLists.id, activeList.id));

  return { ok: true };
}

export async function addItemToList(name: string, qty?: number, unit?: string) {
  const userId = await requireUserId();
  const list = await getOrCreateActiveListForUser(userId);

  // Lookup price from history
  let estimatedPrice: string | null = null;
  let cheapestStore: string | null = null;
  let productId: number | null = null;

  const [matched] = await db
    .select({ id: products.id, unidade: products.unidade })
    .from(products)
    .where(and(eq(products.userId, userId), ilike(products.nome, `%${name}%`)))
    .limit(1);

  if (matched) {
    productId = matched.id;
    if (!unit && matched.unidade) unit = matched.unidade;

    const history = await db
      .select({
        valorUnitario: priceEntries.valorUnitario,
        storeName: stores.nome,
      })
      .from(priceEntries)
      .innerJoin(stores, eq(priceEntries.storeId, stores.id))
      .where(and(eq(priceEntries.userId, userId), eq(priceEntries.productId, matched.id)))
      .orderBy(desc(priceEntries.dataCompra))
      .limit(20);

    if (history.length > 0) {
      const prices = history.map((h) => Number(h.valorUnitario));
      estimatedPrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);

      let minPrice = Infinity;
      for (const entry of history) {
        const p = Number(entry.valorUnitario);
        if (p < minPrice) {
          minPrice = p;
          cheapestStore = entry.storeName;
        }
      }
    }
  }

  const [newItem] = await db
    .insert(shoppingListItems)
    .values({
      listId: list.id,
      userId,
      productId,
      name,
      quantity: qty?.toString() || null,
      unit: unit || null,
      estimatedPrice,
      cheapestStore,
    })
    .returning();

  return {
    id: newItem.id,
    name: newItem.name,
    quantity: newItem.quantity,
    unit: newItem.unit,
    estimatedPrice: newItem.estimatedPrice,
    cheapestStore: newItem.cheapestStore,
    checked: newItem.checked,
    notes: newItem.notes,
    createdAt: newItem.createdAt,
  };
}

// ─── Usage ───

import { getUserMcpUsage } from '../components/user-mcp-usage';

export async function getUserLucianUsage() {
  return getUserMcpUsage('lucian');
}

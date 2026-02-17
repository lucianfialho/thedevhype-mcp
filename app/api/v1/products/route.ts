import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { withApiAuth } from '@/app/lib/api/middleware';
import { parsePagination, paginationMeta } from '@/app/lib/api/pagination';
import { canonicalProducts, stores } from '@/app/lib/mcp/servers/nota-fiscal.schema';
import { eq, ilike, sql, and, type SQL } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (req, apiKey) => {
    const params = req.nextUrl.searchParams;
    const { page, perPage, offset } = parsePagination(params);

    const conditions: SQL[] = [];

    const q = params.get('q');
    if (q) conditions.push(ilike(canonicalProducts.nome, `%${q}%`));

    const category = params.get('category');
    if (category) conditions.push(eq(canonicalProducts.categoria, category));

    const storeId = params.get('store_id');
    if (storeId) conditions.push(eq(canonicalProducts.storeId, parseInt(storeId, 10)));

    const city = params.get('city');
    if (city) conditions.push(ilike(stores.cidade, `%${city}%`));

    const state = params.get('state') || apiKey.defaultState;
    if (state) conditions.push(eq(stores.estado, state.toUpperCase()));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ count }]] = await Promise.all([
      db
        .select({
          id: canonicalProducts.id,
          codigo: canonicalProducts.codigo,
          nome: canonicalProducts.nome,
          unidade: canonicalProducts.unidade,
          categoria: canonicalProducts.categoria,
          contributorCount: canonicalProducts.contributorCount,
          lastSeenAt: canonicalProducts.lastSeenAt,
          store: {
            id: stores.id,
            nome: stores.nome,
            cidade: stores.cidade,
            estado: stores.estado,
          },
        })
        .from(canonicalProducts)
        .innerJoin(stores, eq(canonicalProducts.storeId, stores.id))
        .where(where)
        .orderBy(canonicalProducts.nome)
        .limit(perPage)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(canonicalProducts)
        .innerJoin(stores, eq(canonicalProducts.storeId, stores.id))
        .where(where),
    ]);

    return NextResponse.json({
      data: items,
      meta: paginationMeta(page, perPage, count),
    });
  });
}

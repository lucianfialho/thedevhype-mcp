import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { withApiAuth } from '@/app/lib/api/middleware';
import { parsePagination, paginationMeta } from '@/app/lib/api/pagination';
import { stores, canonicalProducts } from '@/app/lib/mcp/servers/nota-fiscal.schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiAuth(request, async (req) => {
    const { id } = await params;
    const storeId = parseInt(id, 10);
    if (isNaN(storeId)) {
      return NextResponse.json({ error: 'Invalid store ID.' }, { status: 400 });
    }

    const [store] = await db
      .select()
      .from(stores)
      .where(eq(stores.id, storeId))
      .limit(1);

    if (!store) {
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const { page, perPage, offset } = parsePagination(searchParams);

    const [products, [{ count }]] = await Promise.all([
      db
        .select({
          id: canonicalProducts.id,
          codigo: canonicalProducts.codigo,
          nome: canonicalProducts.nome,
          unidade: canonicalProducts.unidade,
          categoria: canonicalProducts.categoria,
          contributorCount: canonicalProducts.contributorCount,
          lastSeenAt: canonicalProducts.lastSeenAt,
        })
        .from(canonicalProducts)
        .where(eq(canonicalProducts.storeId, storeId))
        .orderBy(canonicalProducts.nome)
        .limit(perPage)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(canonicalProducts)
        .where(eq(canonicalProducts.storeId, storeId)),
    ]);

    return NextResponse.json({
      data: {
        ...store,
        products: products,
      },
      meta: paginationMeta(page, perPage, count),
    });
  });
}

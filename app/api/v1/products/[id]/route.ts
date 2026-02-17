import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { withApiAuth } from '@/app/lib/api/middleware';
import { canonicalProducts, publicPriceEntries, stores } from '@/app/lib/mcp/servers/nota-fiscal.schema';
import { eq, sql, gte } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiAuth(request, async () => {
    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID.' }, { status: 400 });
    }

    const [product] = await db
      .select({
        id: canonicalProducts.id,
        codigo: canonicalProducts.codigo,
        nome: canonicalProducts.nome,
        unidade: canonicalProducts.unidade,
        categoria: canonicalProducts.categoria,
        contributorCount: canonicalProducts.contributorCount,
        lastSeenAt: canonicalProducts.lastSeenAt,
        createdAt: canonicalProducts.createdAt,
        store: {
          id: stores.id,
          nome: stores.nome,
          cnpj: stores.cnpj,
          cidade: stores.cidade,
          estado: stores.estado,
        },
      })
      .from(canonicalProducts)
      .innerJoin(stores, eq(canonicalProducts.storeId, stores.id))
      .where(eq(canonicalProducts.id, productId))
      .limit(1);

    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Price stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];

    const [stats] = await db
      .select({
        min: sql<string>`min(${publicPriceEntries.valorUnitario})`,
        max: sql<string>`max(${publicPriceEntries.valorUnitario})`,
        avg: sql<string>`round(avg(${publicPriceEntries.valorUnitario}), 4)`,
        count: sql<number>`count(*)::int`,
      })
      .from(publicPriceEntries)
      .where(
        sql`${publicPriceEntries.canonicalProductId} = ${productId} AND ${publicPriceEntries.dataCompra} >= ${dateStr}`,
      );

    return NextResponse.json({
      data: {
        ...product,
        price_stats_30d: {
          min: stats?.min ?? null,
          max: stats?.max ?? null,
          avg: stats?.avg ?? null,
          sample_count: stats?.count ?? 0,
        },
      },
    });
  });
}

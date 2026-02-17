import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { withApiAuth } from '@/app/lib/api/middleware';
import { parsePagination, paginationMeta } from '@/app/lib/api/pagination';
import { publicPriceEntries, stores } from '@/app/lib/mcp/servers/nota-fiscal.schema';
import { eq, sql, and, gte, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withApiAuth(request, async (req) => {
    const { id } = await params;
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      return NextResponse.json({ error: 'Invalid product ID.' }, { status: 400 });
    }

    const searchParams = req.nextUrl.searchParams;
    const { page, perPage, offset } = parsePagination(searchParams);
    const periodDays = Math.min(365, Math.max(1, parseInt(searchParams.get('period_days') || '30', 10)));

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const where = and(
      eq(publicPriceEntries.canonicalProductId, productId),
      gte(publicPriceEntries.dataCompra, cutoffStr),
    );

    const [items, [{ count }]] = await Promise.all([
      db
        .select({
          id: publicPriceEntries.id,
          valorUnitario: publicPriceEntries.valorUnitario,
          valorTotal: publicPriceEntries.valorTotal,
          quantidade: publicPriceEntries.quantidade,
          dataCompra: publicPriceEntries.dataCompra,
          store: {
            id: stores.id,
            nome: stores.nome,
            cidade: stores.cidade,
            estado: stores.estado,
          },
        })
        .from(publicPriceEntries)
        .innerJoin(stores, eq(publicPriceEntries.storeId, stores.id))
        .where(where)
        .orderBy(desc(publicPriceEntries.dataCompra))
        .limit(perPage)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(publicPriceEntries)
        .where(where),
    ]);

    return NextResponse.json({
      data: items,
      meta: paginationMeta(page, perPage, count),
    });
  });
}

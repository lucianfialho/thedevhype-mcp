import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { withApiAuth } from '@/app/lib/api/middleware';
import { canonicalProducts } from '@/app/lib/mcp/servers/nota-fiscal.schema';
import { sql, isNotNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const categories = await db
      .select({
        category: canonicalProducts.categoria,
        product_count: sql<number>`count(*)::int`,
      })
      .from(canonicalProducts)
      .where(isNotNull(canonicalProducts.categoria))
      .groupBy(canonicalProducts.categoria)
      .orderBy(sql`count(*) DESC`);

    return NextResponse.json({
      data: categories,
    });
  });
}

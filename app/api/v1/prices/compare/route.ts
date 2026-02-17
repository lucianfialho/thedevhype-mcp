import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { withApiAuth } from '@/app/lib/api/middleware';
import { canonicalProducts, publicPriceEntries, stores } from '@/app/lib/mcp/servers/nota-fiscal.schema';
import { eq, ilike, sql, and, gte, type SQL } from 'drizzle-orm';
import { searchGoogleShopping, normalizeProductName, type ShoppingProduct } from '@/app/lib/google-shopping';
import { getShoppingCache, setShoppingCache } from '@/app/lib/shopping-cache';

function buildLocation(city?: string | null, state?: string | null): string | undefined {
  // serper.dev location format: "City, State, Brazil"
  if (city && state) return `${city}, ${state}, Brazil`;
  if (state) return `${state}, Brazil`;
  if (city) return `${city}, Brazil`;
  return undefined;
}

async function fetchShoppingWithCache(
  productQuery: string,
  location?: string,
): Promise<{ products: ShoppingProduct[]; queryUsed: string; fromCache: boolean; location?: string }> {
  const normalized = normalizeProductName(productQuery);
  // Include location in cache key so "arroz 5kg @ SP" != "arroz 5kg @ RJ"
  const queryKey = location ? `${normalized}::${location.toLowerCase()}` : normalized;

  const cached = await getShoppingCache(queryKey);
  if (cached) {
    return { products: cached, queryUsed: normalized, fromCache: true, location };
  }

  const result = await searchGoogleShopping(normalized, { location });
  if (result.ok) {
    setShoppingCache(queryKey, result.products).catch(() => {});
    return { products: result.products, queryUsed: result.queryUsed, fromCache: false, location };
  }

  return { products: [], queryUsed: normalized, fromCache: false, location };
}

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (req) => {
    const params = req.nextUrl.searchParams;

    const productQuery = params.get('product');
    if (!productQuery) {
      return NextResponse.json(
        { error: 'The "product" query parameter is required.' },
        { status: 400 },
      );
    }

    const includeOnline = params.get('include_online') === 'true';
    const periodDays = Math.min(365, Math.max(1, parseInt(params.get('period_days') || '30', 10)));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - periodDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    const conditions: SQL[] = [
      ilike(canonicalProducts.nome, `%${productQuery}%`),
      gte(publicPriceEntries.dataCompra, cutoffStr),
    ];

    const city = params.get('city');
    if (city) conditions.push(ilike(stores.cidade, `%${city}%`));

    const state = params.get('state');
    if (state) conditions.push(eq(stores.estado, state.toUpperCase()));

    const dbQuery = db
      .select({
        product_id: canonicalProducts.id,
        product_name: canonicalProducts.nome,
        store_id: stores.id,
        store_name: stores.nome,
        store_city: stores.cidade,
        store_state: stores.estado,
        min_price: sql<string>`min(${publicPriceEntries.valorUnitario})`,
        max_price: sql<string>`max(${publicPriceEntries.valorUnitario})`,
        avg_price: sql<string>`round(avg(${publicPriceEntries.valorUnitario}), 4)`,
        latest_price: sql<string>`(array_agg(${publicPriceEntries.valorUnitario} ORDER BY ${publicPriceEntries.dataCompra} DESC))[1]`,
        sample_count: sql<number>`count(*)::int`,
      })
      .from(publicPriceEntries)
      .innerJoin(canonicalProducts, eq(publicPriceEntries.canonicalProductId, canonicalProducts.id))
      .innerJoin(stores, eq(publicPriceEntries.storeId, stores.id))
      .where(and(...conditions))
      .groupBy(
        canonicalProducts.id,
        canonicalProducts.nome,
        stores.id,
        stores.nome,
        stores.cidade,
        stores.estado,
      )
      .orderBy(sql`avg(${publicPriceEntries.valorUnitario})`);

    if (includeOnline) {
      const location = buildLocation(city, state);
      const [results, shopping] = await Promise.all([
        dbQuery,
        fetchShoppingWithCache(productQuery, location),
      ]);

      return NextResponse.json({
        data: results,
        online_prices: {
          source: 'google_shopping',
          query_used: shopping.queryUsed,
          from_cache: shopping.fromCache,
          location: shopping.location ?? null,
          products: shopping.products,
        },
        meta: {
          product_query: productQuery,
          period_days: periodDays,
          results_count: results.length,
        },
      });
    }

    const results = await dbQuery;

    return NextResponse.json({
      data: results,
      meta: {
        product_query: productQuery,
        period_days: periodDays,
        results_count: results.length,
      },
    });
  });
}

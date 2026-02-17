// Shopping cache layer with lazy expiry (6h TTL)
// Expired rows are overwritten on next hit via onConflictDoUpdate

import { db } from '@/app/lib/db';
import { shoppingCache } from '@/app/lib/mcp/servers/nota-fiscal.schema';
import { eq, gt, and } from 'drizzle-orm';
import type { ShoppingProduct } from '@/app/lib/google-shopping';

const CACHE_TTL_HOURS = 6;

export async function getShoppingCache(queryKey: string): Promise<ShoppingProduct[] | null> {
  const [row] = await db
    .select({ results: shoppingCache.results })
    .from(shoppingCache)
    .where(
      and(
        eq(shoppingCache.queryKey, queryKey),
        gt(shoppingCache.expiresAt, new Date().toISOString()),
      ),
    )
    .limit(1);

  return row ? (row.results as ShoppingProduct[]) : null;
}

export async function setShoppingCache(queryKey: string, results: ShoppingProduct[]): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000);

  await db
    .insert(shoppingCache)
    .values({
      queryKey,
      results: JSON.parse(JSON.stringify(results)),
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    })
    .onConflictDoUpdate({
      target: shoppingCache.queryKey,
      set: {
        results: JSON.parse(JSON.stringify(results)),
        cachedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });
}

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql as dsql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

const neonSql = neon(process.env.DATABASE_URL!);
export const db = drizzle(neonSql);

/**
 * Execute a callback within a transaction that sets RLS context.
 * All queries inside `fn` will be scoped to the given userId.
 */
export async function withRLS<T>(
  userId: string,
  fn: (tx: NeonHttpDatabase) => Promise<T>,
  options?: { isAdmin?: boolean },
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(dsql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    if (options?.isAdmin) {
      await tx.execute(dsql`SELECT set_config('app.is_admin', 'true', true)`);
    }
    return fn(tx as unknown as NeonHttpDatabase);
  });
}

/**
 * Execute a callback with admin RLS bypass.
 */
export async function withAdminRLS<T>(
  userId: string,
  fn: (tx: NeonHttpDatabase) => Promise<T>,
): Promise<T> {
  return withRLS(userId, fn, { isAdmin: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { withApiAuth } from '@/app/lib/api/middleware';
import { parsePagination, paginationMeta } from '@/app/lib/api/pagination';
import { stores } from '@/app/lib/mcp/servers/nota-fiscal.schema';
import { eq, ilike, sql, and, type SQL } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (req, apiKey) => {
    const params = req.nextUrl.searchParams;
    const { page, perPage, offset } = parsePagination(params);

    const conditions: SQL[] = [];

    const q = params.get('q');
    if (q) conditions.push(ilike(stores.nome, `%${q}%`));

    const city = params.get('city');
    if (city) conditions.push(ilike(stores.cidade, `%${city}%`));

    const state = params.get('state') || apiKey.defaultState;
    if (state) conditions.push(eq(stores.estado, state.toUpperCase()));

    const cnpj = params.get('cnpj');
    if (cnpj) conditions.push(eq(stores.cnpj, cnpj.replace(/\D/g, '')));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, [{ count }]] = await Promise.all([
      db
        .select({
          id: stores.id,
          cnpj: stores.cnpj,
          nome: stores.nome,
          endereco: stores.endereco,
          cidade: stores.cidade,
          estado: stores.estado,
          createdAt: stores.createdAt,
        })
        .from(stores)
        .where(where)
        .orderBy(stores.nome)
        .limit(perPage)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(stores)
        .where(where),
    ]);

    return NextResponse.json({
      data: items,
      meta: paginationMeta(page, perPage, count),
    });
  });
}

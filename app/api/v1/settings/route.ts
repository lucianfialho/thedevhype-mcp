import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { withApiAuth } from '@/app/lib/api/middleware';
import { apiKeys } from '@/app/lib/db/public.schema';
import { eq } from 'drizzle-orm';

const VALID_UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

export async function PATCH(request: NextRequest) {
  return withApiAuth(request, async (req, apiKey) => {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    if (!('default_state' in body)) {
      return NextResponse.json(
        { error: 'Missing "default_state" field. Pass a UF string (e.g. "SP") or null to clear.' },
        { status: 400 },
      );
    }

    const { default_state } = body;

    if (default_state !== null) {
      if (typeof default_state !== 'string') {
        return NextResponse.json({ error: '"default_state" must be a string or null.' }, { status: 400 });
      }
      const uf = default_state.toUpperCase();
      if (!VALID_UFS.has(uf)) {
        return NextResponse.json(
          { error: `Invalid UF "${default_state}". Valid values: ${[...VALID_UFS].sort().join(', ')}` },
          { status: 400 },
        );
      }

      await db.update(apiKeys).set({ defaultState: uf }).where(eq(apiKeys.id, apiKey.id));

      return NextResponse.json({ default_state: uf });
    }

    // null — clear the default
    await db.update(apiKeys).set({ defaultState: null }).where(eq(apiKeys.id, apiKey.id));

    return NextResponse.json({ default_state: null });
  });
}

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (_req, apiKey) => {
    return NextResponse.json({
      default_state: apiKey.defaultState ?? null,
    });
  });
}

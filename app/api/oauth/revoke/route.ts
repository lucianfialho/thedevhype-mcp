import { revokeToken } from '@/app/lib/mcp/oauth-provider';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/oauth/revoke — Token Revocation (RFC 7009)
 * Returns 200 regardless of whether the token was found (per spec).
 */
export async function POST(request: Request) {
  try {
    const body = await request.formData().catch(() => null);
    const token = body?.get('token') as string | null;

    if (token) {
      await revokeToken(token);
    }

    return new Response(null, { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error('[oauth/revoke] error:', err);
    return new Response(null, { status: 200, headers: corsHeaders });
  }
}

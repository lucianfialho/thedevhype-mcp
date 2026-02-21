import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/server';
import { createAuthorizationCode } from '@/app/lib/mcp/oauth-provider';
import { McpOAuthClientsStore } from '@/app/lib/mcp/oauth-clients-store';

const clientsStore = new McpOAuthClientsStore();

/**
 * GET /api/oauth/authorize — redirects to consent page (or directly issues code if user is logged in)
 * POST /api/oauth/authorize — handles consent form submission, issues authorization code
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    // Forward all OAuth params to the consent page
    const consentUrl = new URL('/oauth/authorize', url.origin);
    for (const [key, value] of url.searchParams.entries()) {
      consentUrl.searchParams.set(key, value);
    }

    return NextResponse.redirect(consentUrl.toString());
  } catch (err) {
    console.error('[oauth/authorize GET] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { data: session } = await auth.getSession().catch(() => ({ data: null }));
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const clientId = formData.get('client_id') as string;
    const redirectUri = formData.get('redirect_uri') as string;
    const state = formData.get('state') as string | null;
    const codeChallenge = formData.get('code_challenge') as string;
    const scope = formData.get('scope') as string | null;
    const resource = formData.get('resource') as string | null;
    const action = formData.get('action') as string;

    if (!clientId || !redirectUri || !codeChallenge) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'Missing required parameters' }, { status: 400 });
    }

    // Validate client
    const client = await clientsStore.getClient(clientId);
    if (!client) {
      return NextResponse.json({ error: 'invalid_client' }, { status: 400 });
    }

    // Validate redirect_uri
    if (!client.redirect_uris.includes(redirectUri)) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'Invalid redirect_uri' }, { status: 400 });
    }

    // User denied
    if (action === 'deny') {
      const denyUrl = new URL(redirectUri);
      denyUrl.searchParams.set('error', 'access_denied');
      if (state) denyUrl.searchParams.set('state', state);
      return NextResponse.redirect(denyUrl.toString(), 302);
    }

    // Generate authorization code
    const code = await createAuthorizationCode({
      clientId,
      userId,
      codeChallenge,
      redirectUri,
      scopes: scope ?? undefined,
      resource: resource ?? undefined,
    });

    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', code);
    if (state) callbackUrl.searchParams.set('state', state);

    return NextResponse.redirect(callbackUrl.toString(), 302);
  } catch (err) {
    console.error('[oauth/authorize POST] error:', err);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/server';

/**
 * GET /api/auth/linkedin
 * Initiates LinkedIn OAuth 2.0 flow.
 * Generates state, saves in httpOnly cookie, redirects to LinkedIn authorization.
 */
export async function GET() {
  try {
    const { data: session } = await auth.getSession().catch(() => ({ data: null }));
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'LinkedIn not configured' }, { status: 500 });
    }

    const state = crypto.randomUUID();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thedevhype.com';
    const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile w_member_social',
      state,
    });

    const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOpts = `HttpOnly; Path=/; Max-Age=600; SameSite=Lax${isProduction ? '; Secure' : ''}`;

    return new Response(null, {
      status: 302,
      headers: {
        Location: linkedinUrl,
        'Set-Cookie': `linkedin_oauth_state=${state}; ${cookieOpts}`,
      },
    });
  } catch (err) {
    console.error('[LinkedIn OAuth] Error initiating flow:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

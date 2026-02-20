import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/app/lib/auth/server';

/**
 * GET /api/auth/linkedin
 * Initiates LinkedIn OAuth 2.0 flow.
 * Generates state, saves in httpOnly cookie, redirects to LinkedIn authorization.
 */
export async function GET() {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'LinkedIn not configured' }, { status: 500 });
  }

  const state = crypto.randomUUID();

  const cookieStore = await cookies();
  cookieStore.set('linkedin_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thedevhype.com';
  const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'openid profile w_member_social',
    state,
  });

  return NextResponse.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`,
  );
}

import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/server';

/**
 * GET /api/auth/twitter
 * Initiates Twitter OAuth 2.0 PKCE flow.
 * Generates state + code_verifier, saves in httpOnly cookies, redirects to Twitter.
 */
export async function GET() {
  const { data: session } = await auth.getSession().catch(() => ({ data: null }));
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Twitter not configured' }, { status: 500 });
  }

  // Generate PKCE code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = crypto.randomUUID();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thedevhype.com';
  const redirectUri = `${baseUrl}/api/auth/twitter/callback`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const twitterUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;
  const response = NextResponse.redirect(twitterUrl);

  // Set cookies on the response directly (cookies() API doesn't work with redirects)
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 600,
    path: '/',
  };
  response.cookies.set('twitter_oauth_state', state, cookieOpts);
  response.cookies.set('twitter_code_verifier', codeVerifier, cookieOpts);

  return response;
}

// ─── PKCE helpers ───

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
}

function base64URLEncode(buffer: Uint8Array): string {
  let str = '';
  for (const byte of buffer) {
    str += String.fromCharCode(byte);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

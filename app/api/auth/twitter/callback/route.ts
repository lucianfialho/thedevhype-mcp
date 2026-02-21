import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { socialAccounts } from '@/app/lib/mcp/servers/rayssa.schema';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

/**
 * GET /api/auth/twitter/callback
 * Handles Twitter OAuth 2.0 callback: exchanges code for tokens, saves account.
 */
export async function GET(request: Request) {
  const { data: session } = await auth.getSession().catch(() => ({ data: null }));
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/dashboard/rayssa?error=not_authenticated', request.url));
  }
  const userId = session.user.id;

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/rayssa?tab=accounts&error=${encodeURIComponent(error)}`, request.url),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard/rayssa?tab=accounts&error=missing_params', request.url),
    );
  }

  // Verify state
  const cookieStore = await cookies();
  const savedState = cookieStore.get('twitter_oauth_state')?.value;
  const codeVerifier = cookieStore.get('twitter_code_verifier')?.value;

  // Clean up cookies
  cookieStore.delete('twitter_oauth_state');
  cookieStore.delete('twitter_code_verifier');

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL('/dashboard/rayssa?tab=accounts&error=invalid_state', request.url),
    );
  }
  if (!codeVerifier) {
    return NextResponse.redirect(
      new URL('/dashboard/rayssa?tab=accounts&error=missing_verifier', request.url),
    );
  }

  const clientId = process.env.TWITTER_CLIENT_ID!;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thedevhype.com';
  const redirectUri = `${baseUrl}/api/auth/twitter/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error('[Twitter OAuth] Token exchange failed:', errBody);
    return NextResponse.redirect(
      new URL('/dashboard/rayssa?tab=accounts&error=token_exchange_failed', request.url),
    );
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokenData;

  // Fetch user info
  const userRes = await fetch('https://api.twitter.com/2/users/me', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    console.error('[Twitter OAuth] User fetch failed:', await userRes.text());
    return NextResponse.redirect(
      new URL('/dashboard/rayssa?tab=accounts&error=user_fetch_failed', request.url),
    );
  }

  const userData = await userRes.json();
  const { id: platformUserId, username, name: displayName } = userData.data;

  // Upsert social account
  await db
    .insert(socialAccounts)
    .values({
      userId,
      platform: 'twitter',
      platformUserId,
      username,
      displayName,
      accessToken: access_token,
      refreshToken: refresh_token || null,
      tokenExpiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
    })
    .onConflictDoUpdate({
      target: [socialAccounts.userId, socialAccounts.platform],
      set: {
        platformUserId,
        username,
        displayName,
        accessToken: access_token,
        refreshToken: refresh_token || sql`${socialAccounts.refreshToken}`,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
      },
    });

  return NextResponse.redirect(new URL('/dashboard/rayssa?tab=accounts', request.url));
}

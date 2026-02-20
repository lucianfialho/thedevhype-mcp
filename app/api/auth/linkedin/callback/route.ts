import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { socialAccounts } from '@/app/lib/mcp/servers/rayssa.schema';
import { sql } from 'drizzle-orm';

/**
 * GET /api/auth/linkedin/callback
 * Handles LinkedIn OAuth 2.0 callback: exchanges code for tokens, saves account.
 */
export async function GET(request: Request) {
  const { data: session } = await auth.getSession();
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
  const savedState = cookieStore.get('linkedin_oauth_state')?.value;
  cookieStore.delete('linkedin_oauth_state');

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL('/dashboard/rayssa?tab=accounts&error=invalid_state', request.url),
    );
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID!;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET!;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.thedevhype.com';
  const redirectUri = `${baseUrl}/api/auth/linkedin/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error('[LinkedIn OAuth] Token exchange failed:', errBody);
    return NextResponse.redirect(
      new URL('/dashboard/rayssa?tab=accounts&error=token_exchange_failed', request.url),
    );
  }

  const tokenData = await tokenRes.json();
  const { access_token, refresh_token, expires_in, refresh_token_expires_in } = tokenData;

  // Fetch user info via OpenID Connect userinfo endpoint
  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userRes.ok) {
    console.error('[LinkedIn OAuth] User fetch failed:', await userRes.text());
    return NextResponse.redirect(
      new URL('/dashboard/rayssa?tab=accounts&error=user_fetch_failed', request.url),
    );
  }

  const userData = await userRes.json();
  // OpenID userinfo returns: sub, name, given_name, family_name, picture, email
  const platformUserId = userData.sub;
  const displayName = userData.name || `${userData.given_name || ''} ${userData.family_name || ''}`.trim();

  // Upsert social account
  await db
    .insert(socialAccounts)
    .values({
      userId,
      platform: 'linkedin',
      platformUserId,
      username: displayName, // LinkedIn doesn't have public usernames like Twitter
      displayName,
      accessToken: access_token,
      refreshToken: refresh_token || null,
      tokenExpiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
    })
    .onConflictDoUpdate({
      target: [socialAccounts.userId, socialAccounts.platform],
      set: {
        platformUserId,
        username: displayName,
        displayName,
        accessToken: access_token,
        refreshToken: refresh_token || sql`${socialAccounts.refreshToken}`,
        tokenExpiresAt: new Date(Date.now() + expires_in * 1000).toISOString(),
      },
    });

  return NextResponse.redirect(new URL('/dashboard/rayssa?tab=accounts', request.url));
}

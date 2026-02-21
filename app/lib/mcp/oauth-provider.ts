import crypto from 'node:crypto';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { db } from '../db';
import { mcpOAuthCodes, mcpOAuthTokens } from '../db/public.schema';
import { eq, and, isNull } from 'drizzle-orm';

const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export interface CreateCodeParams {
  clientId: string;
  userId: string;
  codeChallenge: string;
  redirectUri: string;
  scopes?: string;
  resource?: string;
}

export async function createAuthorizationCode(params: CreateCodeParams): Promise<string> {
  const code = generateToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

  await db.insert(mcpOAuthCodes).values({
    clientId: params.clientId,
    userId: params.userId,
    code,
    codeChallenge: params.codeChallenge,
    redirectUri: params.redirectUri,
    scopes: params.scopes ?? null,
    resource: params.resource ?? null,
    expiresAt,
  });

  return code;
}

export async function getChallengeForCode(code: string): Promise<string | null> {
  const rows = await db
    .select({ codeChallenge: mcpOAuthCodes.codeChallenge })
    .from(mcpOAuthCodes)
    .where(eq(mcpOAuthCodes.code, code))
    .limit(1);

  return rows.length > 0 ? rows[0].codeChallenge : null;
}

export interface TokenResult {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export async function exchangeAuthorizationCode(
  clientId: string,
  code: string,
  codeVerifier: string,
  redirectUri: string,
  resource?: string,
): Promise<TokenResult | null> {
  // Find and validate the authorization code
  const rows = await db
    .select()
    .from(mcpOAuthCodes)
    .where(
      and(
        eq(mcpOAuthCodes.code, code),
        eq(mcpOAuthCodes.clientId, clientId),
        eq(mcpOAuthCodes.used, false),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;

  const codeRow = rows[0];

  // Check expiry
  if (new Date(codeRow.expiresAt) < new Date()) return null;

  // Check redirect_uri matches
  if (codeRow.redirectUri !== redirectUri) return null;

  // Verify PKCE S256 challenge
  const expectedChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  if (expectedChallenge !== codeRow.codeChallenge) return null;

  // Mark code as used
  await db
    .update(mcpOAuthCodes)
    .set({ used: true })
    .where(eq(mcpOAuthCodes.id, codeRow.id));

  // Generate tokens
  const accessToken = generateToken();
  const refreshToken = generateToken();
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString();

  await db.insert(mcpOAuthTokens).values({
    clientId,
    userId: codeRow.userId,
    accessToken,
    refreshToken,
    scopes: codeRow.scopes,
    resource: resource ?? codeRow.resource,
    expiresAt,
  });

  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    refresh_token: refreshToken,
    scope: codeRow.scopes ?? undefined,
  };
}

export async function exchangeRefreshToken(
  clientId: string,
  refreshToken: string,
  scopes?: string,
  resource?: string,
): Promise<TokenResult | null> {
  // Find the existing token row by refresh token
  const rows = await db
    .select()
    .from(mcpOAuthTokens)
    .where(
      and(
        eq(mcpOAuthTokens.refreshToken, refreshToken),
        eq(mcpOAuthTokens.clientId, clientId),
        isNull(mcpOAuthTokens.revokedAt),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;

  const oldToken = rows[0];

  // Revoke old token
  await db
    .update(mcpOAuthTokens)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(mcpOAuthTokens.id, oldToken.id));

  // Issue new token pair
  const newAccessToken = generateToken();
  const newRefreshToken = generateToken();
  const expiresAt = new Date(Date.now() + ACCESS_TOKEN_TTL_MS).toISOString();
  const finalScopes = scopes ?? oldToken.scopes;

  await db.insert(mcpOAuthTokens).values({
    clientId,
    userId: oldToken.userId,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    scopes: finalScopes,
    resource: resource ?? oldToken.resource,
    expiresAt,
  });

  return {
    access_token: newAccessToken,
    token_type: 'bearer',
    expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
    refresh_token: newRefreshToken,
    scope: finalScopes ?? undefined,
  };
}

export async function verifyAccessToken(token: string): Promise<AuthInfo | null> {
  const rows = await db
    .select()
    .from(mcpOAuthTokens)
    .where(
      and(
        eq(mcpOAuthTokens.accessToken, token),
        isNull(mcpOAuthTokens.revokedAt),
      ),
    )
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];

  // Check expiry
  if (new Date(row.expiresAt) < new Date()) return null;

  return {
    token,
    clientId: row.clientId,
    scopes: row.scopes?.split(' ') ?? [],
    expiresAt: Math.floor(new Date(row.expiresAt).getTime() / 1000),
    extra: { userId: row.userId },
  };
}

export async function revokeToken(token: string): Promise<void> {
  const now = new Date().toISOString();

  // Try revoking as access token
  const accessResult = await db
    .update(mcpOAuthTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(mcpOAuthTokens.accessToken, token),
        isNull(mcpOAuthTokens.revokedAt),
      ),
    );

  // If not found as access token, try as refresh token
  if (!accessResult.rowCount || accessResult.rowCount === 0) {
    await db
      .update(mcpOAuthTokens)
      .set({ revokedAt: now })
      .where(
        and(
          eq(mcpOAuthTokens.refreshToken, token),
          isNull(mcpOAuthTokens.revokedAt),
        ),
      );
  }
}

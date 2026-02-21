import { NextResponse } from 'next/server';
import { exchangeAuthorizationCode, exchangeRefreshToken } from '@/app/lib/mcp/oauth-provider';
import { McpOAuthClientsStore } from '@/app/lib/mcp/oauth-clients-store';

const clientsStore = new McpOAuthClientsStore();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  const body = await request.formData().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Expected form-encoded body' },
      { status: 400, headers: corsHeaders },
    );
  }

  const grantType = body.get('grant_type') as string;
  const clientId = body.get('client_id') as string;

  if (!clientId) {
    return NextResponse.json(
      { error: 'invalid_request', error_description: 'Missing client_id' },
      { status: 400, headers: corsHeaders },
    );
  }

  // Validate client
  const client = await clientsStore.getClient(clientId);
  if (!client) {
    return NextResponse.json(
      { error: 'invalid_client' },
      { status: 401, headers: corsHeaders },
    );
  }

  // Validate client secret for confidential clients
  if (client.token_endpoint_auth_method === 'client_secret_post') {
    const clientSecret = body.get('client_secret') as string;
    if (clientSecret !== client.client_secret) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: 'Invalid client_secret' },
        { status: 401, headers: corsHeaders },
      );
    }
  }

  if (grantType === 'authorization_code') {
    const code = body.get('code') as string;
    const codeVerifier = body.get('code_verifier') as string;
    const redirectUri = body.get('redirect_uri') as string;
    const resource = body.get('resource') as string | null;

    if (!code || !codeVerifier || !redirectUri) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing code, code_verifier, or redirect_uri' },
        { status: 400, headers: corsHeaders },
      );
    }

    const tokens = await exchangeAuthorizationCode(
      clientId,
      code,
      codeVerifier,
      redirectUri,
      resource ?? undefined,
    );

    if (!tokens) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid or expired authorization code' },
        { status: 400, headers: corsHeaders },
      );
    }

    return NextResponse.json(tokens, { headers: corsHeaders });
  }

  if (grantType === 'refresh_token') {
    const refreshToken = body.get('refresh_token') as string;
    const scope = body.get('scope') as string | null;
    const resource = body.get('resource') as string | null;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'Missing refresh_token' },
        { status: 400, headers: corsHeaders },
      );
    }

    const tokens = await exchangeRefreshToken(
      clientId,
      refreshToken,
      scope ?? undefined,
      resource ?? undefined,
    );

    if (!tokens) {
      return NextResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid refresh token' },
        { status: 400, headers: corsHeaders },
      );
    }

    return NextResponse.json(tokens, { headers: corsHeaders });
  }

  return NextResponse.json(
    { error: 'unsupported_grant_type' },
    { status: 400, headers: corsHeaders },
  );
}

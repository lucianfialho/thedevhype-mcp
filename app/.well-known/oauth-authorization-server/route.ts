import { NextResponse } from 'next/server';

const ISSUER = 'https://www.thedevhype.com';

const metadata = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/api/oauth/authorize`,
  token_endpoint: `${ISSUER}/api/oauth/token`,
  registration_endpoint: `${ISSUER}/api/oauth/register`,
  revocation_endpoint: `${ISSUER}/api/oauth/revoke`,
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
  token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
  scopes_supported: ['mcp:tools'],
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function GET() {
  try {
    return NextResponse.json(metadata, { headers: corsHeaders });
  } catch {
    return NextResponse.json(metadata, { headers: corsHeaders });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

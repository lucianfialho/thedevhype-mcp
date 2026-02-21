import { NextResponse } from 'next/server';

const ISSUER = 'https://www.thedevhype.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const resourcePath = '/' + path.join('/');

  const metadata = {
    resource: `${ISSUER}${resourcePath}`,
    authorization_servers: [ISSUER],
    scopes_supported: ['mcp:tools'],
    bearer_methods_supported: ['header'],
  };

  return NextResponse.json(metadata, { headers: corsHeaders });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

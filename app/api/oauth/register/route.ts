import { NextResponse } from 'next/server';
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

/**
 * POST /api/oauth/register — Dynamic Client Registration (RFC 7591)
 */
export async function POST(request: Request) {
  let metadata: Record<string, unknown>;
  try {
    metadata = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_client_metadata', error_description: 'Invalid JSON body' },
      { status: 400, headers: corsHeaders },
    );
  }

  // redirect_uris is required
  if (!metadata.redirect_uris || !Array.isArray(metadata.redirect_uris) || metadata.redirect_uris.length === 0) {
    return NextResponse.json(
      { error: 'invalid_client_metadata', error_description: 'redirect_uris is required' },
      { status: 400, headers: corsHeaders },
    );
  }

  try {
    const client = await clientsStore.registerClient(metadata as Parameters<typeof clientsStore.registerClient>[0]);
    return NextResponse.json(client, { status: 201, headers: corsHeaders });
  } catch (err) {
    console.error('[OAuth register] Failed to register client:', err);
    return NextResponse.json(
      { error: 'server_error', error_description: 'Failed to register client' },
      { status: 500, headers: corsHeaders },
    );
  }
}

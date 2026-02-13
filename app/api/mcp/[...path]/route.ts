import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { userMcpAccess } from '../../../lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { registry } from '../../../lib/mcp/servers';

async function handleRequest(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const serverName = path[0];

  const handler = registry.getHandler(serverName);
  if (!handler) {
    return NextResponse.json(
      { error: `MCP server "${serverName}" not found` },
      { status: 404 },
    );
  }

  // Validate API key from Authorization header
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 },
    );
  }

  const rows = await db
    .select({ id: userMcpAccess.id, userId: userMcpAccess.userId })
    .from(userMcpAccess)
    .where(
      and(
        eq(userMcpAccess.apiKey, apiKey),
        eq(userMcpAccess.mcpName, serverName),
        eq(userMcpAccess.enabled, true),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'Invalid or missing API key' },
      { status: 401 },
    );
  }

  // Inject auth info so tool callbacks can access userId via extra.authInfo
  (request as any).auth = { token: apiKey, clientId: '', scopes: [], extra: { userId: rows[0].userId } };

  return handler(request);
}

export { handleRequest as GET, handleRequest as POST, handleRequest as DELETE };

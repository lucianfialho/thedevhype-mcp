import { NextResponse } from 'next/server';
import { withMcpAuth } from 'mcp-handler';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { db } from '../../../lib/db';
import { userMcpAccess } from '../../../lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { registry } from '../../../lib/mcp/servers';

function createVerifyToken(serverName: string) {
  return async (_req: Request, bearerToken?: string): Promise<AuthInfo | undefined> => {
    if (!bearerToken) return undefined;

    const rows = await db
      .select({ userId: userMcpAccess.userId })
      .from(userMcpAccess)
      .where(
        and(
          eq(userMcpAccess.apiKey, bearerToken),
          eq(userMcpAccess.mcpName, serverName),
          eq(userMcpAccess.enabled, true),
        ),
      )
      .limit(1);

    if (rows.length === 0) return undefined;

    return { token: bearerToken, clientId: '', scopes: [], extra: { userId: rows[0].userId } };
  };
}

async function handleRequest(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const serverName = path[0];

  const baseHandler = registry.getHandler(serverName);
  if (!baseHandler) {
    return NextResponse.json(
      { error: `MCP server "${serverName}" not found` },
      { status: 404 },
    );
  }

  const handler = withMcpAuth(baseHandler, createVerifyToken(serverName), { required: true });
  return handler(request);
}

export { handleRequest as GET, handleRequest as POST, handleRequest as DELETE };

import { NextResponse } from 'next/server';
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

  return handler(request);
}

export { handleRequest as GET, handleRequest as POST, handleRequest as DELETE };

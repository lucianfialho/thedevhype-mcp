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

/* ─── GET /api/mcp/{name} → Markdown docs (public, no auth) ─── */

function buildDocs(serverName: string): Response | null {
  const server = registry.getServer(serverName);
  if (!server) return null;

  const endpoint = `https://www.thedevhype.com/api/mcp/${server.name}`;

  const lines: string[] = [
    `# ${server.name.charAt(0).toUpperCase() + server.name.slice(1)}`,
    '',
    `> ${server.description}`,
    '',
    `**Category:** ${server.category}`,
    `**Endpoint:** \`${endpoint}\``,
    '',
    '---',
    '',
    `## Tools (${server.tools.length})`,
    '',
  ];

  for (const tool of server.tools) {
    lines.push(`### \`${tool.name}\``);
    lines.push('');
    lines.push(tool.description);
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Quick Start');
  lines.push('');
  lines.push('Add to your MCP client config (Claude, Cursor, etc):');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify({
    mcpServers: {
      [server.name]: {
        url: endpoint,
        headers: { Authorization: 'Bearer <your-api-key>' },
      },
    },
  }, null, 2));
  lines.push('```');
  lines.push('');
  lines.push(`Get your API key at [thedevhype.com/onboarding](https://www.thedevhype.com/onboarding)`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## cURL Examples');
  lines.push('');
  lines.push('### List available tools');
  lines.push('');
  lines.push('```bash');
  lines.push(`curl -X POST ${endpoint} \\`);
  lines.push('  -H "Authorization: Bearer <your-api-key>" \\');
  lines.push('  -H "Content-Type: application/json" \\');
  lines.push('  -H "Accept: application/json, text/event-stream" \\');
  lines.push('  -d \'{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\'');
  lines.push('```');
  lines.push('');
  lines.push('### Call a tool');
  lines.push('');
  if (server.tools.length > 0) {
    const example = server.tools[0];
    lines.push('```bash');
    lines.push(`curl -X POST ${endpoint} \\`);
    lines.push('  -H "Authorization: Bearer <your-api-key>" \\');
    lines.push('  -H "Content-Type: application/json" \\');
    lines.push('  -H "Accept: application/json, text/event-stream" \\');
    lines.push(`  -d '${JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: example.name, arguments: {} } })}'`);
    lines.push('```');
    lines.push('');
  }
  lines.push('> Replace `<your-api-key>` with your Bearer token from the dashboard Config tab.');
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}

/* ─── MCP protocol handler (auth required) ─── */

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

async function handleGet(request: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;

  // GET /api/mcp/{name} → return Markdown docs
  if (path.length === 1) {
    const docs = buildDocs(path[0]);
    if (docs) return docs;
    return NextResponse.json({ error: `MCP server "${path[0]}" not found` }, { status: 404 });
  }

  // GET /api/mcp/{name}/sse → SSE transport
  return handleRequest(request, ctx);
}

export { handleGet as GET, handleRequest as POST, handleRequest as DELETE };
